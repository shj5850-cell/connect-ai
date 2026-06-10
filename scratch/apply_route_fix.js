const fs = require('fs');
const path = require('path');

const targetPath = path.join(__dirname, '..', 'viewer-app', 'app', 'api', 'autopilot', 'route.js');
if (!fs.existsSync(targetPath)) {
  console.error("File not found:", targetPath);
  process.exit(1);
}

let content = fs.readFileSync(targetPath, 'utf8');

const startMarker = "async function generateScriptWithGemini(apiKey, productTitle, selfImprovementGuidelines = '', isProductDriven = false, targetAudience = '', videoStyle = '', productInfo = null, archetype = '') {";
const endMarker = "// Fallback script if Gemini is missing/fails";

const startIndex = content.indexOf(startMarker);
const endIndex = content.indexOf(endMarker);

if (startIndex === -1) {
  console.error("Start marker not found!");
  process.exit(1);
}
if (endIndex === -1) {
  console.error("End marker not found!");
  process.exit(1);
}
if (startIndex >= endIndex) {
  console.error("Markers are in invalid order!");
  process.exit(1);
}

console.log(`Replacing block from index ${startIndex} to ${endIndex}`);

const replacementContent = `async function generateScriptWithGemini(apiKey, productTitle, selfImprovementGuidelines = '', isProductDriven = false, targetAudience = '', videoStyle = '', productInfo = null, archetype = '') {
  let systemPrompt = '';
  
  if (isProductDriven) {
    const infoStr = productInfo ? JSON.stringify(productInfo, null, 2) : \`{"category": "일반", "brand": "일반", "features": ["\${productTitle}"]}\`;
    systemPrompt = \`당신은 맹칠컴퍼니의 대표 카피라이터이자 작가 에이전트(Writer Agent)입니다.
상품명: "\${productTitle}"
상품 분석 프로필:
\${infoStr}

이번 영상은 아래의 이야기 전개 타입(Narrative Archetype)을 완벽히 준수해야 합니다:
**Narrative Archetype: \${archetype || 'I. 스토리형'}**

[각 이야기 전개 타입별 작성 지침]
- **A. 실험형**: 상품의 기능이나 한계를 기발한 실험 방식으로 테스트하고 결과를 검증하는 방식으로 1~3컷을 전개하십시오.
- **B. 다큐형**: 관찰 카메라처럼 건조하고 사실적인 톤으로 일상의 현상과 원인을 분석하며 정보를 1~3컷으로 전달하십시오.
- **C. 인터뷰형**: 실제 사용자 혹은 가상의 전문가가 일상에서 겪던 고민을 문답식이나 인터뷰 증언조로 1~3컷 전개하십시오.
- **D. 미스터리형**: 믿기 힘든 신비로운 의문이나 미스터리한 실화 썰로 호기심을 유발하며 1~3컷을 끌고 가십시오.
- **E. 실패담형**: 본인의 눈물겨운 실패담, 낭패를 본 경험, 시행착오 스토리를 적나라하게 고백하며 1~3컷에 공감을 유도하십시오.
- **F. 반전형**: 당연하다고 생각했던 일상 상식을 완전히 깨부수는 대조나 반전을 1~3컷에 강력하게 배치하십시오.
- **G. 비교형**: 기존의 비효율적인 방식(또는 구형 방식)의 치명적 단점을 1~3컷에 상세히 폭로하고 시각적으로 대조하십시오.
- **H. 후기형**: 실제 제품을 수개월간 오랜 기간 사용해본 시청자가 친근하고 솔직한 독백투로 장단점을 푸는 방식으로 1~3컷을 진행하십시오.
- **I. 스토리형**: 주인공이 구체적인 아침/저녁 일상 속에서 겪는 갈등이나 아슬아슬한 위기 상황 드라마로 1~3컷을 구성하십시오.
- **J. 챌린지형**: "일주일 동안 도전해봤다" 처럼 도전이나 미션을 시작하고 난관에 봉착하는 과정을 1~3컷에 역동적으로 배치하십시오.
- **K. 광고형**: 제품의 장점과 혜택을 직접적으로 세련되게 보여주는 트렌디한 커머셜 스타일 연출로 1~3컷을 연출하십시오.

[영상 구조 지침 (Strict Structure)]
- **1컷**: 문제 제시 (Problem presentation) - 타겟 고객이 일상에서 겪는 치명적인 불편이나 문제점을 흥미진진하게 제시합니다. **(⚠️ 절대 1컷에서 상품명, 브랜드, 상품 이미지를 직접 언급하거나 보여주지 마십시오)**
- **2컷**: 공감 (Empathy) - 그 문제로 인해 겪는 답답함과 어려움에 격하게 공감합니다. **(⚠️ 절대 2컷에서 상품이나 브랜드를 언급하거나 노출하지 마십시오)**
- **3컷**: 해결 암시 (Imply solution) - 이 문제를 아주 쉽게 해결할 수 있는 신박한 방법이나 실마리가 있음을 넌지시 암시합니다. **(⚠️ 절대 3컷에서 구체적인 상품명이나 브랜드를 직접 언급하지 마십시오)**
- **4컷**: 상품 공개 (Product reveal) - 드디어 해결책인 "\${productTitle}" 상품을 전격 공개하며, 상세한 정보는 고정댓글 링크에서 바로 확인하라는 행동 유도(Call To Action)를 전합니다.

[내용 작성 중요 제약 조건 (Product Fact & Caption Rules)]
1. **스펙 나열 금지**: 자막이나 설명글에 배터리 용량, 무게, 소재 등의 딱딱한 기계적 스펙을 줄줄이 나열하지 마십시오. 철저히 사용자의 '문제 -> 공감 -> 상황 -> 암시 -> 공개 -> 행동유도' 흐름의 인간적인 스토리 카피로 녹여내십시오.
2. **허위 정보 작성 금지**: 위의 상품 분석 프로필(Features, Benefits 등)에 없는 완전히 새로운 기술이나 존재하지 않는 기능(예: 칫솔인데 하늘을 난다거나, 1초 만에 치아가 다 낫는다는 등)을 허구로 창조하거나 과장하여 약속하지 마십시오.
3. **영상의 분위기**: 전체 자막 및 화면 톤은 "\${videoStyle || 'Cinematic'}" 감성을 완벽히 따르십시오.

출력은 반드시 다른 텍스트 없이 아래 JSON 규격이어야 합니다:
{
  "title": "쇼츠 영상 제목 (한글 20자 이내)",
  "youtube_description": "유튜브 업로드용 설명 본문 (영상의 가치를 요약하고, 관련 해시태그 3~5개 포함. 스펙 나열은 지양하고 감정적 이점을 살려 작성)",
  "ad_score": 30,
  "hook_candidates": [
    "1컷에 적용할 수 있는 강력한 한글 3초 후킹 문구 후보 1 (15자 내외의 단문 + 끝에 시각적 이모지 1개 포함)",
    "후보 2", "후보 3", "후보 4", "후보 5"
  ],
  "cuts": [
    {
      "subtitle": "해당 컷에 적용할 짧고 강렬한 자막/나레이션 문장. 15자 내외의 한국어 단문으로 작성하고 끝부분에 맥락에 적합한 시각적 이모지 딱 1개 포함 (예: '방구석에서 돈 버는 비밀 👀')",
      "description": "화면 연출 및 비주얼 설명",
      "prompt": "Flux AI 이미지 생성을 위한 최고 품질의 사진사 수준 영어 프롬프트. 규격: 'Professional [style] photography, [detailed subject description], [composition & framing], [camera lens & settings], [lighting conditions], [color palette & mood], vertical 9:16 framing, highly aesthetic, commercial-grade, 8k, no text, no captions, no watermarks, clean composition, no distorted anatomy, no weird fingers' (1~3컷은 절대 상품 글자나 제품 패키지가 직접 보이지 않는 상황 및 인물 묘사를 해야 하며, 4컷은 실제 상품 또는 상품을 사용하는 사람을 멋지게 묘사할 것)",
      "searchKeyword": "스톡용 영어 키워드 (2~3단어)",
      "cameraMovement": "zoom in 또는 zoom out 또는 panning",
      "duration": 5,
      "keywords": "강조 키워드"
    }
  ]
}

[JSON 작성 중요 제한 지침]
1. 출력 JSON의 모든 문자열 값 안에서 큰따옴표(\\")를 절대 사용하지 마십시오. 필요하면 작은따옴표(') 혹은 한글 따옴표(‘, ’)를 사용하십시오.
2. 모든 문자열 값은 단일 행으로 작성하고 줄바꿈(\\n)을 절대 넣지 마십시오.
3. ad_score(광고 냄새 점수): 이 대본이 얼마나 대놓고 광고처럼 느껴지는지 0~100 사이로 평가한 정수값. 1~3컷에서 상품을 언급하거나 자랑을 하면 높게(70점 이상), 문제 제기와 공감이 자연스럽게 흘러가고 4컷에서만 제품이 등장하면 낮게(40점 이하) 매기십시오. 반드시 50점 이하가 되도록 자연스러운 스토리텔링을 하십시오.
\`;
  } else {
    systemPrompt = \`당신은 맹칠컴퍼니의 콘텐츠 기획자 에이전트(Writer)입니다.
수익화 상품인 "\${productTitle}"을 유튜브 쇼츠(9:16) 영상을 통해 매력적으로 홍보할 수 있는 4컷 구성 대본을 기획해야 합니다.
출력은 반드시 다른 텍스트 없이 아래 JSON 규격이어야 합니다:
{
  "title": "쇼츠 영상 제목 (한글 20자 이내)",
  "youtube_description": "유튜브 업로드용 설명 본문 (영상의 가치를 요약하고, 관련 해시태그 3~5개 포함)",
  "ad_score": 30,
  "hook_candidates": [
    "도입부 1컷에 적용할 수 있는 강력한 한글 3초 후킹 문구 후보 1 (15자 내외의 단문 + 끝에 시각적 이모지 1개 포함)",
    "후보 2 (15자 내외의 단문 + 끝에 시각적 이모지 1개 포함)",
    "후보 3 (15자 내외의 단문 + 끝에 시각적 이모지 1개 포함)",
    "후보 4 (15자 내외의 단문 + 끝에 시각적 이모지 1개 포함)",
    "후보 5 (15자 내외의 단문 + 끝에 시각적 이모지 1개 포함)"
  ],
  "cuts": [
    {
      "subtitle": "해당 컷에 적용할 짧고 강렬한 자막/나레이션 문장. 반드시 15자 내외의 한국어 단문으로 작성하고 끝부분에 맥락에 적합한 시각적 이모지(예: 💰, 🔥, 🚨, 👀 등)를 딱 1개 붙여 모바일 숏폼 자막 가독성과 전달력을 극대화할 것 (예: '방구석에서 돈 버는 비밀 👀')",
      "description": "화면 연출 및 비주얼 설명",
      "prompt": "Flux AI 이미지 생성을 위한 최고 품질의 사진사 수준 영어 프롬프트. 규격: 'Professional [style] photography, [detailed subject description], [composition & framing], [camera lens & settings], [lighting conditions], [color palette & mood], vertical 9:16 framing, highly aesthetic, commercial-grade, 8k, no text, no captions, no watermarks, clean composition, no distorted anatomy, no weird fingers' (인물이나 클로즈업 샷 위주로 자막과 직결되는 핵심 비주얼을 정밀 묘사하고 절대 글자가 렌더링되지 않게 할 것)",
      "searchKeyword": "Pexels 등 스톡 사이트에서 고품질 사진을 찾기 위한 명확하고 정교한 영어 검색어 (2~3단어의 명사/형용사 조합, 예: 'laptop desk', 'smiling man', 'healthy food', 'woman writing'). 절대 텍스트나 복잡한 문장을 쓰지 말고 스톡에서 매칭 확률이 높은 핵심 단어만 사용하십시오.",
      "cameraMovement": "zoom in 또는 zoom out 또는 panning",
      "duration": 5,
      "keywords": "강조 키워드"
    }
  ]
}
주의사항: cuts 배열의 크기는 반드시 정확히 4개여야 하며, hook_candidates의 크기는 반드시 정확히 5개여야 합니다.

[JSON 작성 중요 제한 지침]
1. 출력 JSON의 모든 문자열 값 안에서 큰따옴표(\\")를 절대 사용하지 마십시오. 필요하면 작은따옴표(') 혹은 한글 따옴표(‘, ’)를 사용하십시오.
2. 모든 문자열 값은 단일 행으로 작성하고 줄바꿈(\\\\n)을 절대 넣지 마십시오.

\${selfImprovementGuidelines ? \`\\n[자기 개선 규칙 적용]\\n\${selfImprovementGuidelines}\` : ''}\`;
  }

  const response = await fetchGeminiWithRetry(
    \`https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash:generateContent?key=\${apiKey}\`,
    {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        contents: [{ parts: [{ text: \`\${systemPrompt}\\n\\n상품명: \${productTitle}\` }] }],
        generationConfig: { 
          temperature: 0.85, 
          maxOutputTokens: 8192,
          responseMimeType: "application/json"
        }
      })
    }
  );

  if (!response.ok) {
    const errorText = await response.text().catch(() => '');
    throw new Error(\`Gemini API failed: status \${response.status} \${response.statusText}. Response: \${errorText}\`);
  }

  const rawText = await response.text();
  let resJson;
  try {
    resJson = JSON.parse(rawText);
  } catch (err) {
    throw new Error(\`Failed to parse response JSON: \${err.message}. Raw: \${rawText}\`);
  }
  const text = resJson.candidates?.[0]?.content?.parts?.[0]?.text;
  if (!text) throw new Error('Empty text from Gemini');
  
  let scriptData;
  try {
    const cleaned = cleanJson(text);
    scriptData = JSON.parse(cleaned);
  } catch (err) {
    console.error('Failed to parse script JSON from Gemini:', err);
    console.log('--- RAW GEMINI RESPONSE ---');
    console.log(text);
    console.log('--- CLEANED JSON STRING ---');
    try {
      console.log(cleanJson(text));
    } catch (cleanErr) {
      console.log('Failed to clean text:', cleanErr.message);
    }
    console.log('---------------------------');
    throw err;
  }
  if (!scriptData || !Array.isArray(scriptData.cuts) || scriptData.cuts.length !== 4) {
    throw new Error('Gemini response did not contain exactly 4 cuts in the cuts array');
  }
  return scriptData;
}

async function runVisionCriticMultimodal(apiKey, imagePath, promptText, prevImagePath = null, cutIndex) {
  const currentBase64 = fs.readFileSync(imagePath).toString("base64");
  const currentPart = {
    inlineData: {
      data: currentBase64,
      mimeType: "image/jpeg"
    }
  };

  const parts = [];
  let instructions = \`당신은 쇼츠 영상의 시각적 퀄리티를 심사하는 비주얼 감사관 에이전트(Vision Critic)입니다.
제공된 이미지(9:16 비율)를 주의 깊게 분석하여 상용 광고 수준(Commercial-grade)의 완성도를 갖추었는지 평가하십시오.
칭찬하지 마십시오. 문제점과 뭉개진 부분, 왜곡된 부분을 찾아내십시오.

[검사 항목]
1. 프롬프트 일치도 (Prompt Alignment): 이미지 생성 프롬프트에 명시된 핵심 피사체, 각도, 색상이 이미지에 정확히 묘사되었는지 여부
2. 객체 정확도 (Object Accuracy): 인물의 손가락 개수 왜곡, 부자연스러운 신체 구조, 글자 렌더링 오류, 찌그러진 사물 등이 있는지 여부
3. 분위기 일치도 (Mood Alignment): 프롬프트에서 요구한 조명, 연출, 분위기와 일치하는지 여부
4. 스타일 일치도 (Style/Aesthetic Quality): 상용 광고 수준(Commercial-grade)의 우수한 품질과 미학적 완성도를 갖췄는지 여부
\`;

  if (prevImagePath && fs.existsSync(prevImagePath)) {
    const prevBase64 = fs.readFileSync(prevImagePath).toString("base64");
    parts.push({
      inlineData: {
        data: prevBase64,
        mimeType: "image/jpeg"
      }
    });
    instructions += \`\\n5. 영상 연속성 (Continuity/Consistency): 제공된 두 개의 이미지 중 첫 번째 이미지는 이전 컷(이전 장면)이고, 두 번째 이미지는 현재 장면입니다. 두 이미지 사이의 주인공 외모, 옷 스타일, 전반적인 화풍(Illustration, Photo 등)이 일관되게 연결되는지 여부\`;
  }

  instructions += \`\\n\\n[제공 정보]
- 현재 컷 번호: \${cutIndex}
- 이미지 생성 프롬프트: "\${promptText}"

출력은 다른 부연설명이나 마크다운 태그 없이 반드시 아래 규격의 JSON이어야 합니다:
{
  "score": 85,
  "feedback": "전반적으로 우수하나 인물의 오른쪽 손가락 끝부분이 약간 뭉개져 보입니다. 조명과 프롬프트 일치도는 매우 훌륭합니다."
}\`;

  parts.unshift({ text: instructions });
  parts.push(currentPart);

  try {
    const response = await fetchGeminiWithRetry(
      \`https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash:generateContent?key=\&{apiKey}\`.replace('\&', ''),
      {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          contents: [{ parts }],
          generationConfig: { 
            temperature: 0.15,
            maxOutputTokens: 8192,
            responseMimeType: "application/json"
          }
        })
      }
    );

    if (!response.ok) {
      throw new Error(\`Gemini Multimodal API call failed: \${response.statusText}\`);
    }

    const resJson = await response.json();
    const text = resJson.candidates?.[0]?.content?.parts?.[0]?.text;
    if (!text) throw new Error('Empty multimodal response from Gemini');
    
    const cleaned = text.replace(/\\\`\\\`\\\`json/g, '').replace(/\\\`\\\`\\\`/g, '').trim();
    const cleanedJson = cleanJson(cleaned);
    return JSON.parse(cleanedJson);
  } catch (e) {
    console.error(\`[Vision Critic] Multimodal evaluation failed for Cut \${cutIndex}:\`, e);
    return {
      score: 75,
      feedback: \`검사 에러로 대체됨: \${e.message}\`
    };
  }
}

`;

const fixedContent = content.substring(0, startIndex) + replacementContent + content.substring(endIndex);
fs.writeFileSync(targetPath, fixedContent, 'utf8');
console.log("Successfully fixed generateScriptWithGemini and runVisionCriticMultimodal functions!");
