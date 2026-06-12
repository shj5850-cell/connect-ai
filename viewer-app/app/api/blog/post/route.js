import { NextResponse } from 'next/server';
import fs from 'fs';
import path from 'path';

// Helper to resolve neighboring region keywords for Naver SEO density optimization
function getLocalKeywords(region) {
  const map = {
    '성동구': ['성동구청소', '왕십리입주청소', '마장동청소', '성수동사무실청소', '행당동계단청소', '금호동청소업체', '용답동준공청소'],
    '광진구': ['광진구청소', '군자동입주청소', '능동계단청소', '화양동원룸청소', '구의동사무실청소', '자양동상가청소', '송정동청소업체'],
    '군자동': ['광진구청소', '군자동입주청소', '능동계단청소', '화양동청소업체', '송정동준공청소', '구의동상가청소'],
    '능동': ['광진구청소', '능동입주청소', '군자동계단청소', '화양동사무실청소', '송정동상가청소'],
    '송정동': ['성동구청소', '송정동입주청소', '군자동계단청소', '화양동사무실청소', '광진구청소업체'],
    '화양동': ['광진구청소', '화양동원룸청소', '군자동입주청소', '능동계단청소', '자양동사무실청소']
  };

  for (const key in map) {
    if (region.includes(key)) return map[key];
  }

  // Fallback defaults
  return [
    `${region}청소`,
    `${region}입주청소`,
    `${region}사무실청소`,
    `${region}상가청소`,
    `${region}계단청소`,
    `${region}청소업체`
  ];
}

const DRAFTS_PATH = path.resolve(process.cwd(), '..', '_company', '_shared', 'blog_drafts.json');

// GET: List drafts
export async function GET() {
  try {
    let drafts = [];
    if (fs.existsSync(DRAFTS_PATH)) {
      drafts = JSON.parse(fs.readFileSync(DRAFTS_PATH, 'utf-8'));
    }
    return NextResponse.json({ success: true, drafts });
  } catch (e) {
    return NextResponse.json({ success: false, error: e.message }, { status: 500 });
  }
}

// POST: Generate a new draft
export async function POST(req) {
  try {
    const body = await req.json();
    const { category, region } = body;

    const allowedCategories = ['입주청소', '사무실청소', '계단청소', '상가청소', '준공청소'];
    if (!category || !allowedCategories.includes(category)) {
      return NextResponse.json({
        success: false,
        error: `유효하지 않은 카테고리입니다. 다음 중 하나여야 합니다: ${allowedCategories.join(', ')}`
      }, { status: 400 });
    }

    if (!region) {
      return NextResponse.json({ success: false, error: '지역 키워드가 필요합니다. (예: 성동구, 군자동 등)' }, { status: 400 });
    }

    const geminiKey = process.env.GEMINI_API_KEY || '';
    if (!geminiKey) {
      return NextResponse.json({ success: false, error: 'GEMINI_API_KEY가 설정되지 않았습니다.' }, { status: 500 });
    }

    const localKeywords = getLocalKeywords(region);

    const prompt = `당신은 대한민국 최고 수준의 로컬 서비스 마케터이자 네이버 블로그 SEO 전문가입니다.
청소 서비스 카테고리인 "${category}"에 대해 "${region}" 지역을 대상으로 고품질 상위노출 블로그 포스트를 작성해야 합니다.

다음 지침을 엄격하게 지켜주십시오:
1. SEO 최적화 제목: 클릭하고 싶게 만드는 매력적인 제목으로, "${region} ${category}" 키워드가 자연스럽게 포함되어야 합니다.
2. 본문 작성:
   - 가독성이 좋은 단문 중심 구조로 네이버 블로그 스마트에디터 스타일로 작성하십시오.
   - 본문에 지역 관련 키워드들(${localKeywords.join(', ')})이 자연스러운 맥락 속에서 각각 1~2회 이상 언급되어야 합니다.
   - 친환경 약품 사용, 꼼꼼한 고온 스팀 소독, 풍부한 현장 경험 등을 신뢰감 있게 표현하십시오.
3. FAQ: 시청자/독자가 가장 자주 묻는 질문 3가지를 구체적인 답변과 함께 구성하십시오.
4. 네이버 최적화 태그: 네이버 검색 알고리즘에 친화적인 해시태그 5~10개를 추천하십시오.
5. CTA: 신뢰감을 주며 무료 견적 문의(전화 및 카카오톡)로 이어지게 하는 강력한 전환용 끝인사(CTA)를 작성하십시오.

출력은 반드시 마크다운 등 다른 텍스트 없이 아래 JSON 스키마 규격을 충족해야 합니다:
{
  "title": "SEO 최적화 제목",
  "body": "전체 포스트 본문 텍스트 (줄바꿈 포함)",
  "faq": [
    { "question": "질문 1", "answer": "답변 1" },
    { "question": "질문 2", "answer": "답변 2" },
    { "question": "질문 3", "answer": "답변 3" }
  ],
  "naverTags": ["해시태그1", "해시태그2", "해시태그3"],
  "cta": "전환 유도 CTA 텍스트"
}`;

    const response = await fetch(
      `https://generativelanguage.googleapis.com/v1beta/models/gemini-flash-latest:generateContent?key=${geminiKey}`,
      {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          contents: [{ parts: [{ text: prompt }] }],
          generationConfig: {
            temperature: 0.3,
            maxOutputTokens: 2548,
            responseMimeType: 'application/json'
          }
        })
      }
    );

    if (!response.ok) {
      throw new Error(`Gemini API call failed: ${response.statusText}`);
    }

    const resJson = await response.json();
    const text = resJson.candidates?.[0]?.content?.parts?.[0]?.text;
    if (!text) {
      throw new Error('Gemini returned empty response for blog generation.');
    }

    const parsedContent = JSON.parse(text.replace(/```json/g, '').replace(/```/g, '').trim());

    // Save to blog_drafts.json
    let drafts = [];
    if (fs.existsSync(DRAFTS_PATH)) {
      try {
        drafts = JSON.parse(fs.readFileSync(DRAFTS_PATH, 'utf-8'));
      } catch (e) {
        console.error('Failed to parse blog_drafts.json:', e);
      }
    }

    const newDraft = {
      id: Date.now().toString(),
      category,
      region,
      created_at: new Date().toISOString(),
      status: 'pending',
      content: parsedContent
    };

    drafts.push(newDraft);
    fs.mkdirSync(path.dirname(DRAFTS_PATH), { recursive: true });
    fs.writeFileSync(DRAFTS_PATH, JSON.stringify(drafts, null, 2), 'utf-8');

    return NextResponse.json({ success: true, draft: newDraft });

  } catch (e) {
    console.error('Blog post generation error:', e);
    return NextResponse.json({ success: false, error: e.message }, { status: 500 });
  }
}

// PUT: Approve / Publish draft
export async function PUT(req) {
  try {
    const body = await req.json();
    const { id, action } = body;

    if (!id || action !== 'approve') {
      return NextResponse.json({ success: false, error: 'Missing id or invalid action' }, { status: 400 });
    }

    if (!fs.existsSync(DRAFTS_PATH)) {
      return NextResponse.json({ success: false, error: 'Drafts database not found' }, { status: 404 });
    }

    const drafts = JSON.parse(fs.readFileSync(DRAFTS_PATH, 'utf-8'));
    const itemIndex = drafts.findIndex(d => d.id === id);
    if (itemIndex === -1) {
      return NextResponse.json({ success: false, error: 'Draft not found' }, { status: 404 });
    }

    const draft = drafts[itemIndex];
    draft.status = 'published';
    draft.published_at = new Date().toISOString();

    // Naver Blog API Integration Boilerplate (Currently finalizes for copy-paste)
    /*
    async function publishToNaver(draft) {
      const client_id = process.env.NAVER_CLIENT_ID;
      const client_secret = process.env.NAVER_CLIENT_SECRET;
      // ... call Naver write API ...
    }
    */

    drafts[itemIndex] = draft;
    fs.writeFileSync(DRAFTS_PATH, JSON.stringify(drafts, null, 2), 'utf-8');

    return NextResponse.json({
      success: true,
      message: '블로그 포스팅 초안이 승인되어 발행 완료 처리되었습니다. (클립보드 복사 가능)',
      draft
    });

  } catch (e) {
    return NextResponse.json({ success: false, error: e.message }, { status: 500 });
  }
}
