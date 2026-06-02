import { NextResponse } from 'next/server';
import { exec } from 'child_process';
import fs from 'fs';
import path from 'path';

function parseSentences(text) {
  if (!text) return [];
  return text
    .split('\n')
    .map(line => line.trim())
    .filter(Boolean)
    .map(line => {
      // Clean prefixes like "장면1:", "장면 1.", "1.", "1)", "- "
      let clean = line;
      clean = clean.replace(/^(장면|scene)\s*\d+[:.]*\s*/i, '');
      clean = clean.replace(/^\d+[\s\.)-]+\s*/, '');
      clean = clean.replace(/^[-*•]\s*/, '');
      return clean.trim();
    })
    .filter(Boolean);
}

export async function POST(request) {
  try {
    const { 
      sentencesText,
      bgmType,
      hookOption,
      keyword, 
      voice, 
      affiliateLink,
      imageSourceMode,
      directImageUrl,
      localImageBase64,
      localImageFileName,
      pexelsApiKey,
      pixabayApiKey,
      templateStyle
    } = await request.json();

    let directImagePath = '';
    if (localImageBase64 && localImageBase64.includes('base64,')) {
      try {
        const parts = localImageBase64.split(';base64,');
        const mimeType = parts[0].split(':')[1];
        const base64Data = parts[1];
        const buffer = Buffer.from(base64Data, 'base64');
        
        let ext = 'jpg';
        if (mimeType.includes('png')) ext = 'png';
        else if (mimeType.includes('webp')) ext = 'webp';
        else if (mimeType.includes('gif')) ext = 'gif';
        
        const uploadDir = path.join(process.cwd(), 'public', 'shorts', 'uploads');
        fs.mkdirSync(uploadDir, { recursive: true });
        
        const uploadFilename = `upload_${Date.now()}.${ext}`;
        const absoluteUploadPath = path.join(uploadDir, uploadFilename);
        fs.writeFileSync(absoluteUploadPath, buffer);
        directImagePath = absoluteUploadPath.replace(/\\/g, '/');
        console.log(`Saved base64 uploaded image to: ${directImagePath}`);
      } catch (e) {
        console.error('[Base64 Image Save Error]', e);
      }
    }

    if (!keyword || !keyword.trim()) {
      return NextResponse.json(
        { success: false, error: '쇼츠를 제작할 키워드를 입력해 주세요.' },
        { status: 400 }
      );
    }

    const apiKey = process.env.GEMINI_API_KEY;
    if (!apiKey) {
      return NextResponse.json(
        { success: false, error: 'Gemini API Key가 설정되지 않았습니다.' },
        { status: 500 }
      );
    }

    // Helper to call Gemini in JSON format
    const callGemini = async (systemPrompt, userPrompt) => {
      const salt = Math.random().toString(36).substring(2, 15) + '-' + Date.now();
      const enhancedUserPrompt = `${userPrompt}\n\n[Request Salt: ${salt}]`;
      const enhancedSystemPrompt = `${systemPrompt}\n\n[Instruction: Every request is independent. Ignore all previous inputs or outputs. Request Salt: ${salt}]`;

      let geminiUrl = '';
      const headers = { 'Content-Type': 'application/json' };
      let requestBody = {};

      if (apiKey.startsWith('ya29.')) {
        const projectNumber = process.env.GEMINI_PROJECT_NUMBER || '773040580705project';
        const region = 'us-central1';
        geminiUrl = `https://${region}-aiplatform.googleapis.com/v1/projects/${projectNumber}/locations/${region}/publishers/google/models/gemini-1.5-flash:generateContent`;
        headers['Authorization'] = `Bearer ${apiKey}`;
        requestBody = {
          contents: [{ role: 'user', parts: [{ text: `${enhancedSystemPrompt}\n\n${enhancedUserPrompt}` }] }],
          generationConfig: { 
            temperature: 0.85, 
            maxOutputTokens: 4096,
            responseMimeType: "application/json"
          }
        };
      } else {
        geminiUrl = `https://generativelanguage.googleapis.com/v1beta/models/gemini-flash-latest:generateContent?key=${apiKey}`;
        requestBody = {
          contents: [{ parts: [{ text: `${enhancedSystemPrompt}\n\n${enhancedUserPrompt}` }] }],
          generationConfig: { 
            temperature: 0.85, 
            topP: 0.95, 
            maxOutputTokens: 4096,
            responseMimeType: "application/json"
          }
        };
      }

      const response = await fetch(geminiUrl, {
        method: 'POST',
        headers,
        body: JSON.stringify(requestBody)
      });

      if (!response.ok) {
        throw new Error(`Gemini API error: ${response.status} ${await response.text()}`);
      }

      const resData = await response.json();
      let resText = resData.candidates?.[0]?.content?.parts?.[0]?.text;
      if (!resText) {
        throw new Error('No content returned from Gemini');
      }

      resText = resText.replace(/```json/g, '').replace(/```/g, '').trim();
      return JSON.parse(resText);
    };

    let productAnalysis = null;
    let shortsPlan = null;

    if (sentencesText && sentencesText.trim()) {
      console.log(`[Phase 1 & 2 - User Sentences Mode] Processing custom user script...`);
      let sentences = parseSentences(sentencesText);
      if (sentences.length === 0) {
        return NextResponse.json(
          { success: false, error: '줄바꿈을 기준으로 대본 문장을 하나 이상 입력해 주세요.' },
          { status: 400 }
        );
      }
      
      let autoHookFlag = false;
      if (hookOption && hookOption.enabled) {
        if (hookOption.mode === 'manual' && hookOption.text && hookOption.text.trim()) {
          sentences.unshift(hookOption.text.trim());
        } else if (hookOption.mode === 'auto') {
          autoHookFlag = true;
        }
      }
      
      const customSceneSystemPrompt = `당신은 유튜브 쇼츠 비주얼 기획 전문가이자 영상 감독 AI입니다.
사용자가 제공한 문장 리스트가 주어집니다. 
당신은 문장의 의미를 변경하거나, 요약하거나, 수정해서는 절대 안 됩니다. 
주어진 각 문장에 대해 비주얼 연출안, 비디오 검색용 영어 키워드 리스트, 이미지 검색용 영어 키워드 리스트를 작성해야 합니다.

반드시 아래 JSON 스키마 형식으로만 응답해야 합니다. 다른 텍스트는 포함하지 마십시오.

출력 JSON 스키마:
{
  "strategy": "전체 영상의 편집 및 B-roll 연출 전략",
  "bgmRecommendation": "BGM 추천 (템포, 악기, 분위기 설명)",
  "titles": ["추천 제목 1 (10자 내외)", "추천 제목 2", "추천 제목 3"],
  "scenes": [
    {
      "sceneNumber": 1,
      "narration": "이 장면에 해당하는 원래 문장 (절대로 수정 금지, 토씨 하나 틀리지 않게 그대로 복사)",
      "caption": "이 장면에 해당하는 원래 문장 (절대로 수정 금지, 토씨 하나 틀리지 않게 그대로 복사)",
      "videoSearchKeywords": [
        "비디오 검색용 영어 키워드 1 (예: 'sizzling meat')",
        "비디오 검색용 영어 키워드 2",
        "비디오 검색용 영어 키워드 3"
      ],
      "imageSearchKeywords": [
        "이미지 검색용 영어 키워드 1 (예: 'korean barbecue close up')",
        "이미지 검색용 영어 키워드 2",
        "이미지 검색용 영어 키워드 3"
      ],
      "visualSource": "장면의 구체적인 연출 및 화면 구성 설명",
      "editingInstruction": "장면 전환 및 효과 지시 (예: 'Zoom In')"
    }
  ]
}

주의사항:
1. "narration"과 "caption"은 반드시 제공된 문장을 100% 동일하게 복사해야 합니다. 단어의 요약, 추가, 누락, 의미 변형이 있어서는 절대 안 됩니다.
2. ${autoHookFlag ? "사용자가 첫 장면에 들어갈 후킹(Hook) 문장의 자동 생성을 요청했습니다. 영상의 시작(Scene 1)에 시청자를 사로잡을 수 있는 강렬하고 매력적인 오프닝 후킹 문장 1개를 새로 창작하여 scenes의 가장 첫 번째 항목으로 추가하십시오. 그 다음 장면(Scene 2)부터는 사용자가 제공한 문장들을 순서대로 배치해야 합니다. (주의: 새로 창작한 후킹 문장 외의 다른 문장들은 절대로 변경되어서는 안 됩니다.)" : "모든 장면(scenes)의 narration/caption은 사용자가 제공한 문장 리스트와 1:1로 매끄럽게 매칭되어야 합니다."}
3. 각 장면마다 영상 및 이미지 검색어는 구체적이고 명확한 영어 명사/구로 작성해야 합니다. 장면마다 중복된 키워드를 피하고 다양한 구도를 찾을 수 있는 키워드를 제시하십시오.`;

      const customSceneUserPrompt = `[선택한 BGM 스타일]
${bgmType || '정보형'}

[사용자 제공 문장 리스트]
${sentences.map((s, idx) => `${idx + 1}. ${s}`).join('\n')}

이 대본을 기반으로 장면별 분석 및 키워드를 매핑해 주세요.`;

      try {
        const geminiRes = await callGemini(customSceneSystemPrompt, customSceneUserPrompt);
        const geminiScenes = geminiRes.scenes || [];
        let finalScenes = [];
        
        for (let i = 0; i < geminiScenes.length; i++) {
          const gScene = geminiScenes[i];
          let correctText = '';
          
          if (autoHookFlag && i === 0) {
            correctText = gScene.narration || '이것만 알면 끝납니다!';
          } else {
            const sIdx = autoHookFlag ? i - 1 : i;
            correctText = sentences[sIdx] || gScene.narration;
          }
          
          finalScenes.push({
            sceneNumber: i + 1,
            narration: correctText,
            caption: correctText,
            imageKeyword: gScene.videoSearchKeywords?.[0] || gScene.imageSearchKeywords?.[0] || 'abstract',
            videoSearchKeywords: gScene.videoSearchKeywords || [gScene.imageKeyword || 'abstract'],
            imageSearchKeywords: gScene.imageSearchKeywords || [gScene.imageKeyword || 'abstract'],
            visualSource: gScene.visualSource || '상세 연출 장면',
            editingInstruction: gScene.editingInstruction || 'Zoom In'
          });
        }
        
        const expectedCount = sentences.length + (autoHookFlag ? 1 : 0);
        while (finalScenes.length < expectedCount) {
          const i = finalScenes.length;
          const sIdx = autoHookFlag ? i - 1 : i;
          const correctText = sentences[sIdx] || '다음 단계를 준비하세요';
          finalScenes.push({
            sceneNumber: i + 1,
            narration: correctText,
            caption: correctText,
            imageKeyword: 'abstract',
            videoSearchKeywords: ['abstract'],
            imageSearchKeywords: ['abstract'],
            visualSource: '추가 보충 연출 장면',
            editingInstruction: 'Fade In'
          });
        }
        
        productAnalysis = {
          productAnalysis: {
            usp: '사용자 지정 문장을 활용한 맞춤형 영상 매칭',
            targetAudience: '대본 관심 시청자층',
            painPoints: '신뢰도 높고 정확한 정보 전달',
            hookPoints: geminiRes.titles || ['오프닝 훅 메시지']
          }
        };

        shortsPlan = {
          strategy: geminiRes.strategy || '대본을 정밀하게 연출한 비주얼 B-roll 구성',
          bgmRecommendation: geminiRes.bgmRecommendation || '대본 흐름에 적합한 추천 음악',
          titles: geminiRes.titles || [`💡 쇼츠 가이드`],
          scenes: finalScenes,
          script: finalScenes.map(s => s.narration).join(' '),
          uploadDescription: `사용자 지정 대본으로 만든 고품질 자동화 쇼츠 영상입니다.\n\n[영상 대본]\n${finalScenes.map(s => s.narration).join('\n')}`,
          hashtags: ['쇼츠', '자동제작', bgmType || '정보형'],
          expectedReaction: '대본 주제에 깊게 공감하는 반응 예상',
          retentionPoints: '첫 3초 후킹 화면 구성 및 정교한 이미지/비디오 타이밍 전환',
          productAnalysis: productAnalysis.productAnalysis,
          analysis: {
            hookPattern: autoHookFlag ? "3초 이내에 시청자의 시선을 사로잡는 오프닝 훅 배치" : "대본 첫 구절 시작",
            avgDuration: `${finalScenes.length * 2}초 내외`,
            transitionSpeed: "2초 미만의 빠른 화면 전환",
            captionStyle: "흰색/노란색 강조 캡컷 스타일 바이럴 자막",
            voiceTone: voice === 'male' ? "남성 성우 (인준)" : "여성 성우 (선희)",
            bgmType: bgmType || '정보형',
            retentionTriggers: "정확한 매칭 소스를 이용한 시각 집중",
            commentTriggers: "마지막 문장 댓글 유도",
            likeShareTriggers: "정보 저장 유도",
            algorithmStrategy: "빠른 정보 전달과 반복 시청 유도"
          }
        };
        
        console.log('[User Sentences Mode] Successfully completed scene planning. Total scenes:', shortsPlan.scenes.length);
      } catch (err) {
        console.error('[User Sentences Mode] Scene analysis failed, fallback to mock:', err);
        const localScenes = [];
        if (autoHookFlag) {
          localScenes.push({
            sceneNumber: 1,
            narration: '놓치면 100% 후회할 놀라운 정보!',
            caption: '놓치면 100% 후회할 놀라운 정보!',
            imageKeyword: 'curious',
            videoSearchKeywords: ['curious', 'success'],
            imageSearchKeywords: ['success'],
            visualSource: '시선을 집중시키는 타이틀 클로즈업',
            editingInstruction: 'Zoom In'
          });
        }
        
        sentences.forEach((s, idx) => {
          localScenes.push({
            sceneNumber: localScenes.length + 1,
            narration: s,
            caption: s,
            imageKeyword: 'lifestyle',
            videoSearchKeywords: ['lifestyle', 'modern'],
            imageSearchKeywords: ['lifestyle'],
            visualSource: `문장 ${idx+1} 연출 장면`,
            editingInstruction: '1.5초 전환'
          });
        });
        
        productAnalysis = {
          productAnalysis: {
            usp: '사용자 지정 문장 매칭',
            targetAudience: '일반 시청자',
            painPoints: '직접 제작하는 쇼츠',
            hookPoints: ['핵심 정보 공개']
          }
        };

        shortsPlan = {
          strategy: '사용자 제공 문장을 그대로 합성한 안전한 연출',
          bgmRecommendation: '잔잔하고 편안한 분위기의 로파이 비트',
          titles: [`💡 당신이 알아야 할 핵심 가이드`],
          scenes: localScenes,
          script: localScenes.map(s => s.narration).join(' '),
          uploadDescription: `사용자 지정 대본으로 만든 쇼츠 영상입니다.`,
          hashtags: ['쇼츠', '자동화'],
          expectedReaction: '유용한 팁이라는 평가 예상',
          retentionPoints: '자연스러운 전환',
          productAnalysis: productAnalysis.productAnalysis,
          analysis: {
            hookPattern: autoHookFlag ? "3초 이내에 시청자의 시선을 사로잡는 오프닝 훅 배치" : "대본 첫 구절 시작",
            avgDuration: `${localScenes.length * 2}초 내외`,
            transitionSpeed: "2초 미만의 빠른 화면 전환",
            captionStyle: "흰색/노란색 강조 캡컷 스타일 바이럴 자막",
            voiceTone: voice === 'male' ? "남성 성우 (인준)" : "여성 성우 (선희)",
            bgmType: bgmType || '정보형',
            retentionTriggers: "정확한 매칭 소스를 이용한 시각 집중",
            commentTriggers: "마지막 문장 댓글 유도",
            likeShareTriggers: "정보 저장 유도",
            algorithmStrategy: "빠른 정보 전달과 반복 시청 유도"
          }
        };
      }
    } else {
      // 1단계: 상품 분석 AI (Product Analysis AI)
      console.log(`[Phase 1] Starting Product Analysis AI for keyword: "${keyword}"...`);
      const productAnalysisSystemPrompt = `당신은 세계 최고 수준의 상품 마케팅 분석가이자 카피라이터 AI입니다.
주어진 상품 또는 키워드에 대해, 시장성, 핵심 소구점(USP), 타겟 오디언스 페르소나, 그리고 고객이 겪는 페인 포인트를 분석하여 마케팅 전략과 강력한 후크 메시지를 수립해야 합니다.
반드시 아래 JSON 스키마 형식으로만 응답해야 합니다. 다른 텍스트는 포함하지 마십시오.

출력 JSON 스키마:
{
  "productAnalysis": {
    "usp": "상품의 핵심 USP 3가지 요약 (각각 명확하고 한 줄 분량)",
    "targetAudience": "주 타겟층 연령대 및 시청자 페르소나 설명",
    "painPoints": "이 타겟 고객들이 일상에서 느끼는 구체적인 불편함 또는 요구사항",
    "hookPoints": [
      "후킹 앵글 1: 시청자를 경고/충격으로 끌어들이는 문구 (예: '아직도 X하고 계신가요? 당장 멈추세요!')",
      "후킹 앵글 2: 호기심을 유발하는 문구 (예: '대부분 모르는 X의 비밀')",
      "후킹 앵글 3: 이득/해결책을 제시하는 문구 (예: 'X 하나로 인생의 질을 2배 올리는 방법')"
    ]
  }
}`;

      const productAnalysisUserPrompt = `[분석할 상품 키워드]
키워드: ${keyword}`;

      try {
        productAnalysis = await callGemini(productAnalysisSystemPrompt, productAnalysisUserPrompt);
        console.log('[Phase 1] Successfully completed Product Analysis AI:', productAnalysis);
      } catch (e) {
        console.error('[Phase 1] Product Analysis AI Failed. Using default mock values:', e);
        productAnalysis = {
          productAnalysis: {
            usp: `${keyword}의 핵심 성능과 가성비, 그리고 편의성`,
            targetAudience: `효율성을 추구하는 현대인 및 해당 제품이 필요한 구매 타겟군`,
            painPoints: `불필요한 시간 낭비와 비효율적인 일상 속 소소한 문제점`,
            hookPoints: [
              `아직도 ${keyword} 없이 사시나요? 당장 멈추고 이거 보세요!`,
              `대부분 모르는 ${keyword}의 대단한 비밀 1가지`,
              `${keyword} 하나로 삶의 질을 2배 이상 올리는 방법`
            ]
          }
        };
      }

      // 2단계: 장면 기획 AI (Scene Planning AI)
      console.log(`[Phase 2] Starting Scene Planning AI...`);
      const scenePlanningSystemPrompt = `당신은 세계 최고의 유튜브 쇼츠 편집 감독이자 시나리오 작가입니다.
제공된 상품 정보와 마케팅 분석 결과를 바탕으로, 시청자의 이탈을 방지하고 끝까지 보게 만드는 스토리 기반의 쇼츠 연출안과 대본을 작성해야 합니다.
반드시 아래 JSON 스키마 형식으로만 응답해야 합니다. 다른 텍스트는 포함하지 마십시오.

출력 JSON 스키마:
{
  "analysis": {
    "hookPattern": "상위 쇼츠들의 후킹 패턴 요약",
    "avgDuration": "평균 영상 길이 (예: 30초~45초)",
    "transitionSpeed": "장면 전환 속도 및 주기",
    "captionStyle": "자막 스타일 (예: 캡컷 스타일, 노란색/흰색 강조 등)",
    "voiceTone": "보이스 톤 유형 (신뢰감, 강한 에너지, 긴장감, 차분함, 몰입감 중 택1)",
    "bgmType": "BGM 유형 (비트감, 미스터리, 잔잔함 등)",
    "retentionTriggers": "시청 지속시간을 높이는 핵심 요소",
    "commentTriggers": "댓글 참여를 유도하는 요소",
    "likeShareTriggers": "좋아요와 공유를 유도하는 요소",
    "algorithmStrategy": "알고리즘 친화적인 전개 방식"
  },
  "strategy": "바이럴 분석을 바탕으로 한 제작 전략",
  "titles": ["후킹용 추천 쇼츠 제목 1 (10자 내외)", "추천 제목 2", "추천 제목 3", "추천 제목 4", "추천 제목 5", "추천 제목 6", "추천 제목 7", "추천 제목 8", "추천 제목 9", "추천 제목 10"],
  "script": "전체 영상의 스토리라인 기반 나레이션 통합 대본",
  "bgmRecommendation": "구체적인 BGM 곡 분위기 및 템포 스타일 추천",
  "uploadDescription": "유튜브 업로드용 설명글란 내용 (링크 삽입 자리 확보)",
  "hashtags": ["해시태그1", "해시태그2", "해시태그3", "해시태그4"],
  "expectedReaction": "시청자들의 예상 반응 및 댓글 모음",
  "retentionPoints": "3초 이탈률 최소화 및 시청 유지율 극대화를 위한 핵심 포인트",
  "scenes": [
    {
      "sceneNumber": 1,
      "imageKeyword": "해당 장면을 설명하는 Unsplash/Pexels 검색용 영어 키워드 1-2단어 (예: 'smartphone', 'stressed worker', 'office')",
      "visualSource": "장면 영상 소스 상세 연출 설명 (e.g., '좌절하는 직장인의 바스트 샷')",
      "editingInstruction": "장면 편집 지시 (e.g., 'Zoom In, Speed Ramp')",
      "caption": "화면에 표시할 짧고 강렬한 자막 (한 문장 최대 12자 이내)",
      "narration": "이 장면에 해당하는 실제 한글 TTS 나레이션 대본 (영어나 특수문자가 없어야 하며, 발음하는 대로 작성해야 함. 괄호나 연출 지시문 제외)"
    }
  ]
}

주의사항:
1. 장면 개수 규칙: 전체 영상은 최소 15개 이상, 최대 30개 이하의 장면(scenes)으로 세분화해야 합니다. 상품의 사용법, 장점, 페인포인트 극복 과정, 후킹, 엔딩 유도를 논리적이고 빠른 템포의 스토리로 구성하세요.
2. 1개 장면이 2초 이상 지속되면 시청자가 지루해하므로, 장면의 narration 길이는 최대 3~4단어로 매우 짧아야 합니다.
3. 자막(caption)은 12자 이내로 눈길을 사로잡는 문구로 작성하세요.`;

      const scenePlanningUserPrompt = `[상품 키워드]
키워드: ${keyword}

[마케팅 분석 결과]
USP: ${productAnalysis.productAnalysis.usp}
주 타겟층: ${productAnalysis.productAnalysis.targetAudience}
페인 포인트: ${productAnalysis.productAnalysis.painPoints}
추천 훅: ${productAnalysis.productAnalysis.hookPoints.join(', ')}

이 분석 결과를 기반으로 스토리라인이 살아있고, 총 15개에서 30개 사이의 장면으로 촘촘히 쪼개진 속도감 있는 쇼츠 시나리오를 구성해 주세요.`;

      try {
        shortsPlan = await callGemini(scenePlanningSystemPrompt, scenePlanningUserPrompt);
        console.log('[Phase 2] Scene Planning AI completed successfully. Total scenes generated:', shortsPlan.scenes?.length);
      } catch (e) {
        console.error('[Phase 2] Scene Planning AI Failed. Using default mock values:', e);
        shortsPlan = {
          analysis: {
            hookPattern: "3초 이내에 시청자의 상식을 깨뜨리는 경고성 오프닝 훅 사용",
            avgDuration: "35초 내외",
            transitionSpeed: "1.5초~2초 간격의 빠른 화면 전환",
            captionStyle: "노란색/흰색 대비의 캡컷 바이럴 스타일 폰트",
            voiceTone: "신뢰감",
            bgmType: "비트감이 강하고 묵직한 베이스의 배경음악",
            retentionTriggers: "핵심 정보를 끝까지 미루며 궁금증 유발",
            commentTriggers: "마지막에 '댓글로 의견을 남겨달라'는 질문 투척",
            likeShareTriggers: "정보 저장(북마크)을 유도하여 공유 촉진",
            algorithmStrategy: "빠른 정보 전달 후 바로 반복 시청이 되도록 매끄러운 아웃트로 설계"
          },
          strategy: `입력받은 키워드 '${keyword}'에 대한 시청자들의 보편적 실수를 짚어내고 3가지 즉각 해결책 제시`,
          titles: [
            `🚨 ${keyword} 할 때 99%가 하는 치명적 실수`,
            `💡 당신이 몰랐던 ${keyword} 초간단 비법`,
            `⚠️ ${keyword} 제대로 모르면 평생 손해봅니다`,
            `🤫 아무도 알려주지 않는 ${keyword} 꿀팁`,
            `🔥 ${keyword} 효율 200% 올리는 핵심 정리`,
            `🧐 아직도 ${keyword}을 어렵게 하시나요?`,
            `✨ 삶의 질이 달라지는 ${keyword} 노하우`,
            `💻 직장인 필수 ${keyword} 완전 가이드`,
            `💬 진짜 유용한 ${keyword} 사용 팁`,
            `⚡ 초고속으로 배우는 ${keyword}의 비밀`
          ],
          script: `스마트폰 용량 부족해서 답답하셨죠? 사진 지우지 말고 카카오톡 설정에서 캐시 데이터만 삭제해 보세요. 이것만 해도 기가바이트 단위로 용량이 늘어납니다!`,
          bgmRecommendation: "120BPM의 속도감 있는 로파이 비트 또는 긴박한 신스 브레이크 비트",
          uploadDescription: `조회수 폭발하는 ${keyword}에 관한 핵심 꿀팁 가이드입니다!`,
          hashtags: ["쇼츠", "자동화", "추천템", keyword.replace(/\s+/g, "")],
          expectedReaction: "'헐 이거 나만 몰랐나?', '바로 해봐야지' 등의 반응 예상",
          retentionPoints: "첫 오프닝의 경고 문구로 3초 이탈 방지 및 해결책 부분의 빠른 화면 전환",
          scenes: Array.from({ length: 15 }, (_, i) => ({
            sceneNumber: i + 1,
            imageKeyword: ["tech", "office", "laptop", "mobile", "clean", "workspace", "success", "speed", "modern", "keyboard", "screen", "desk", "idea", "creative", "connection"][i] || "abstract",
            visualSource: `장면 ${i + 1} 상세 연출 샷`,
            editingInstruction: "Zoom In, 1.5초 전환",
            caption: `핵심 체크 ${i + 1}`,
            narration: `나레이션 구절 ${i + 1} 입니다`
          }))
        };
      }

      // 11. 장면 수 부족 시 AI가 추가 장면 생성 (Programmatic Fallback Check)
      if (!shortsPlan.scenes || shortsPlan.scenes.length < 15) {
        console.log(`[Scene Expansion] Current scene count: ${shortsPlan.scenes?.length || 0}. Expanding programmatically to reach at least 15 scenes...`);
        let finalScenes = shortsPlan.scenes ? [...shortsPlan.scenes] : [];
        
        while (finalScenes.length < 15) {
          let longestSceneIdx = -1;
          let maxLen = -1;
          for (let i = 0; i < finalScenes.length; i++) {
            const narration = finalScenes[i].narration || "";
            if (narration.length > maxLen) {
              maxLen = narration.length;
              longestSceneIdx = i;
            }
          }

          if (longestSceneIdx === -1 || maxLen <= 12) {
            const lastScene = finalScenes[finalScenes.length - 1];
            finalScenes.push({
              sceneNumber: finalScenes.length + 1,
              imageKeyword: lastScene ? lastScene.imageKeyword + " abstract" : "abstract",
              visualSource: "추가 상세 클로즈업 장면",
              editingInstruction: "Zoom In",
              caption: "꿀팁 대방출",
              narration: "놓치면 후회할 꿀팁입니다"
            });
          } else {
            const targetScene = finalScenes[longestSceneIdx];
            const narration = targetScene.narration;
            const words = narration.split(/\s+/);
            const mid = Math.floor(words.length / 2);

            const narration1 = words.slice(0, mid).join(' ');
            const narration2 = words.slice(mid).join(' ');

            const scene1 = {
              ...targetScene,
              narration: narration1,
              caption: targetScene.caption ? targetScene.caption.slice(0, 10) : "꿀팁 공유"
            };

            const scene2 = {
              sceneNumber: targetScene.sceneNumber + 0.5,
              imageKeyword: targetScene.imageKeyword + " detail",
              visualSource: targetScene.visualSource + " (상세 연출)",
              editingInstruction: "Zoom Out",
              caption: targetScene.caption ? targetScene.caption.slice(Math.max(0, targetScene.caption.length - 10)) : "지금 확인",
              narration: narration2
            };

            finalScenes.splice(longestSceneIdx, 1, scene1, scene2);
          }
        }

        shortsPlan.scenes = finalScenes.map((s, idx) => ({
          ...s,
          sceneNumber: idx + 1
        }));
      }

      shortsPlan.productAnalysis = productAnalysis.productAnalysis;
    }

    // Append affiliate link to script if provided
    if (affiliateLink && affiliateLink.trim()) {
      shortsPlan.script += `\n🛒 구매 좌표: ${affiliateLink}`;
    }

    // Prepare temp config for Python script
    const timestamp = Date.now();
    const videoFilename = `stock_${timestamp}.mp4`;
    const outputDir = path.join(process.cwd(), 'public', 'shorts');
    fs.mkdirSync(outputDir, { recursive: true });
    
    const absoluteOutputPath = path.join(outputDir, videoFilename);
    const relativeVideoUrl = `/shorts/${videoFilename}`;

    const configPath = path.join(outputDir, `config_${timestamp}.json`);
    const inputData = {
      script: shortsPlan.script,
      voice: voice || 'female',
      search_keywords: shortsPlan.scenes ? shortsPlan.scenes.map(s => s.imageKeyword).filter(Boolean) : ["abstract"],
      output_path: absoluteOutputPath.replace(/\\/g, '/'),
      image_source_mode: imageSourceMode || 'stock_only',
      direct_image_url: directImageUrl || '',
      direct_image_path: directImagePath || '',
      keyword: keyword,
      scenes: shortsPlan.scenes || [],
      pexels_api_key: pexelsApiKey || process.env.PEXELS_API_KEY || '',
      pixabay_api_key: pixabayApiKey || process.env.PIXABAY_API_KEY || '',
      template_style: templateStyle || 'classic'
    };

    fs.writeFileSync(configPath, JSON.stringify(inputData, null, 2), 'utf-8');

    console.log(`Triggering video generation script for ${videoFilename}...`);
    const scriptPath = path.join(process.cwd(), 'scripts', 'generate_stock_shorts.py');

    // Execute python script
    return new Promise((resolve) => {
      exec(`python "${scriptPath}" "${configPath}"`, (error, stdout, stderr) => {
        // Clean up temp config file
        try {
          if (fs.existsSync(configPath)) {
            fs.unlinkSync(configPath);
          }
        } catch (e) {
          console.error('Error cleaning up temp json config:', e);
        }

        // Clean up uploaded image if exists
        try {
          if (directImagePath && fs.existsSync(directImagePath)) {
            fs.unlinkSync(directImagePath);
          }
        } catch (e) {}

        if (error) {
          console.error(`Python script error:`, error);
          console.error(`stderr: ${stderr}`);
          console.error(`stdout: ${stdout}`);
          
          // Retry with python3
          console.log('Retrying with python3...');
          fs.writeFileSync(configPath, JSON.stringify(inputData, null, 2), 'utf-8');
          
          exec(`python3 "${scriptPath}" "${configPath}"`, (py3Error, py3Stdout, py3Stderr) => {
            try {
              if (fs.existsSync(configPath)) {
                fs.unlinkSync(configPath);
              }
            } catch (e) {}

            try {
              if (directImagePath && fs.existsSync(directImagePath)) {
                fs.unlinkSync(directImagePath);
              }
            } catch (e) {}

            if (py3Error) {
              console.error(`Python3 script error:`, py3Error);
              console.error(`stderr: ${py3Stderr}`);
              resolve(
                NextResponse.json(
                  { 
                    success: false, 
                    error: '비디오 합성 스크립트 실행 실패', 
                    details: py3Stderr || py3Error.message 
                  },
                  { status: 500 }
                )
              );
            } else {
              console.log('Video rendered successfully with python3!');
              let assets = [];
              const match = py3Stdout.match(/__ASSETS__:(.*)/);
              if (match) {
                try {
                  assets = JSON.parse(match[1].trim());
                } catch (e) {
                  console.error('Failed to parse assets from py3Stdout:', e);
                }
              }
              resolve(
                NextResponse.json({
                  success: true,
                  title: shortsPlan.titles && shortsPlan.titles.length > 0 ? shortsPlan.titles[0] : (shortsPlan.title || '🚨 AI 쇼츠 제작 완료'),
                  script: shortsPlan.script,
                  searchKeywords: shortsPlan.scenes ? shortsPlan.scenes.map(s => s.imageKeyword).filter(Boolean) : ["abstract"],
                  videoUrl: relativeVideoUrl,
                  assets: assets,
                  analysis: shortsPlan.analysis,
                  strategy: shortsPlan.strategy,
                  titles: shortsPlan.titles,
                  ttsScript: shortsPlan.ttsScript,
                  bgmRecommendation: shortsPlan.bgmRecommendation,
                  uploadDescription: shortsPlan.uploadDescription,
                  hashtags: shortsPlan.hashtags,
                  expectedReaction: shortsPlan.expectedReaction,
                  retentionPoints: shortsPlan.retentionPoints,
                  scenes: shortsPlan.scenes,
                  productAnalysis: shortsPlan.productAnalysis
                })
              );
            }
          });
        } else {
          console.log('Video rendered successfully with python!');
          let assets = [];
          const match = stdout.match(/__ASSETS__:(.*)/);
          if (match) {
            try {
              assets = JSON.parse(match[1].trim());
            } catch (e) {
              console.error('Failed to parse assets from stdout:', e);
            }
          }
          resolve(
            NextResponse.json({
              success: true,
              title: shortsPlan.titles && shortsPlan.titles.length > 0 ? shortsPlan.titles[0] : (shortsPlan.title || '🚨 AI 쇼츠 제작 완료'),
              script: shortsPlan.script,
              searchKeywords: shortsPlan.scenes ? shortsPlan.scenes.map(s => s.imageKeyword).filter(Boolean) : ["abstract"],
              videoUrl: relativeVideoUrl,
              assets: assets,
              analysis: shortsPlan.analysis,
              strategy: shortsPlan.strategy,
              titles: shortsPlan.titles,
              ttsScript: shortsPlan.ttsScript,
              bgmRecommendation: shortsPlan.bgmRecommendation,
              uploadDescription: shortsPlan.uploadDescription,
              hashtags: shortsPlan.hashtags,
              expectedReaction: shortsPlan.expectedReaction,
              retentionPoints: shortsPlan.retentionPoints,
              scenes: shortsPlan.scenes,
              productAnalysis: shortsPlan.productAnalysis
            })
          );
        }
      });
    });

  } catch (error) {
    console.error('Generate Shorts API Handler Error:', error);
    return NextResponse.json(
      { success: false, error: error.message },
      { status: 500 }
    );
  }
}
