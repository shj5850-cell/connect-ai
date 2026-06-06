import { NextResponse } from 'next/server';

const callGemini = async (apiKey, projectNumber, systemPrompt, userPrompt) => {
  const salt = Math.random().toString(36).substring(2, 15) + '-' + Date.now();
  const enhancedUserPrompt = `${userPrompt}\n\n[Request Salt: ${salt}]`;
  const enhancedSystemPrompt = `${systemPrompt}\n\n[Instruction: Every request is independent. Ignore all previous inputs or outputs. Request Salt: ${salt}]`;

  let geminiUrl = '';
  const headers = { 'Content-Type': 'application/json' };
  let requestBody = {};

  if (apiKey.startsWith('ya29.')) {
    const region = 'us-central1';
    geminiUrl = `https://${region}-aiplatform.googleapis.com/v1/projects/${projectNumber || '773040580705project'}/locations/${region}/publishers/google/models/gemini-1.5-flash:generateContent`;
    headers['Authorization'] = `Bearer ${apiKey}`;
    requestBody = {
      contents: [{ role: 'user', parts: [{ text: `${enhancedSystemPrompt}\n\n${enhancedUserPrompt}` }] }],
      generationConfig: { 
        temperature: 0.85, 
        maxOutputTokens: 8192,
        responseMimeType: "application/json"
      }
    };
  } else {
    geminiUrl = `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash:generateContent?key=${apiKey}`;
    requestBody = {
      contents: [{ parts: [{ text: `${enhancedSystemPrompt}\n\n${enhancedUserPrompt}` }] }],
      generationConfig: { 
        temperature: 0.85, 
        topP: 0.95, 
        maxOutputTokens: 8192,
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
  console.log('[Gemini Full Response Data]', JSON.stringify(resData, null, 2));
  let resText = resData.candidates?.[0]?.content?.parts?.[0]?.text;
  if (!resText) {
    throw new Error('No content returned from Gemini');
  }

  resText = resText.replace(/```json/g, '').replace(/```/g, '').trim();
  try {
    return JSON.parse(resText);
  } catch (parseErr) {
    console.error('[Gemini JSON Parse Error] Raw text was:', resText);
    throw parseErr;
  }
};

export async function POST(request) {
  try {
    const body = await request.json();
    const { 
      rawText,
      title, 
      purpose, 
      atmosphere, 
      stylePreset,
      cuts 
    } = body;

    const apiKey = process.env.GEMINI_API_KEY;
    if (!apiKey) {
      return NextResponse.json(
        { success: false, error: 'Gemini API Key가 설정되지 않았습니다.' },
        { status: 500 }
      );
    }

    if (rawText) {
      // Free-form script parsing flow
      const systemPrompt = `당신은 숏폼(TikTok, YouTube Shorts, Reels) 영상 전문 최고 수준의 AI 크리에이티브 디렉터이자 데이터 파서입니다.
주어진 자유 형식의 비정형 대본 텍스트를 분석하여, 지정된 구조화된 JSON 데이터로 완벽하게 파싱 및 복원해야 합니다.

가이드라인:
1. 제공된 텍스트에서 제목, 분위기/스타일, 음악 방향/BGM, 자막, 컷별 정보 등을 추출하십시오.
2. 만약 특정 필드가 없거나 텍스트에서 유추하기 어렵다면, 전체 맥락과 영상 기획에 가장 잘 어울리는 값으로 어울리게 창작하여 채워 넣으십시오.
3. 컷 개수가 4개 미만이거나 4개를 초과한다면, 내용을 유기적으로 조절하여 정확히 4개의 컷으로 구성하십시오.
4. 자막/나레이션 문장은 컷당 공백 포함 최대 15자 내외로 매우 짧고 임팩트 있게 정제해 주십시오. (단, 사용자가 명시한 자막 문장이 있으면 가급적 그 느낌을 최대한 유지하되, 지나치게 길다면 읽기 좋게 다듬으십시오)
5. 비주얼 이미지 생성 프롬프트는 9:16 비율 세로형 고품질 시네마틱 묘사로 영어 혹은 한국어로 확장 및 보강해 주십시오.
6. 각 컷의 길이(duration)는 텍스트에 "7초", "8초" 등 명시된 초 단위 숫자가 있다면 해당 숫자를 파싱하고, 명시되지 않은 경우 기본적으로 5초로 설정하십시오.
7. 카메라 움직임은 'zoom in', 'zoom out', 'panning', 'shaking', 'fixed', 'slow motion' 중 하나를 선택해 주십시오.
8. 영상 목적(purpose)은 다음 목록 중 하나를 선택하십시오: '감성', '정보', '광고', '제품소개', '스토리', '브랜딩', '기타'.
9. 전체 분위기(atmosphere)는 다음 목록 중 하나를 선택하십시오: '시네마틱', '감성적', '고급스러움', '다크', '밝음', '몽환적', '미니멀', '강렬함'.
10. 스타일 프리셋(stylePreset)은 다음 목록 중 하나를 선택하십시오: '감성 광고형', '영화 예고편형', '제품 홍보형', '자기계발 쇼츠형', '정보 전달형', '다크 시네마틱형', '미니멀 브랜드형'.
11. 출력은 반드시 아래 JSON 스키마여야 합니다. 다른 텍스트는 포함할 수 없습니다.

출력 JSON 스키마:
{
  "title": "추출 또는 창작된 영상 제목",
  "purpose": "영상 목적",
  "atmosphere": "전체 분위기",
  "stylePreset": "스타일 프리셋",
  "musicStyleRecommendation": "추천 음악 분위기 묘사 (한 줄)",
  "cuts": [
    {
      "cutIndex": 1,
      "subtitle": "이 컷에 들어갈 한글 자막 문장",
      "description": "컷의 구체적인 비주얼 연출 설명",
      "prompt": "AI 이미지 생성을 위한 프롬프트 (영어)",
      "cameraMovement": "추천 카메라 무빙: 'zoom in', 'zoom out', 'panning', 'shaking', 'fixed', 'slow motion' 중 택1",
      "duration": 5,
      "keywords": "강조 키워드 (쉼표 구분)"
    },
    {
      "cutIndex": 2,
      "subtitle": "...",
      "description": "...",
      "prompt": "...",
      "cameraMovement": "...",
      "duration": 5,
      "keywords": "..."
    },
    {
      "cutIndex": 3,
      "subtitle": "...",
      "description": "...",
      "prompt": "...",
      "cameraMovement": "...",
      "duration": 5,
      "keywords": "..."
    },
    {
      "cutIndex": 4,
      "subtitle": "...",
      "description": "...",
      "prompt": "...",
      "cameraMovement": "...",
      "duration": 5,
      "keywords": "..."
    }
  ]
}`;

      const userPrompt = `[파싱할 자유 서식 대본 텍스트]\n${rawText}`;
      
      console.log(`[Cinema Script Gen] Parsing raw script text using Gemini...`);
      let parsedRes;
      try {
        parsedRes = await callGemini(apiKey, process.env.GEMINI_PROJECT_NUMBER, systemPrompt, userPrompt);
      } catch (err) {
        console.error('[Gemini Script Parsing Fail]', err);
        return NextResponse.json(
          { success: false, error: '자유 서식 대본 파싱에 실패했습니다.' },
          { status: 500 }
        );
      }

      return NextResponse.json({
        success: true,
        isParsed: true,
        title: parsedRes.title,
        purpose: parsedRes.purpose,
        atmosphere: parsedRes.atmosphere,
        stylePreset: parsedRes.stylePreset,
        musicStyleRecommendation: parsedRes.musicStyleRecommendation,
        cuts: parsedRes.cuts
      });
    }
    // System prompt for script writing
    const systemPrompt = `당신은 숏폼(TikTok, YouTube Shorts, Reels) 영상 전문 최고 수준의 AI 크리에이티브 디렉터입니다.
주어진 영상 기획 정보(제목, 목적, 전체 분위기, 스타일 프리셋)와 4개 컷의 상태를 바탕으로, 비어 있는 자막/나레이션 문장을 자동으로 창작하거나 기존 작성 내용을 다듬어 매끄러운 4단 구성 스토리라인을 완성해야 합니다.

가이드라인:
1. 문장 특징:
- 숏폼 자막은 스마트폰에서 읽기 쉬워야 하므로, 컷당 자막은 공백 포함 최대 15자 내외로 매우 짧고 임팩트 있게 작성하십시오. (한 컷당 최대 1~2개 핵심 어절)
- 첫 번째 컷(Cut 1)은 시청자의 스크롤을 멈추게 하는 강력한 후킹 문장이어야 합니다.
- 마지막 컷(Cut 4)은 영상의 목적에 알맞은 결론 또는 행동 유도(CTA, 댓글 유도, 가치 제안 등)를 담아야 합니다.
- Cut 1 -> Cut 2 -> Cut 3 -> Cut 4 간의 서사적 흐름이 매우 유기적으로 흘러가야 합니다.
2. 비어 있는 연출 설명, 생성 프롬프트, 카메라 무빙, 키워드 등도 비주얼 퀄리티를 최상으로 올릴 수 있도록 보완하십시오.
3. 출력은 반드시 아래 JSON 스키마여야 합니다. 다른 텍스트는 포함할 수 없습니다.

출력 JSON 스키마:
{
  "musicStyleRecommendation": "영상의 전체 분위기와 목적에 맞는 추천 음악 분위기 묘사 (한 줄)",
  "cuts": [
    {
      "cutIndex": 1,
      "subtitle": "이 컷에 들어갈 한글 자막 문장 (비어 있거나 어색하면 자동 창작/다듬기)",
      "description": "컷의 구체적인 비주얼 설명 (비어 있으면 채우기)",
      "prompt": "AI 이미지 생성을 위한 프롬프트 (한글, 비어 있으면 채우기)",
      "cameraMovement": "추천 카메라 무빙: 'zoom in', 'zoom out', 'panning', 'shaking', 'fixed', 'slow motion' 중 택1",
      "keywords": "강조 키워드 (쉼표 구분)"
    },
    {
      "cutIndex": 2,
      "subtitle": "...",
      "description": "...",
      "prompt": "...",
      "cameraMovement": "...",
      "keywords": "..."
    },
    {
      "cutIndex": 3,
      "subtitle": "...",
      "description": "...",
      "prompt": "...",
      "cameraMovement": "...",
      "keywords": "..."
    },
    {
      "cutIndex": 4,
      "subtitle": "...",
      "description": "...",
      "prompt": "...",
      "cameraMovement": "...",
      "keywords": "..."
    }
  ]
}`;

    const userPrompt = `[영상 기획 정보]
제목: ${title || '미정'}
목적: ${purpose || '감성'}
전체 분위기: ${atmosphere || '시네마틱'}
스타일 프리셋: ${stylePreset || '기본'}

[4컷 입력 현황 (비어 있는 칸을 최적의 문장과 키워드로 완성해 주세요)]
${cuts.map((c, i) => `
* Cut ${i + 1}:
  - 자막: ${c.subtitle || '(비어 있음)'}
  - 화면 연출: ${c.description || '(비어 있음)'}
  - 생성 프롬프트: ${c.prompt || '(비어 있음)'}
  - 카메라 무빙: ${c.cameraMovement || '(비어 있음)'}
  - 키워드: ${c.keywords || '(비어 있음)'}
`).join('\n')}`;

    console.log(`[Cinema Script Gen] Generating/refining script using Gemini...`);
    let geminiRes;
    try {
      geminiRes = await callGemini(apiKey, process.env.GEMINI_PROJECT_NUMBER, systemPrompt, userPrompt);
    } catch (err) {
      console.error('[Gemini Script Gen Fail]', err);
      // Fallback fallback script
      geminiRes = {
        musicStyleRecommendation: "시네마틱 앰비언트",
        cuts: cuts.map((c, i) => ({
          cutIndex: i + 1,
          subtitle: c.subtitle || `장면 ${i + 1} 스토리 시작`,
          description: c.description || `장면 ${i + 1} 비주얼 컷`,
          prompt: c.prompt || `Cinematic visual scene ${i + 1}`,
          cameraMovement: c.cameraMovement || "zoom in",
          keywords: c.keywords || `장면${i + 1}`
        }))
      };
    }

    return NextResponse.json({
      success: true,
      musicStyleRecommendation: geminiRes.musicStyleRecommendation,
      cuts: geminiRes.cuts
    });

  } catch (error) {
    console.error('Cinema Script Gen API Error:', error);
    return NextResponse.json(
      { success: false, error: error.message || '대본/자막 생성 중 오류가 발생했습니다.' },
      { status: 500 }
    );
  }
}
