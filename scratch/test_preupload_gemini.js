const fs = require('fs');
const path = require('path');

// Manually parse .env.local
const envPath = path.join(__dirname, '..', 'viewer-app', '.env.local');
let apiKey = '';
if (fs.existsSync(envPath)) {
  const envContent = fs.readFileSync(envPath, 'utf-8');
  const match = envContent.match(/GEMINI_API_KEY\s*=\s*(.+)/);
  if (match) {
    apiKey = match[1].trim().replace(/['"]/g, '');
  }
}

if (!apiKey) {
  console.error("GEMINI_API_KEY not found in .env.local");
  process.exit(1);
}

const scriptData = {
  title: "퇴근 후 딱 30분, 방구석에서 돈 버는 비밀",
  cuts: [
    {
      cutIndex: 1,
      subtitle: "퇴근 후 딱 30분, 방구석에서 돈 버는 비밀이 있습니다.",
      description: "어두운 방 안, 모던한 스탠드 조명 아래 아늑한 데스크 위 노트북 화면이 켜져 있는 구도",
      prompt: "Professional commercial photography, cozy dark room with a warm desk lamp lighting a modern laptop, screen glowing, highly aesthetic, minimalist composition, 8k",
      keywords: "방구석 부업"
    },
    {
      cutIndex: 2,
      subtitle: "특별한 기술 없이도 AI 마스터북 하나면 바로 수익 자동화가 가능합니다.",
      description: "태블릿이나 노트북 화면에 세련된 디자인의 이북(e-book) 표지가 보이는 클로즈업 뷰",
      prompt: "Professional product photography, modern tablet showing an elegant e-book cover design on a clean wooden table, shallow depth of field, soft studio lighting, f/1.8, 8k",
      keywords: "AI 마스터북"
    },
    {
      cutIndex: 3,
      subtitle: "대기업 직장인들이 남몰래 하는 AI 부업 치트키, 지금 공개합니다.",
      description: "카페 창가에서 여유롭게 커피를 마시며 미소 짓는 직장인의 클로즈업 뷰",
      prompt: "Professional lifestyle portrait, young professional smiling holding a coffee cup next to a laptop in a bright cafe, soft natural light, depth of field, 8k",
      keywords: "부업 치트키"
    },
    {
      cutIndex: 4,
      subtitle: "월 100만원 파이프라인 만드는 전자책 정보, 고정 댓글 링크를 확인하세요!",
      description: "햇살이 드는 아늑한 거실 테이블에 커피와 태블릿이 놓여 있는 모던하고 행복한 분위기",
      prompt: "Professional interior photography, bright modern living room table with coffee and tablet showing clean UI, warm morning sunlight, vertical framing, 8k",
      keywords: "고정댓글 링크"
    }
  ]
};

const productTitle = "월 100만원 수익형 전자책 템플릿";

const researcherPrompt = `당신은 쇼츠 연구소 책임자(Researcher)입니다.
당신의 목표는 영상을 만드는 것이 아니라, 제작된 영상의 구성 요소들을 철저히 데이터와 패턴 관점에서 냉철하게 평가하는 것입니다.
칭찬하지 마십시오. 문제점을 찾으십시오.
주관적 의견보다 데이터와 패턴을 우선합니다.

새로 제작된 영상의 상세 정보가 아래에 제공됩니다. 이 영상을 5가지 영역으로 평가하여 0~100점의 점수를 부여하고, 쇼츠 책임자로서의 6가지 핵심 질문에 성실히 답변하십시오.

[평가 대상 영상 정보]
- 상품명: ${productTitle}
- 영상 제목: ${scriptData.title}
- 컷별 구성:
${scriptData.cuts.map((c, idx) => `컷 ${idx + 1}:
  - 자막/나레이션: ${c.subtitle}
  - 화면 연출: ${c.description}
  - 이미지 프롬프트: ${c.prompt}
  - 연출 키워드: ${c.keywords}
`).join('\n')}

평가 기준:
1. 후킹 강도: 첫 1초, 3초, 5초 시점에 시청자가 멈출 이유가 있는지, 궁금증이 발생하는지, 감정 자극이 있는지 평가
2. 대본 분석: 내용의 이해도, 몰입도, 감정 변화, 반전 요소, 정보의 가치가 충분한지 평가
3. 장면 분석: 대본과 장면 연출의 일치도, 시각적 품질 묘사, 장면 다양성, 시선 집중도가 높은지 평가
4. 자막 분석: 모바일 최적화 가독성, 강조 표현의 적절성, 시선 유도 효과 평가
5. 사운드 분석: BGM 스타일 및 톤의 적합성, 나레이션과 자막 매칭의 자연스러움 평가

출력은 반드시 다른 부연 설명이나 마크다운 태그 없이 아래 JSON 규격이어야 합니다:
{
  "scores": {
    "hookStrength": 80,
    "scriptContent": 85,
    "sceneVisuals": 75,
    "subtitleAesthetics": 70,
    "soundDesign": 80
  },
  "evaluations": {
    "hookStrength": "후킹 평가 내용 (1~2문장)",
    "scriptContent": "대본 평가 내용 (1~2문장)",
    "sceneVisuals": "장면 평가 내용 (1~2문장)",
    "subtitleAesthetics": "자막 평가 내용 (1~2문장)",
    "soundDesign": "사운드 평가 내용 (1~2문장)"
  },
  "answers": {
    "q1_hook_stop": "왜 이 영상은 시청자가 멈출 것 같은가? (구체적인 이유 분석)",
    "q2_dropoff": "왜 이 영상에서 이탈이 발생할 것인가? (취약한 컷 및 요소 지적)",
    "q3_diff_from_viral": "인기 쇼츠와 비교했을 때 가장 큰 차이 3가지 (줄글 또는 리스트 형태로 서술)",
    "q4_must_fix": "다음 영상에서 반드시 수정해야 하는 요소 (1순위 지적)",
    "q5_expected_views": 1200,
    "q6_multiplier_10x": "조회수를 10배 올리려면 무엇을 바꿔야 하는가?"
  }
}
[JSON 작성 중요 제한 지침]
1. 출력 JSON의 모든 문자열 값 안에서 큰따옴표(")를 절대 사용하지 마십시오. 필요하면 작은따옴표(') 혹은 한글 따옴표(‘, ’)를 사용하십시오.
2. 모든 문자열 값은 단일 행으로 작성하고 줄바꿈(\\n)을 절대 넣지 마십시오.
`;

async function testGemini() {
  console.log("Sending prompt to Gemini API...");
  try {
    const response = await fetch(
      `https://generativelanguage.googleapis.com/v1beta/models/gemini-flash-latest:generateContent?key=${apiKey}`,
      {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          contents: [{ parts: [{ text: researcherPrompt }] }],
          generationConfig: { 
            temperature: 0.25,
            maxOutputTokens: 8192,
            responseMimeType: "application/json"
          }
        })
      }
    );

    console.log("Response HTTP status:", response.status);
    const rawText = await response.text();
    console.log("--- RAW RESPONSE BODY ---");
    console.log(rawText);
    console.log("--- END RAW RESPONSE BODY ---");

    const parsed = JSON.parse(rawText);
    const text = parsed.candidates?.[0]?.content?.parts?.[0]?.text;
    console.log("--- GENERATED TEXT ---");
    console.log(text);
    console.log("--- END GENERATED TEXT ---");

    // Let's run cleanJson from route.js
    function cleanJson(str) {
      if (!str) return '{}';
      
      const firstBrace = str.indexOf('{');
      const lastBrace = str.lastIndexOf('}');
      
      if (firstBrace === -1 || lastBrace === -1 || lastBrace < firstBrace) {
        const firstBracket = str.indexOf('[');
        const lastBracket = str.lastIndexOf(']');
        if (firstBracket !== -1 && lastBracket !== -1 && lastBracket > firstBracket) {
          str = str.substring(firstBracket, lastBracket + 1);
        }
      } else {
        str = str.substring(firstBrace, lastBrace + 1);
      }

      let result = '';
      let inString = false;
      let escapeNext = false;
      
      for (let i = 0; i < str.length; i++) {
        const char = str[i];
        if (escapeNext) {
          result += char;
          escapeNext = false;
          continue;
        }
        if (char === '\\') {
          result += char;
          escapeNext = true;
          continue;
        }
        if (char === '"') {
          inString = !inString;
          result += char;
          continue;
        }
        if (inString && (char === '\n' || char === '\r')) {
          result += '\\n';
          continue;
        }
        result += char;
      }
      
      let cleaned = result.trim();
      cleaned = cleaned.replace(/(^|[^\:])\/\/.*$/gm, '$1');
      cleaned = cleaned.replace(/\/\*[\s\S]*?\*\//g, '');
      cleaned = cleaned.replace(/,\s*([}\]])/g, '$1');
      return cleaned;
    }

    const cleaned = cleanJson(text);
    console.log("--- CLEANED JSON ---");
    console.log(cleaned);
    console.log("--- END CLEANED JSON ---");

    const finalParsed = JSON.parse(cleaned);
    console.log("Successfully parsed final JSON!");
    console.log(JSON.stringify(finalParsed, null, 2));

  } catch (err) {
    console.error("Test failed with error:", err);
  }
}

testGemini();
