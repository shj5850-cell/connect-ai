import { NextResponse } from 'next/server';
import path from 'path';
import fs from 'fs';

const EBOOKS_DIR = path.join(process.cwd(), 'public', 'ebooks');
const HISTORY_PATH = path.join(EBOOKS_DIR, 'ebook_history.json');

function getGeminiApiKey() {
  return process.env.GEMINI_API_KEY || '';
}

// Helper to call Gemini API
async function callGemini(prompt, responseMimeType = 'application/json') {
  const apiKey = getGeminiApiKey();
  if (!apiKey) {
    throw new Error('GEMINI_API_KEY is not configured in environment variables.');
  }

  // Using gemini-2.5-flash as the standard model for structured, fast outputs
  const url = `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash:generateContent?key=${apiKey}`;

  const response = await fetch(url, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      contents: [{ parts: [{ text: prompt }] }],
      generationConfig: {
        temperature: 0.3,
        maxOutputTokens: 8192, // large enough for detailed book chapters
        responseMimeType: responseMimeType
      }
    })
  });

  if (!response.ok) {
    const errorText = await response.text();
    throw new Error(`Gemini API error (Status ${response.status}): ${errorText}`);
  }

  const resJson = await response.json();
  const outputText = resJson.candidates?.[0]?.content?.parts?.[0]?.text;
  if (!outputText) {
    throw new Error('Received empty response from Gemini.');
  }

  return outputText;
}

// GET: Load ebook history
export async function GET() {
  try {
    if (fs.existsSync(HISTORY_PATH)) {
      const history = JSON.parse(fs.readFileSync(HISTORY_PATH, 'utf-8'));
      return NextResponse.json(history);
    }
    return NextResponse.json([]);
  } catch (e) {
    return NextResponse.json({ error: e.message }, { status: 500 });
  }
}

// POST: Handles Step 1, Step 2, Step 3, Save, and Delete
export async function POST(req) {
  try {
    const body = await req.json();
    const { action } = body;

    if (!action) {
      return NextResponse.json({ error: 'Missing action parameter.' }, { status: 400 });
    }

    // --- STEP 1: Plan & Marketability Analysis ---
    if (action === 'step1_plan') {
      const { 
        topic, targetReader, painPoint, promisedResult, 
        length, tone, salesPlatform, pricingRange, experiences, excludedContent 
      } = body;

      const prompt = `당신은 디지털 지식 창업 및 전자책 수익화 최고 권위의 비즈니스 컨설턴트입니다.
사용자가 제안한 다음 정보를 바탕으로 전자책의 기획안을 도출하고 시장성과 구매 강도를 냉철하게 분석하십시오.

[입력 정보]
- 전자책 주제: ${topic}
- 타겟 독자: ${targetReader}
- 독자가 겪는 문제: ${painPoint}
- 전자책으로 해결해줄 결과: ${promisedResult}
- 원하는 분량: ${length}
- 톤앤매너: ${tone}
- 판매 플랫폼: ${salesPlatform}
- 가격대: ${pricingRange}
- 포함할 경험/사례: ${experiences || '없음'}
- 제외할 내용: ${excludedContent || '없음'}

[분석 요구사항]
1. ebook_title_candidates: 타겟 독자의 지갑을 열게 만드는 매력적이고 구체적인 제목 후보 5개 (후킹 키워드 및 예상 매출 상승 효과 포함).
2. target_reader: 타겟 독자 재정의 및 페르소나 구체화.
3. pain_points: 독자가 겪고 있는 핵심 고통 3가지 이상.
4. promised_result: 이 책을 다 읽었을 때 독자가 얻게 될 확실하고 정량적인 결과.
5. unique_angle: 경쟁 전자책들 사이에서 살아남을 이 책만의 차별적 관점 및 포지셔닝.
6. marketability_score: 0~100점 사이의 객관적인 시장성 점수 (문제 절박성, 차별성, 실행 가능성 등을 기반으로 평가).
7. buyer_intent_score: 0~100점 사이의 구매 의도 점수 (독자가 돈을 낼 의지가 얼마나 절박한가).
8. table_of_contents: 책을 이끌어갈 최소 5개 이상의 챕터/소제목 리스트.
9. chapter_summary: 각 챕터의 기획 의도, 요약, 그리고 그 챕터를 통해 전달할 구체적 산출물(Key Deliverable).

반드시 다른 설명 없이 아래 JSON 포맷을 엄수하여 반환하십시오:
{
  "ebook_title_candidates": ["제목 후보1", "제목 후보2", "제목 후보3", "제목 후보4", "제목 후보5"],
  "target_reader": "구체적인 타겟 독자 설명",
  "pain_points": ["문제점 1", "문제점 2", "문제점 3"],
  "promised_result": "독자가 얻을 결과 설명",
  "unique_angle": "차별성 및 소구점 설명",
  "marketability_score": 85,
  "buyer_intent_score": 80,
  "table_of_contents": ["챕터 1. 제목", "챕터 2. 제목", "챕터 3. 제목", "챕터 4. 제목", "챕터 5. 제목"],
  "chapter_summary": [
    {
      "chapter_number": 1,
      "title": "챕터 1 제목",
      "summary": "이 챕터의 상세 내용 및 요약",
      "key_deliverable": "이 챕터의 핵심 산출물 및 독자 제공 가치"
    }
  ]
}`;

      const jsonOutput = await callGemini(prompt);
      const cleaned = jsonOutput.replace(/```json/g, '').replace(/```/g, '').trim();
      return NextResponse.json(JSON.parse(cleaned));
    }

    // --- STEP 2: Content Generation ---
    if (action === 'step2_content') {
      const { topic, targetReader, promisedResult, planData } = body;
      if (!planData) {
        return NextResponse.json({ error: 'Plan data (Step 1 output) is required for Step 2.' }, { status: 400 });
      }

      const prompt = `당신은 전자책 전문 집필가입니다. 사용자가 계획한 기획안을 바탕으로 전자책의 본문, 체크리스트, 템플릿을 상세하게 집필하십시오.
절대 추상적인 자기계발식 조언이나 뻔한 AI 문체, 인터넷 짜깁기 느낌의 글은 금지합니다.
독자가 당장 오늘 적용해서 수익이나 성과를 낼 수 있는 구체적이고 실전적인 정보 위주로 구성하십시오.

[기획 정보]
- 전자책 주제: ${topic}
- 타겟 독자: ${targetReader}
- 약속된 결과: ${promisedResult}
- 목차 구성: ${JSON.stringify(planData.table_of_contents)}
- 챕터별 아웃라인: ${JSON.stringify(planData.chapter_summary)}

[필수 조건]
각 챕터(chapters 배열의 각 항목)는 반드시 700자 이상의 매우 상세한 본문을 포함해야 하며, 마크다운 형식으로 작성하십시오.
각 챕터의 "content_markdown"은 반드시 다음 6가지 하위 구조를 명시적으로 포함해야 합니다:
1. 💡 핵심 설명: 해당 챕터가 다루는 핵심 개념 및 비결.
2. 📌 실전 예시: 실제로 적용된 구체적인 비즈니스 또는 상황적 실례.
3. 🛠️ 따라하기 단계: 독자가 1단계부터 따라 할 수 있는 구체적인 행동 로드맵.
4. 📋 체크리스트: 실행 완료 여부를 체크할 수 있는 항목들.
5. 📄 바로 복사해서 쓰는 템플릿: 대본, 이메일, 문서 양식, 혹은 실행에 바로 쓸 수 있는 템플릿 텍스트 제공.
6. ⚠️ 흔한 실수: 초보자가 저지르기 쉬운 실수와 이를 방지하는 방법.

또한 전자책의 실용성을 보충할 부록 정보들도 함께 채우십시오.

반드시 다른 설명 없이 아래 JSON 포맷을 엄수하여 반환하십시오:
{
  "chapters": [
    {
      "chapter_number": 1,
      "title": "챕터 1 제목",
      "content_markdown": "### 1. 💡 핵심 설명\\n...\\n### 2. 📌 실전 예시\\n...\\n### 3. 🛠️ 따라하기 단계\\n...\\n### 4. 📋 체크리스트\\n...\\n### 5. 📄 바로 복사해서 쓰는 템플릿\\n...\\n### 6. ⚠️ 흔한 실수\\n..."
    }
  ],
  "checklists": [
    {
      "title": "종합 실행 체크리스트 제목",
      "items": ["체크리스트 항목 1", "체크리스트 항목 2", "체크리스트 항목 3"]
    }
  ],
  "examples": [
    "구체적인 성공 모델 예시 1",
    "구체적인 성공 모델 예시 2"
  ],
  "worksheets": [
    "독자가 직접 빈칸을 채우며 실행하는 워크시트 질문 및 양식 1",
    "독자가 직접 빈칸을 채우며 실행하는 워크시트 질문 및 양식 2"
  ],
  "templates": [
    {
      "template_name": "핵심 템플릿 명칭",
      "description": "언제 사용하는지 가이드",
      "body_text": "실제 양식 텍스트 내용"
    }
  ],
  "action_steps": [
    "책을 덮고 당장 해야 할 행동 단계 1",
    "책을 덮고 당장 해야 할 행동 단계 2"
  ]
}`;

      const jsonOutput = await callGemini(prompt);
      const cleaned = jsonOutput.replace(/```json/g, '').replace(/```/g, '').trim();
      return NextResponse.json(JSON.parse(cleaned));
    }

    // --- STEP 3: Sales Package & Marketing Copy Generation ---
    if (action === 'step3_sales') {
      const { topic, targetReader, promisedResult, planData, contentData } = body;
      if (!planData || !contentData) {
        return NextResponse.json({ error: 'Plan and Content data are required for Step 3.' }, { status: 400 });
      }

      const prompt = `당신은 전자책 수익화 마케팅 천재입니다.
작성된 전자책의 내용을 분석하여, 크몽이나 상세페이지에서 대박을 낼 수 있는 마케팅 패키지 상품 구성을 제작하십시오.
절대 과장되거나 사기 같은 수익 보장이 아닌, 진정성 있으면서도 지갑을 열지 않을 수 없게 만드는 카피라이팅 기법을 적용하십시오.

[전자책 정보]
- 주제: ${topic}
- 타겟: ${targetReader}
- 결과: ${promisedResult}
- 목차: ${JSON.stringify(planData.table_of_contents)}
- 템플릿 리스트: ${JSON.stringify(contentData.templates?.map(t => t.template_name) || [])}

[분석 및 패키징 요구사항]
1. final_title: 이 전자책의 최종 낙점 제목.
2. subtitle: 제목을 보조하며 가치를 극대화하는 부제.
3. cover_prompt: 이미지 생성 AI(DALL-E, Midjourney 등)를 통해 전문적인 전자책 표지를 그릴 수 있는 고품질의 영어 프롬프트 (예: "Modern minimalist book cover for a business guide, clean typography...").
4. sales_page_headline: 지갑을 열게 하는 랜딩페이지 최상단 카피.
5. sales_page_body: 문제 제기 -> 공감 -> 해법 -> 템플릿 포함 사실 강조 -> 실행 촉구로 이어지는 상세페이지 전체 카피 본문 (마크다운 포맷).
6. benefits: 이 전자책을 구매해서 얻게 되는 혜택 5가지.
7. faq: 구매 고민을 덜어줄 FAQ 5개.
8. pricing_recommendation: 시장성 분석에 따른 합리적인 가격 권장 코멘트 및 근거.
9. refund_policy_text: 플랫폼 규정에 맞춘 환불 및 주의사항 규정 문구.
10. marketing_hooks: 블로그, 카페 등에 올릴 홍보용 한 줄 카피 5가지.
11. blog_promo_post: 상세한 블로그 홍보/소개글 본문 (마크다운 포맷).
12. shortform_promo_script: 인스타그램 릴스/유튜브 쇼츠 등 숏폼 홍보용 60초 대본 (화면 지시사항 [비주얼] 및 대사 포함).
13. kmong_title: 크몽 가이드라인에 맞춘 최적화된 판매 등록 제목 (예: "월 100만원 버는 청소업 고객 자동화 비결").
14. kmong_sales_page: 크몽 상세페이지 전용 가독성 높은 텍스트 소개글.
15. free_lead_magnets: 구매자 확보를 위한 '무료 미끼(Lead Magnet) 콘텐츠' 기획 3가지.
16. pricing_recommendation_details: 가격 옵션 전략 (예: 전자책 단품, 전자책 + 1:1 코칭권, 전자책 + 템플릿 모음 등 패키지화 전략).
17. buyer_personas: 이 책을 살 구체적인 구매자 가상 페르소나 3명.
18. sales_risks: 예상되는 판매 리스크 및 이를 극복할 안전장치/대책 3가지.

반드시 다른 설명 없이 아래 JSON 포맷을 엄수하여 반환하십시오:
{
  "final_title": "최종 전자책 제목",
  "subtitle": "최종 부제",
  "cover_prompt": "English image generation prompt here",
  "sales_page_headline": "랜딩페이지 헤드라인",
  "sales_page_body": "### 1. 당신은 혹시 이런 고민을 하고 계신가요?\\n...\\n### 2. 이 책이 해결해 드립니다\\n...\\n### 3. 실제 책의 템플릿 미리보기\\n...",
  "benefits": ["혜택 1", "혜택 2", "혜택 3", "혜택 4", "혜택 5"],
  "faq": [
    { "question": "질문 1", "answer": "답변 1" }
  ],
  "pricing_recommendation": "권장 가격 코멘트",
  "refund_policy_text": "환불 및 주의사항 규정",
  "marketing_hooks": ["한 줄 카피 1", "한 줄 카피 2", "한 줄 카피 3"],
  "blog_promo_post": "블로그 소개글 전체 마크다운 텍스트",
  "shortform_promo_script": "[화면: ...]\\n대사: ...",
  "kmong_title": "크몽 판매 등록용 제목",
  "kmong_sales_page": "크몽 등록용 상세 페이지 문구",
  "free_lead_magnets": ["미끼 1", "미끼 2", "미끼 3"],
  "pricing_recommendation_details": "가격 패키지 다양화 전략 및 단가",
  "buyer_personas": ["페르소나 1", "페르소나 2", "페르소나 3"],
  "sales_risks": ["리스크 및 극복 방안 1", "리스크 및 극복 방안 2"]
}`;

      const jsonOutput = await callGemini(prompt);
      const cleaned = jsonOutput.replace(/```json/g, '').replace(/```/g, '').trim();
      return NextResponse.json(JSON.parse(cleaned));
    }

    // --- SAVE: Perform Quality Verification and Write Files ---
    if (action === 'save') {
      const { topic, targetReader, planData, contentData, salesData } = body;
      if (!planData || !contentData || !salesData) {
        return NextResponse.json({ error: 'Plan, Content, and Sales data are required to save.' }, { status: 400 });
      }

      // --- QUALITY VERIFICATION ENGINE ---
      const warnings = [];
      const allContentText = contentData.chapters.map(c => c.content_markdown).join('\n');
      
      // 1. Check if content is too generic
      const genericPhrases = [
        '열심히 노력', '긍정적인 마인드', '꿈은 이루어진다', '성공할 수 있습니다', 
        '일반적인 조언', '추상적인 조언', '뻔한 이야기', '단순히 열심히', '노력하면 된다'
      ];
      const matchedGeneric = genericPhrases.filter(p => allContentText.includes(p));
      if (matchedGeneric.length > 0) {
        warnings.push(`[추상성 검사] 실전 팁 대신 다소 추상적이거나 일반론적인 표현이 발견되었습니다: [${matchedGeneric.join(', ')}]`);
      }
      if (allContentText.length < 3000) {
        warnings.push(`[분량 검사] 전자책 본문의 글자 수(약 ${allContentText.length}자)가 너무 짧아 독자가 느끼기에 짜깁기처럼 보일 우려가 있습니다.`);
      }

      // 2. Check if actionable steps are present
      let hasActionSteps = contentData.action_steps && contentData.action_steps.length > 0;
      if (!hasActionSteps) {
        warnings.push('[실행성 검사] 독자가 책을 덮고 당장 실행할 수 있는 종합 행동 로드맵(Action Steps)이 누락되었습니다.');
      }
      contentData.chapters.forEach((c, idx) => {
        const markdown = c.content_markdown || '';
        const hasRoadmap = markdown.includes('따라하기 단계') || markdown.includes('실행 로드맵') || markdown.includes('단계별');
        if (!hasRoadmap) {
          warnings.push(`[실행성 검사] 챕터 ${idx + 1} (${c.title})에 구체적인 '따라하기 단계'나 '실행 로드맵'이 명시되지 않았습니다.`);
        }
      });

      // 3. Check if templates are included
      let hasTemplates = contentData.templates && contentData.templates.length > 0;
      if (!hasTemplates) {
        warnings.push('[템플릿 검사] 전자책 패키지에 즉시 복사해서 쓸 수 있는 실전 템플릿(문서 양식/스크립트)이 제공되지 않았습니다.');
      }
      contentData.chapters.forEach((c, idx) => {
        const markdown = c.content_markdown || '';
        if (!markdown.includes('템플릿') && !markdown.includes('바로 복사해서 쓰는')) {
          warnings.push(`[템플릿 검사] 챕터 ${idx + 1} (${c.title})에 바로 복사해서 사용하는 '템플릿/양식'이 누적되지 않았습니다.`);
        }
      });

      // 4. Check if sales page copy is present
      if (!salesData.sales_page_body || salesData.sales_page_body.length < 300) {
        warnings.push('[상세페이지 검사] 판매용 상세페이지 랜딩 카피의 본문 글자 수가 300자 미만이거나 비어 있어 판매 등록에 부적합합니다.');
      }
      if (!salesData.kmong_sales_page || salesData.kmong_sales_page.length < 150) {
        warnings.push('[상세페이지 검사] 크몽 등록용 상세페이지 소개글(kmong_sales_page)이 비어 있거나 너무 짧습니다.');
      }

      // 5. Check for exaggerated revenue claims
      const hypePhrases = [
        '무조건 부자', '하루 10분 월 1000', '100% 수익 보장', '무조건 성공 보장', 
        '가만히 있어도 돈이 들어오는', '무조건 돈 버는', '일하지 않고 돈 버는', '100% 성공'
      ];
      const matchedHype = hypePhrases.filter(p => allContentText.includes(p) || (salesData.sales_page_body && salesData.sales_page_body.includes(p)) || (salesData.kmong_sales_page && salesData.kmong_sales_page.includes(p)));
      if (matchedHype.length > 0) {
        warnings.push(`[과장 소구 검사] 허위/과장 수익 보장 또는 불로소득 유도 문구가 검출되었습니다: [${matchedHype.join(', ')}]`);
      }

      // 6. Check for absolute legal/medical/investment claims
      const absoluteClaims = [
        '완치됩니다', '치료된다', '무조건 오른다', '합법적으로 세금을 0원', '무조건 비과세',
        '법적 책임 없음', '의학적으로 증명', '무조건 세금 감면'
      ];
      const matchedAbsolute = absoluteClaims.filter(p => allContentText.includes(p) || (salesData.sales_page_body && salesData.sales_page_body.includes(p)) || (salesData.kmong_sales_page && salesData.kmong_sales_page.includes(p)));
      if (matchedAbsolute.length > 0) {
        warnings.push(`[법률/의학/투자 검사] 지나치게 단정적이거나 오해 소지가 있는 법률/의학/투자 단정적 표현이 검출되었습니다: [${matchedAbsolute.join(', ')}]`);
      }

      // Generate Unique ID & folders
      const id = Date.now().toString();
      const ebookFolder = path.join(EBOOKS_DIR, id);
      fs.mkdirSync(ebookFolder, { recursive: true });

      // Save File 1: ebook.json
      const fullPayload = { id, topic, targetReader, planData, contentData, salesData, warnings, created_at: new Date().toISOString() };
      fs.writeFileSync(path.join(ebookFolder, 'ebook.json'), JSON.stringify(fullPayload, null, 2), 'utf-8');

      // Save File 2: ebook.md (PDF-ready layout)
      let ebookMd = `# 📘 ${salesData.final_title}\n\n`;
      ebookMd += `> **${salesData.subtitle}**\n\n`;
      ebookMd += `---\n\n`;
      ebookMd += `## 🧭 책머리에\n\n`;
      ebookMd += `- **타겟 독자**: ${targetReader}\n`;
      ebookMd += `- **약속된 해결 결과**: ${promisedResult}\n`;
      ebookMd += `- **기획 차별성 (Unique Angle)**: ${planData.unique_angle}\n\n`;
      ebookMd += `---\n\n`;
      ebookMd += `## 📋 목차\n\n`;
      planData.table_of_contents.forEach((chapter, idx) => {
        ebookMd += `${idx + 1}. ${chapter}\n`;
      });
      ebookMd += `\n---\n\n`;

      contentData.chapters.forEach((c) => {
        ebookMd += `## 📖 챕터 ${c.chapter_number}. ${c.title}\n\n`;
        ebookMd += `${c.content_markdown}\n\n`;
        ebookMd += `---\n\n`;
      });

      ebookMd += `## 📋 실행용 종합 체크리스트\n\n`;
      contentData.checklists?.forEach((list) => {
        ebookMd += `### ${list.title}\n\n`;
        list.items?.forEach(item => {
          ebookMd += `- [ ] ${item}\n`;
        });
        ebookMd += `\n`;
      });
      ebookMd += `---\n\n`;

      ebookMd += `## 📄 제공 템플릿 모음\n\n`;
      contentData.templates?.forEach((tpl) => {
        ebookMd += `### 템플릿: ${tpl.template_name}\n\n`;
        ebookMd += `*설명: ${tpl.description}*\n\n`;
        ebookMd += `\`\`\`text\n${tpl.body_text}\n\`\`\`\n\n`;
      });
      ebookMd += `---\n\n`;

      ebookMd += `## 🛠️ 바로 실행하는 단계별 로드맵 (Action Steps)\n\n`;
      contentData.action_steps?.forEach((step, idx) => {
        ebookMd += `${idx + 1}. ${step}\n`;
      });

      fs.writeFileSync(path.join(ebookFolder, 'ebook.md'), ebookMd, 'utf-8');

      // Save File 3: sales_page.md
      let salesMd = `# 💰 ${salesData.final_title} 판매 패키지 문서\n\n`;
      salesMd += `## [크몽 등록 제목]\n`;
      salesMd += `> **${salesData.kmong_title}**\n\n`;
      salesMd += `---\n\n`;
      salesMd += `## [랜딩페이지 헤드라인]\n`;
      salesMd += `# ${salesData.sales_page_headline}\n\n`;
      salesMd += `---\n\n`;
      salesMd += `## [권장 판매 가격]\n`;
      salesMd += `* ${salesData.pricing_recommendation}\n`;
      salesMd += `* 가격 전략: ${salesData.pricing_recommendation_details}\n\n`;
      salesMd += `---\n\n`;
      salesMd += `## [구매 혜택 (Benefits)]\n`;
      salesData.benefits?.forEach(b => { salesMd += `- ${b}\n`; });
      salesMd += `\n---\n\n`;
      salesMd += `## [상세페이지 본문]\n\n`;
      salesMd += `${salesData.sales_page_body}\n\n`;
      salesMd += `---\n\n`;
      salesMd += `## [크몽 전용 텍스트 상세소개]\n\n`;
      salesMd += `${salesData.kmong_sales_page}\n\n`;
      salesMd += `---\n\n`;
      salesMd += `## [구매자 페르소나]\n`;
      salesData.buyer_personas?.forEach(p => { salesMd += `* ${p}\n`; });
      salesMd += `\n---\n\n`;
      salesMd += `## [판매 리스크 및 예방책]\n`;
      salesData.sales_risks?.forEach(r => { salesMd += `* ${r}\n`; });
      salesMd += `\n---\n\n`;
      salesMd += `## [환불 및 주의사항 규정]\n`;
      salesMd += `${salesData.refund_policy_text}\n\n`;
      salesMd += `---\n\n`;
      salesMd += `## [자주 묻는 질문 FAQ]\n\n`;
      salesData.faq?.forEach(f => {
        salesMd += `**Q. ${f.question}**\n`;
        salesMd += `A. ${f.answer}\n\n`;
      });

      fs.writeFileSync(path.join(ebookFolder, 'sales_page.md'), salesMd, 'utf-8');

      // Save File 4: promo_scripts.md
      let promoMd = `# 📣 전자책 바이럴 및 마케팅 홍보 리소스\n\n`;
      promoMd += `## 1. 블로그/카페 홍보 소개글\n\n`;
      promoMd += `${salesData.blog_promo_post}\n\n`;
      promoMd += `---\n\n`;
      promoMd += `## 2. 숏폼 영상 (인스타 릴스 / 유튜브 쇼츠) 60초 대본\n\n`;
      promoMd += `${salesData.shortform_promo_script}\n\n`;
      promoMd += `---\n\n`;
      promoMd += `## 3. SNS 한 줄 카피 훅 (Marketing Hooks)\n\n`;
      salesData.marketing_hooks?.forEach(h => { promoMd += `* ${h}\n`; });
      promoMd += `\n---\n\n`;
      promoMd += `## 4. 무료 미끼(Lead Magnet) 콘텐츠 기획안\n\n`;
      salesData.free_lead_magnets?.forEach(m => { promoMd += `* ${m}\n`; });

      fs.writeFileSync(path.join(ebookFolder, 'promo_scripts.md'), promoMd, 'utf-8');

      // Save File 5: cover_prompt.txt
      fs.writeFileSync(path.join(ebookFolder, 'cover_prompt.txt'), salesData.cover_prompt, 'utf-8');

      // Save File 6: README.md
      const readmeText = `# AI 전자책 생성 패키지 - ${salesData.final_title}

본 폴더는 AI 전자책 뚝딱 생성기가 생성한 **판매용 디지털 상품 완제품 패키지**입니다.

## 파일 구성
1. [ebook.md](ebook.md): 본문, 목차, 실행 템플릿, 체크리스트를 포함한 전자책 마크다운 (PDF 변환 최적화).
2. [sales_page.md](sales_page.md): 크몽 등록 제목, 가격 추천, 상세페이지 카피, 환불 규정 포함.
3. [promo_scripts.md](promo_scripts.md): 블로그 소개글, 60초 숏폼 홍보 영상 대본, 미끼 콘텐츠 기획.
4. [cover_prompt.txt](cover_prompt.txt): AI 표지 디자이너를 위한 골든 프롬프트.
5. [ebook.json](ebook.json): 기획/시장성 점수와 원본 데이터가 통합된 JSON 파일.

## 판매 등록 가이드
- **표지 제작**: [cover_prompt.txt](cover_prompt.txt)의 프롬프트를 복사하여 Midjourney나 Pollinations AI에 주입하여 표지를 만드세요.
- **전자책 PDF 변환**: VS Code의 Markdown PDF 확장 등을 사용해 [ebook.md](ebook.md)를 깔끔한 PDF로 인쇄/변환하여 바로 상품으로 등록할 수 있습니다.
- **상세페이지**: [sales_page.md](sales_page.md)의 크몽용 텍스트나 상세페이지 카피를 그대로 크몽/블로그에 붙여넣어 판매를 개시하세요.
`;
      fs.writeFileSync(path.join(ebookFolder, 'README.md'), readmeText, 'utf-8');

      // Update History JSON
      let history = [];
      if (fs.existsSync(HISTORY_PATH)) {
        try {
          history = JSON.parse(fs.readFileSync(HISTORY_PATH, 'utf-8'));
        } catch (e) {
          console.error('Failed to parse history JSON, resetting:', e);
        }
      }

      const historyEntry = {
        id,
        title: salesData.final_title,
        topic,
        target_reader: targetReader,
        marketability_score: planData.marketability_score,
        buyer_intent_score: planData.buyer_intent_score,
        created_at: new Date().toISOString(),
        files: {
          ebook_md: `/ebooks/${id}/ebook.md`,
          ebook_json: `/ebooks/${id}/ebook.json`,
          sales_page_md: `/ebooks/${id}/sales_page.md`,
          promo_scripts_md: `/ebooks/${id}/promo_scripts.md`,
          cover_prompt_txt: `/ebooks/${id}/cover_prompt.txt`,
          readme_md: `/ebooks/${id}/README.md`
        },
        warnings: warnings,
        status: warnings.length > 0 ? 'completed_with_warnings' : 'completed'
      };

      history.unshift(historyEntry); // newer first
      fs.writeFileSync(HISTORY_PATH, JSON.stringify(history, null, 2), 'utf-8');

      return NextResponse.json({ success: true, id, warnings, files: historyEntry.files });
    }

    // --- DELETE: Clear files and sweep history ---
    if (action === 'delete') {
      const { id } = body;
      if (!id) {
        return NextResponse.json({ error: 'Missing ID parameter.' }, { status: 400 });
      }

      // Remove physical folder
      const ebookFolder = path.join(EBOOKS_DIR, id);
      if (fs.existsSync(ebookFolder)) {
        try {
          const files = fs.readdirSync(ebookFolder);
          files.forEach(f => fs.unlinkSync(path.join(ebookFolder, f)));
          fs.rmdirSync(ebookFolder);
        } catch (err) {
          console.error(`Failed to delete files for ebook ${id}:`, err);
        }
      }

      // Update history list
      if (fs.existsSync(HISTORY_PATH)) {
        let history = JSON.parse(fs.readFileSync(HISTORY_PATH, 'utf-8') || '[]');
        history = history.filter(item => item.id !== id);
        fs.writeFileSync(HISTORY_PATH, JSON.stringify(history, null, 2), 'utf-8');
      }

      return NextResponse.json({ success: true, id });
    }

    return NextResponse.json({ error: 'Invalid action parameter.' }, { status: 400 });

  } catch (e) {
    console.error('[E-book API Route] Error:', e);
    return NextResponse.json({ error: e.message }, { status: 500 });
  }
}
