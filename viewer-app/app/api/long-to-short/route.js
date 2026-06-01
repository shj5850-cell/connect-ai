import { NextResponse } from 'next/server';

const fallbackShorts = [
  {
    id: 1,
    title: "1인 기업이 무조건 망하는 이유 1가지",
    hook: "1인 기업을 시작하는 분들의 90%가 '이것' 때문에 한 달 안에 사업을 접습니다.",
    script: "[비주얼: 어두운 배경에 '90% 실패' 자막이 쾅 박힘]\n\"대부분의 초보 창업가들은 거창한 서비스 개발부터 하느라 돈과 시간을 날립니다. 진짜 영리한 1인 기업가들은 서비스 개발 전에 먼저 고객의 지갑부터 엽니다. 어떻게 하냐고요? 간단합니다...\"",
    visualCues: "비장한 배경음악, 빠른 화면 줌인, 핵심 키워드 오렌지색 자막 처리",
    estimatedDuration: "45s"
  },
  {
    id: 2,
    title: "AI 에이전트로 월 500 자동화 세팅하는 법",
    hook: "지금 보고 계시는 이 영상, 제가 아닌 제 AI 비서가 30초 만에 자동으로 기획하고 대본까지 쓴 겁니다.",
    script: "[비주얼: AI 비서가 코딩하고 기획서를 작성하는 로컬 화면 녹화본 노출]\n\"요즘 1인 기업가들은 혼자 일하지 않습니다. 트렌드 분석은 Researcher, 전략 기획은 현빈 에이전트, 스크립트 작성은 작가 에이전트가 24시간 자동으로 분담해서 처리합니다. 사장님은 그저 클릭 한 번으로 피드백만 주면 끝이죠...\"",
    visualCues: "경쾌하고 테크니컬한 BGM, 에이전트 캐릭터 아이콘 팝업 효과",
    estimatedDuration: "50s"
  },
  {
    id: 3,
    title: "개발자 없이 서비스 실체화하는 AI 치트키",
    hook: "개발자에게 수백만 원 주지 마세요. 이제 AI 코다리 에이전트가 10초 만에 실제 구동 코드를 다 짜줍니다.",
    script: "[비주얼: 코드가 자동으로 입력되는 터미널 화면 확대]\n\"코드 한 줄 쓸 줄 몰라도 괜찮습니다. 내가 만들고 싶은 아이디어를 한 줄로 적기만 하면, 백엔드 로직부터 프론트엔드 UI까지 완벽하게 완성됩니다. 검증을 빠르게 해야 진짜 돈이 되는지 알 수 있습니다...\"",
    visualCues: "빠른 템포의 편집, 주요 단어 강조 자막 흔들림 효과",
    estimatedDuration: "40s"
  }
];

export async function POST(request) {
  try {
    const { text, count } = await request.json();

    if (!text || text.trim().length < 10) {
      return NextResponse.json(
        { success: false, error: '분석할 롱폼 텍스트 또는 자막이 너무 짧습니다.' },
        { status: 400 }
      );
    }

    const apiKey = process.env.GEMINI_API_KEY;
    if (!apiKey) {
      // Return fallback when no API key
      return NextResponse.json({ success: true, shorts: fallbackShorts });
    }

    const systemPrompt = `당신은 롱폼 영상의 대본이나 긴 글(원고, 자막)을 분석하여 유튜브 쇼츠 및 인스타그램 릴스에 최적화된 몰입감 넘치는 핵심 숏폼 스크립트 ${count || 3}개로 자동 분할 및 가공해 주는 전문 숏폼 크리에이터입니다.

지침:
- 입력된 롱폼 대본의 핵심 주제를 유지하되, 각 숏폼은 30~60초 분량으로 기승전결이 명확해야 합니다.
- 각 숏폼은 시청자를 사로잡는 강력한 오프닝 훅(Opening Hook - 처음 3초)을 반드시 포함해야 합니다.
- 비주얼 연출 지시(화면 전환, 자막 효과 등)를 구체적으로 작성해 주세요.
- 반드시 한글로 작성해야 합니다.

반드시 아래와 같은 JSON 형식으로만 응답해 주세요. JSON 형식을 엄격히 지켜야 하며, 다른 설명 없이 JSON 코드만 출력하세요.
{
  "shorts": [
    {
      "id": 1,
      "title": "숏폼 제목",
      "hook": "오프닝 훅 (처음 3초 멘트)",
      "script": "비주얼 연출과 오디오 멘트가 조화된 구체적 대본 (Visual: ... / Audio: ... 형식)",
      "visualCues": "화면 연출 지시 및 자막 효과 추천",
      "estimatedDuration": "예상 시간 (예: 30s / 45s / 60s)"
    }
  ]
}`;

    const userPrompt = `${systemPrompt}\n\n아래는 변환할 오리지널 롱폼 텍스트 데이터입니다. 이를 기반으로 숏폼 스크립트 리스트를 생성해 주세요.

[롱폼 텍스트]
${text}`;

    // Call API
    let geminiUrl = '';
    const headers = { 'Content-Type': 'application/json' };
    let requestBody = {};

    if (apiKey.startsWith('AQ')) {
      const projectNumber = process.env.GEMINI_PROJECT_NUMBER || '773040580705';
      const region = 'us-central1';
      geminiUrl = `https://${region}-aiplatform.googleapis.com/v1/projects/${projectNumber}/locations/${region}/publishers/google/models/gemini-1.5-flash:generateContent`;
      headers['Authorization'] = `Bearer ${apiKey}`;
      requestBody = {
        contents: [{ role: 'user', parts: [{ text: userPrompt }] }],
        generationConfig: { temperature: 0.7, maxOutputTokens: 3072 }
      };
    } else {
      geminiUrl = `https://generativelanguage.googleapis.com/v1beta/models/gemini-1.5-flash:generateContent?key=${apiKey}`;
      requestBody = {
        contents: [{ parts: [{ text: userPrompt }] }],
        generationConfig: { temperature: 0.7, topP: 0.95 }
      };
    }

    const response = await fetch(geminiUrl, {
      method: 'POST',
      headers,
      body: JSON.stringify(requestBody)
    });

    let finalShorts = fallbackShorts;

    if (response.ok) {
      const resData = await response.json();
      let resText = resData.candidates?.[0]?.content?.parts?.[0]?.text;
      if (resText) {
        try {
          resText = resText.replace(/```json/g, '').replace(/```/g, '').trim();
          const parsed = JSON.parse(resText);
          if (parsed.shorts && Array.isArray(parsed.shorts)) {
            finalShorts = parsed.shorts;
          }
        } catch (e) {
          console.error('[Gemini API Parsing Error] fallback to static shorts', e);
        }
      }
    } else {
      console.error('[Gemini API Response Error] status:', response.status);
    }

    return NextResponse.json({ success: true, shorts: finalShorts });

  } catch (error) {
    console.error('[Long to Short API Error]', error);
    return NextResponse.json({ success: true, shorts: fallbackShorts });
  }
}
