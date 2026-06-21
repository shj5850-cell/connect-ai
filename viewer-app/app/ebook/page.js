'use client';

import { useState } from 'react';
import Link from 'next/link';
import { 
  ArrowLeft, BookOpen, Loader2, Sparkles, AlertTriangle, 
  CheckCircle, FileText, Download, Copy, Eye, HelpCircle, ShoppingCart 
} from 'lucide-react';

export default function EbookGeneratorPage() {
  // Input fields
  const [topic, setTopic] = useState('');
  const [targetReader, setTargetReader] = useState('');
  const [painPoint, setPainPoint] = useState('');
  const [promisedResult, setPromisedResult] = useState('');
  const [length, setLength] = useState('30~50페이지');
  const [tone, setTone] = useState('신뢰감 있고 전문적인 톤');
  const [salesPlatform, setSalesPlatform] = useState('크몽');
  const [pricingRange, setPricingRange] = useState('10,000원 ~ 30,000원');
  const [experiences, setExperiences] = useState('');
  const [excludedContent, setExcludedContent] = useState('');

  // Pipeline execution state
  const [status, setStatus] = useState('idle'); // idle, plan, content, sales, save, done, error
  const [errorMessage, setErrorMessage] = useState('');
  const [warnings, setWarnings] = useState([]);

  // Generated datasets
  const [planData, setPlanData] = useState(null);
  const [contentData, setContentData] = useState(null);
  const [salesData, setSalesData] = useState(null);
  const [savedId, setSavedId] = useState('');

  // Active view tab
  const [activeTab, setActiveTab] = useState('plan'); // plan, content, sales, promo, cover

  // Clipboard copies
  const [copied, setCopied] = useState(false);

  const handleCopyText = (text) => {
    navigator.clipboard.writeText(text);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  // Trigger file download helper
  const handleDownload = (filename, content, mimeType = 'text/markdown') => {
    const blob = new Blob([content], { type: mimeType });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = filename;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  };

  // Master execution logic
  const handleGenerateEbook = async () => {
    if (!topic || !targetReader || !painPoint || !promisedResult) {
      alert('필수 입력 폼(주제, 타겟 독자, 겪는 문제, 해결 결과)을 모두 입력해 주세요.');
      return;
    }

    setStatus('plan');
    setErrorMessage('');
    setWarnings([]);
    setPlanData(null);
    setContentData(null);
    setSalesData(null);

    let plan = null;
    let content = null;
    let sales = null;

    try {
      // Step 1: Marketability & Planning API
      const planRes = await fetch('/api/ebook', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          action: 'step1_plan',
          topic, targetReader, painPoint, promisedResult,
          length, tone, salesPlatform, pricingRange, experiences, excludedContent
        })
      });

      if (!planRes.ok) {
        const err = await planRes.json();
        throw new Error(err.error || '시장성 분석 및 기획안 생성에 실패했습니다.');
      }
      plan = await planRes.json();
      setPlanData(plan);

      // Step 2: Content Writing API
      setStatus('content');
      const contentRes = await fetch('/api/ebook', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          action: 'step2_content',
          topic, targetReader, promisedResult,
          planData: plan
        })
      });

      if (!contentRes.ok) {
        const err = await contentRes.json();
        throw new Error(err.error || '전자책 본문 집필 중에 오류가 발생했습니다.');
      }
      content = await contentRes.json();
      setContentData(content);

      // Step 3: Sales Package Copy API
      setStatus('sales');
      const salesRes = await fetch('/api/ebook', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          action: 'step3_sales',
          topic, targetReader, promisedResult,
          planData: plan,
          contentData: content
        })
      });

      if (!salesRes.ok) {
        const err = await salesRes.json();
        throw new Error(err.error || '판매 패키지 마케팅 문구 생성 중에 오류가 발생했습니다.');
      }
      sales = await salesRes.json();
      setSalesData(sales);

      // Save & Validate
      setStatus('save');
      const saveRes = await fetch('/api/ebook', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          action: 'save',
          topic, targetReader,
          planData: plan,
          contentData: content,
          salesData: sales
        })
      });

      if (!saveRes.ok) {
        const err = await saveRes.json();
        throw new Error(err.error || '파일 저장 및 자가검수 과정에서 오류가 발생했습니다.');
      }
      const saveOutput = await saveRes.json();
      setSavedId(saveOutput.id);
      setWarnings(saveOutput.warnings || []);
      setStatus('done');
    } catch (e) {
      console.error(e);
      setErrorMessage(e.message);
      setStatus('error');
    }
  };

  // Compile Download Raw Text
  const buildEbookMdText = () => {
    if (!planData || !contentData || !salesData) return '';
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
    return ebookMd;
  };

  const buildSalesPageMdText = () => {
    if (!salesData) return '';
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
    return salesMd;
  };

  const buildPromoScriptsMdText = () => {
    if (!salesData) return '';
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
    return promoMd;
  };

  return (
    <div className="container" style={{ maxWidth: '1200px', padding: '2rem' }}>
      
      {/* Header */}
      <header style={{ marginBottom: '2.5rem', display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '1rem' }}>
          <Link href="/" style={{ display: 'inline-flex', alignItems: 'center', gap: '0.5rem', color: 'var(--text-primary)', width: 'fit-content' }} className="btn-secondary btn">
            <ArrowLeft size={16} /> 대시보드로 돌아가기
          </Link>
          <Link href="/ebook/archive" className="btn btn-secondary" style={{ display: 'inline-flex', alignItems: 'center', gap: '0.5rem' }}>
            <Eye size={16} /> 생성된 전자책 보관함 가기
          </Link>
        </div>
        <h1 className="title gradient-text" style={{ fontSize: '2.2rem', margin: '1rem 0 0 0', display: 'flex', alignItems: 'center', gap: '0.6rem' }}>
          <BookOpen size={30} color="#fb7185" style={{ filter: 'drop-shadow(0 0 8px rgba(251,113,133,0.4))' }} />
          <span>AI 전자책 뚝딱 생성기 (E-book Autopilot)</span>
        </h1>
        <p style={{ color: 'var(--text-secondary)', margin: 0, fontSize: '0.95rem' }}>
          단순한 에세이 글쓰기가 아닌, 시장성 검증부터 챕터별 실전 템플릿 작성, 판매 상세페이지와 홍보 마케팅 대본까지 한 번에 완성하는 <strong>수익성 중심 디지털 상품 자동 출판 엔진</strong>입니다.
        </p>
      </header>

      {/* Main Grid */}
      <div style={{ display: 'grid', gridTemplateColumns: status === 'idle' || status === 'error' ? '1fr' : '1fr 2fr', gap: '2rem', alignItems: 'start' }}>
        
        {/* Form Container */}
        {(status === 'idle' || status === 'error' || status === 'plan' || status === 'content' || status === 'sales' || status === 'save') && (
          <div className="glass-panel" style={{ padding: '2rem', display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>
            <h3 style={{ color: '#fff', fontSize: '1.15rem', borderBottom: '1px solid var(--border-color)', paddingBottom: '0.75rem', margin: 0, display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
              <Sparkles size={18} color="#fb7185" />
              <span>전자책 상품 기획 입력 폼</span>
            </h3>

            {/* Error Message */}
            {status === 'error' && (
              <div style={{ background: 'rgba(239,68,68,0.1)', border: '1px solid #ef4444', color: '#f87171', padding: '0.75rem', borderRadius: '6px', fontSize: '0.85rem', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                <AlertTriangle size={16} />
                <span>{errorMessage}</span>
              </div>
            )}

            {/* Inputs */}
            <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
              
              <div>
                <label style={{ display: 'block', fontSize: '0.8rem', color: 'white', marginBottom: '0.3rem', fontWeight: 'bold' }}>전자책 주제 *</label>
                <input 
                  type="text"
                  placeholder="예: 청소업 초보자를 위한 월 100만원 고객 확보 자동화 가이드"
                  value={topic}
                  onChange={(e) => setTopic(e.target.value)}
                  disabled={status !== 'idle' && status !== 'error'}
                  style={{ width: '100%', padding: '0.6rem', background: 'rgba(0,0,0,0.3)', border: '1px solid var(--border-color)', borderRadius: '6px', color: '#fff', fontSize: '0.85rem' }}
                />
              </div>

              <div>
                <label style={{ display: 'block', fontSize: '0.8rem', color: 'white', marginBottom: '0.3rem', fontWeight: 'bold' }}>타겟 독자 *</label>
                <input 
                  type="text"
                  placeholder="예: 청소업을 막 시작한 1인 사장"
                  value={targetReader}
                  onChange={(e) => setTargetReader(e.target.value)}
                  disabled={status !== 'idle' && status !== 'error'}
                  style={{ width: '100%', padding: '0.6rem', background: 'rgba(0,0,0,0.3)', border: '1px solid var(--border-color)', borderRadius: '6px', color: '#fff', fontSize: '0.85rem' }}
                />
              </div>

              <div>
                <label style={{ display: 'block', fontSize: '0.8rem', color: 'white', marginBottom: '0.3rem', fontWeight: 'bold' }}>독자가 겪고 있는 아픈 고통(Pain Point) *</label>
                <input 
                  type="text"
                  placeholder="예: 인스타/블로그 등 마케팅 방법을 몰라 고객 문의가 전혀 안 옴"
                  value={painPoint}
                  onChange={(e) => setPainPoint(e.target.value)}
                  disabled={status !== 'idle' && status !== 'error'}
                  style={{ width: '100%', padding: '0.6rem', background: 'rgba(0,0,0,0.3)', border: '1px solid var(--border-color)', borderRadius: '6px', color: '#fff', fontSize: '0.85rem' }}
                />
              </div>

              <div>
                <label style={{ display: 'block', fontSize: '0.8rem', color: 'white', marginBottom: '0.3rem', fontWeight: 'bold' }}>이 책을 통해 얻을 구체적 결과(Promised Result) *</label>
                <input 
                  type="text"
                  placeholder="예: 한 달 내에 네이버 지역 키워드로 매일 1건 이상 문의가 오는 자동화 파이프라인 구축"
                  value={promisedResult}
                  onChange={(e) => setPromisedResult(e.target.value)}
                  disabled={status !== 'idle' && status !== 'error'}
                  style={{ width: '100%', padding: '0.6rem', background: 'rgba(0,0,0,0.3)', border: '1px solid var(--border-color)', borderRadius: '6px', color: '#fff', fontSize: '0.85rem' }}
                />
              </div>

              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem' }}>
                <div>
                  <label style={{ display: 'block', fontSize: '0.8rem', color: 'white', marginBottom: '0.3rem', fontWeight: 'bold' }}>원하는 전자책 분량</label>
                  <select 
                    value={length}
                    onChange={(e) => setLength(e.target.value)}
                    disabled={status !== 'idle' && status !== 'error'}
                    style={{ width: '100%', padding: '0.6rem', background: '#13161c', border: '1px solid var(--border-color)', borderRadius: '6px', color: '#fff', fontSize: '0.85rem' }}
                  >
                    <option value="10~20페이지">10~20페이지 (핵심 집중형)</option>
                    <option value="30~50페이지">30~50페이지 (스탠다드 실전 가이드)</option>
                    <option value="50~100페이지">50~100페이지 (풀 마스터 코스)</option>
                  </select>
                </div>

                <div>
                  <label style={{ display: 'block', fontSize: '0.8rem', color: 'white', marginBottom: '0.3rem', fontWeight: 'bold' }}>톤앤매너</label>
                  <select 
                    value={tone}
                    onChange={(e) => setTone(e.target.value)}
                    disabled={status !== 'idle' && status !== 'error'}
                    style={{ width: '100%', padding: '0.6rem', background: '#13161c', border: '1px solid var(--border-color)', borderRadius: '6px', color: '#fff', fontSize: '0.85rem' }}
                  >
                    <option value="신뢰감 있고 전문적인 톤">신뢰감 있고 전문적인 어조</option>
                    <option value="실용적이고 냉정하며 뼈 때리는 톤">실용적이고 냉정한 직설 어조</option>
                    <option value="친근하고 따뜻한 격려형 톤">친근하고 따뜻한 격려 어조</option>
                  </select>
                </div>
              </div>

              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem' }}>
                <div>
                  <label style={{ display: 'block', fontSize: '0.8rem', color: 'white', marginBottom: '0.3rem', fontWeight: 'bold' }}>판매 플랫폼</label>
                  <select 
                    value={salesPlatform}
                    onChange={(e) => setSalesPlatform(e.target.value)}
                    disabled={status !== 'idle' && status !== 'error'}
                    style={{ width: '100%', padding: '0.6rem', background: '#13161c', border: '1px solid var(--border-color)', borderRadius: '6px', color: '#fff', fontSize: '0.85rem' }}
                  >
                    <option value="크몽">크몽 (KMONG)</option>
                    <option value="탈잉">탈잉 (Taling)</option>
                    <option value="클래스101">클래스101</option>
                    <option value="네이버 블로그">네이버 블로그 홍보 판매</option>
                    <option value="PDF 직접 판매">개인 홈페이지/메일 직접 판매</option>
                  </select>
                </div>

                <div>
                  <label style={{ display: 'block', fontSize: '0.8rem', color: 'white', marginBottom: '0.3rem', fontWeight: 'bold' }}>희망 가격대</label>
                  <select 
                    value={pricingRange}
                    onChange={(e) => setPricingRange(e.target.value)}
                    disabled={status !== 'idle' && status !== 'error'}
                    style={{ width: '100%', padding: '0.6rem', background: '#13161c', border: '1px solid var(--border-color)', borderRadius: '6px', color: '#fff', fontSize: '0.85rem' }}
                  >
                    <option value="9,900원">9,900원 (미끼/저단가)</option>
                    <option value="19,000원 ~ 29,000원">19,000원 ~ 29,000원 (가성비 실전)</option>
                    <option value="49,000원 ~ 99,000원">49,000원 ~ 99,000원 (전문 솔루션)</option>
                  </select>
                </div>
              </div>

              <div>
                <label style={{ display: 'block', fontSize: '0.8rem', color: 'white', marginBottom: '0.3rem', fontWeight: 'bold' }}>포함할 경험/사례 (선택)</label>
                <textarea 
                  rows={2}
                  placeholder="예: 청소업 1개월 차에 직장인 시절 월급 넘긴 비법, 실제 고객 응대 스크립트 등"
                  value={experiences}
                  onChange={(e) => setExperiences(e.target.value)}
                  disabled={status !== 'idle' && status !== 'error'}
                  style={{ width: '100%', padding: '0.6rem', background: 'rgba(0,0,0,0.3)', border: '1px solid var(--border-color)', borderRadius: '6px', color: '#fff', fontSize: '0.8rem', resize: 'vertical' }}
                />
              </div>

              <div>
                <label style={{ display: 'block', fontSize: '0.8rem', color: 'white', marginBottom: '0.3rem', fontWeight: 'bold' }}>제외할 내용 (선택)</label>
                <textarea 
                  rows={2}
                  placeholder="예: 동업 금지 조항에 어긋나는 법인 설립 절차, 세무 기장 상세 등 복잡한 전문 지식"
                  value={excludedContent}
                  onChange={(e) => setExcludedContent(e.target.value)}
                  disabled={status !== 'idle' && status !== 'error'}
                  style={{ width: '100%', padding: '0.6rem', background: 'rgba(0,0,0,0.3)', border: '1px solid var(--border-color)', borderRadius: '6px', color: '#fff', fontSize: '0.8rem', resize: 'vertical' }}
                />
              </div>

            </div>

            {/* Trigger Button */}
            {status === 'idle' || status === 'error' ? (
              <button 
                onClick={handleGenerateEbook}
                className="btn"
                style={{ 
                  padding: '1rem', 
                  fontSize: '1rem', 
                  fontWeight: 'bold', 
                  background: 'linear-gradient(135deg, #fb7185 0%, #a78bfa 100%)', 
                  boxShadow: '0 0 15px rgba(251,113,133,0.3)' 
                }}
              >
                🚀 전자책 패키지 자동 생성 시작
              </button>
            ) : (
              <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem', background: 'rgba(255,255,255,0.02)', padding: '1.25rem', borderRadius: '10px', border: '1px solid rgba(255,255,255,0.05)' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '0.6rem', color: '#fff', fontWeight: 'bold' }}>
                  <Loader2 className="animate-spin" size={18} color="#fb7185" />
                  <span>
                    {status === 'plan' && '1단계: 시장성 평가 및 목차 기획안 도출 중...'}
                    {status === 'content' && '2단계: 챕터별 실전 가이드 및 템플릿 집필 중 (약 30초)...'}
                    {status === 'sales' && '3단계: 상세페이지 카피 및 마케팅 대본 기획 중...'}
                    {status === 'save' && '4단계: 파일 저장 및 품질 정책 자가 검수 진행 중...'}
                  </span>
                </div>
                <div style={{ width: '100%', height: '4px', background: 'rgba(255,255,255,0.05)', borderRadius: '2px', overflow: 'hidden' }}>
                  <div style={{ 
                    height: '100%', 
                    background: 'linear-gradient(90deg, #fb7185, #a78bfa)', 
                    borderRadius: '2px',
                    width: 
                      status === 'plan' ? '25%' :
                      status === 'content' ? '55%' :
                      status === 'sales' ? '80%' : '95%',
                    transition: 'width 0.5s ease'
                  }} />
                </div>
                <div style={{ fontSize: '0.75rem', color: 'var(--text-secondary)' }}>
                  Ollama/Gemini 백그라운드 엔진이 대본, 템플릿, 마케팅 패키지 완제품을 제작하고 있습니다. 창을 닫지 말고 잠시만 기다려주세요.
                </div>
              </div>
            )}

          </div>
        )}

        {/* Output Previews */}
        {(status === 'done' || planData) && (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '2rem' }}>
            
            {/* Score & Warning Badges Dashboard */}
            {planData && (
              <div className="glass-panel" style={{ padding: '1.5rem', display: 'flex', flexDirection: 'column', gap: '1.25rem' }}>
                <div style={{ display: 'flex', gap: '2rem', flexWrap: 'wrap', alignItems: 'center', justifyContent: 'space-around' }}>
                  
                  {/* Marketability Gauge */}
                  <div style={{ display: 'flex', alignItems: 'center', gap: '1rem' }}>
                    <div style={{ position: 'relative', width: '80px', height: '80px', borderRadius: '50%', background: `conic-gradient(${planData.marketability_score >= 85 ? '#10b981' : (planData.marketability_score < 70 ? '#ef4444' : '#f59e0b')} ${planData.marketability_score}%, rgba(255,255,255,0.05) 0%)`, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                      <div style={{ width: '68px', height: '68px', borderRadius: '50%', background: '#13161c', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center' }}>
                        <span style={{ fontSize: '1.2rem', fontWeight: 'bold', color: 'white' }}>{planData.marketability_score}</span>
                        <span style={{ fontSize: '0.6rem', color: 'var(--text-secondary)' }}>시장성 지수</span>
                      </div>
                    </div>
                    <div>
                      <h4 style={{ color: 'white', margin: 0, fontSize: '0.95rem', fontWeight: 'bold' }}>시장성 지수 (Marketability)</h4>
                      <p style={{ margin: 0, fontSize: '0.8rem', color: 'var(--text-secondary)', marginTop: '0.2rem' }}>독자의 갈증 해소 및 차별성 지표</p>
                      
                      {/* Badge according to rules */}
                      {planData.marketability_score >= 85 ? (
                        <span style={{ display: 'inline-block', fontSize: '0.7rem', color: '#10b981', background: 'rgba(16,185,129,0.1)', padding: '0.2rem 0.5rem', borderRadius: '4px', marginTop: '0.4rem', fontWeight: 'bold' }}>
                          ✨ 우선 제작 추천
                        </span>
                      ) : planData.marketability_score < 70 ? (
                        <span style={{ display: 'inline-block', fontSize: '0.7rem', color: '#ef4444', background: 'rgba(239,68,68,0.1)', padding: '0.2rem 0.5rem', borderRadius: '4px', marginTop: '0.4rem', fontWeight: 'bold' }}>
                          ⚠️ 판매 가능성이 낮습니다. 주제나 타겟을 더 구체화하세요.
                        </span>
                      ) : (
                        <span style={{ display: 'inline-block', fontSize: '0.7rem', color: '#f59e0b', background: 'rgba(245,158,11,0.1)', padding: '0.2rem 0.5rem', borderRadius: '4px', marginTop: '0.4rem', fontWeight: 'bold' }}>
                          ⚖️ 스탠다드 등급 (보완 후 제작 권장)
                        </span>
                      )}
                    </div>
                  </div>

                  {/* Buyer Intent Gauge */}
                  <div style={{ display: 'flex', alignItems: 'center', gap: '1rem' }}>
                    <div style={{ position: 'relative', width: '80px', height: '80px', borderRadius: '50%', background: `conic-gradient(#60a5fa ${planData.buyer_intent_score}%, rgba(255,255,255,0.05) 0%)`, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                      <div style={{ width: '68px', height: '68px', borderRadius: '50%', background: '#13161c', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center' }}>
                        <span style={{ fontSize: '1.2rem', fontWeight: 'bold', color: 'white' }}>{planData.buyer_intent_score}</span>
                        <span style={{ fontSize: '0.6rem', color: 'var(--text-secondary)' }}>구매 의도</span>
                      </div>
                    </div>
                    <div>
                      <h4 style={{ color: 'white', margin: 0, fontSize: '0.95rem', fontWeight: 'bold' }}>구매 의도 (Buyer Intent)</h4>
                      <p style={{ margin: 0, fontSize: '0.8rem', color: 'var(--text-secondary)', marginTop: '0.2rem' }}>독자가 지갑을 열 고통의 절박함</p>
                      <span style={{ display: 'inline-block', fontSize: '0.7rem', color: '#60a5fa', background: 'rgba(96,165,250,0.1)', padding: '0.2rem 0.5rem', borderRadius: '4px', marginTop: '0.4rem', fontWeight: 'bold' }}>
                        🎯 절박도: {planData.buyer_intent_score >= 80 ? '매우 높음' : '보통'}
                      </span>
                    </div>
                  </div>

                </div>

                {/* Validation Warnings */}
                {status === 'done' && (
                  <div style={{ borderTop: '1px solid var(--border-color)', paddingTop: '1rem', marginTop: '0.5rem' }}>
                    <h5 style={{ color: '#fff', fontSize: '0.85rem', fontWeight: 'bold', margin: '0 0 0.5rem 0', display: 'flex', alignItems: 'center', gap: '0.3rem' }}>
                      <CheckCircle size={14} color="#10b981" />
                      <span>AI 전자책 품질 정책 자가 검증 결과</span>
                    </h5>
                    {warnings.length > 0 ? (
                      <div style={{ display: 'flex', flexDirection: 'column', gap: '0.4rem' }}>
                        {warnings.map((w, idx) => (
                          <div key={idx} style={{ fontSize: '0.75rem', color: '#fbbf24', display: 'flex', alignItems: 'start', gap: '0.3rem' }}>
                            <span style={{ marginTop: '0.1rem' }}>⚠️</span>
                            <span>{w}</span>
                          </div>
                        ))}
                      </div>
                    ) : (
                      <p style={{ margin: 0, fontSize: '0.75rem', color: '#34d399' }}>
                        🎉 축하합니다! 허위/과장 수익 보장 문구 및 무책임한 조언 등이 전혀 없는 고품질 판매용 스펙 가이드라인을 통과했습니다.
                      </p>
                    )}
                  </div>
                )}

              </div>
            )}

            {/* Quick Actions Panel */}
            {status === 'done' && salesData && (
              <div className="glass-panel" style={{ padding: '1.5rem', display: 'flex', flexDirection: 'column', gap: '1rem' }}>
                <h4 style={{ color: '#fff', fontSize: '1rem', margin: 0, fontWeight: 'bold' }}>📦 디지털 상품 패키지 다운로드</h4>
                
                <div style={{ display: 'flex', gap: '0.5rem', flexWrap: 'wrap' }}>
                  
                  {/* Download 1: PDF Conversion Markdown */}
                  <button 
                    onClick={() => handleDownload(`${salesData.final_title}_전자책.md`, buildEbookMdText())}
                    className="btn" 
                    style={{ fontSize: '0.8rem', display: 'inline-flex', alignItems: 'center', gap: '0.4rem', background: 'linear-gradient(135deg, #a78bfa 0%, #fb7185 100%)', fontWeight: 'bold' }}
                  >
                    <Download size={14} />
                    <span>PDF 변환용 Markdown 다운로드</span>
                  </button>

                  {/* Download 2: Sales Page Copy */}
                  <button 
                    onClick={() => handleDownload('sales_page.md', buildSalesPageMdText())}
                    className="btn-secondary btn" 
                    style={{ fontSize: '0.8rem', display: 'inline-flex', alignItems: 'center', gap: '0.4rem' }}
                  >
                    <FileText size={14} />
                    <span>판매 상세페이지 카피 다운로드</span>
                  </button>

                  {/* Download 3: Viral Promotion Scripts */}
                  <button 
                    onClick={() => handleDownload('promo_scripts.md', buildPromoScriptsMdText())}
                    className="btn-secondary btn" 
                    style={{ fontSize: '0.8rem', display: 'inline-flex', alignItems: 'center', gap: '0.4rem' }}
                  >
                    <Sparkles size={14} />
                    <span>홍보 대본/블로그글 다운로드</span>
                  </button>

                  {/* Download 4: Raw JSON */}
                  <button 
                    onClick={() => handleDownload('ebook_package.json', JSON.stringify({ planData, contentData, salesData, warnings }, null, 2), 'application/json')}
                    className="btn-secondary btn" 
                    style={{ fontSize: '0.8rem', display: 'inline-flex', alignItems: 'center', gap: '0.4rem' }}
                  >
                    <Download size={14} />
                    <span>원본 JSON 다운로드</span>
                  </button>

                </div>
              </div>
            )}

            {/* Main Tabs Navigation */}
            <div className="glass-panel" style={{ padding: '1.5rem', display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>
              
              {/* Tab Header Buttons */}
              <div style={{ display: 'flex', gap: '0.5rem', borderBottom: '1px solid var(--border-color)', paddingBottom: '0.75rem', flexWrap: 'wrap' }}>
                <button 
                  onClick={() => setActiveTab('plan')}
                  className="btn"
                  style={{ 
                    fontSize: '0.8rem', 
                    padding: '0.4rem 1rem', 
                    background: activeTab === 'plan' ? 'var(--accent-color)' : 'transparent',
                    color: activeTab === 'plan' ? 'white' : 'var(--text-secondary)',
                    border: activeTab === 'plan' ? 'none' : '1px solid var(--border-color)'
                  }}
                >
                  기획 & 목차 ({planData?.table_of_contents?.length || 0})
                </button>

                {contentData && (
                  <button 
                    onClick={() => setActiveTab('content')}
                    className="btn"
                    style={{ 
                      fontSize: '0.8rem', 
                      padding: '0.4rem 1rem', 
                      background: activeTab === 'content' ? 'var(--accent-color)' : 'transparent',
                      color: activeTab === 'content' ? 'white' : 'var(--text-secondary)',
                      border: activeTab === 'content' ? 'none' : '1px solid var(--border-color)'
                    }}
                  >
                    📖 본문 미리보기 ({contentData.chapters?.length || 0}챕터)
                  </button>
                )}

                {salesData && (
                  <>
                    <button 
                      onClick={() => setActiveTab('sales')}
                      className="btn"
                      style={{ 
                        fontSize: '0.8rem', 
                        padding: '0.4rem 1rem', 
                        background: activeTab === 'sales' ? 'var(--accent-color)' : 'transparent',
                        color: activeTab === 'sales' ? 'white' : 'var(--text-secondary)',
                        border: activeTab === 'sales' ? 'none' : '1px solid var(--border-color)'
                      }}
                    >
                      💰 크몽 & 상세페이지 카피
                    </button>

                    <button 
                      onClick={() => setActiveTab('promo')}
                      className="btn"
                      style={{ 
                        fontSize: '0.8rem', 
                        padding: '0.4rem 1rem', 
                        background: activeTab === 'promo' ? 'var(--accent-color)' : 'transparent',
                        color: activeTab === 'promo' ? 'white' : 'var(--text-secondary)',
                        border: activeTab === 'promo' ? 'none' : '1px solid var(--border-color)'
                      }}
                    >
                      📣 홍보 & 바이럴 리소스
                    </button>

                    <button 
                      onClick={() => setActiveTab('cover')}
                      className="btn"
                      style={{ 
                        fontSize: '0.8rem', 
                        padding: '0.4rem 1rem', 
                        background: activeTab === 'cover' ? 'var(--accent-color)' : 'transparent',
                        color: activeTab === 'cover' ? 'white' : 'var(--text-secondary)',
                        border: activeTab === 'cover' ? 'none' : '1px solid var(--border-color)'
                      }}
                    >
                      🎨 AI 표지 디자인 프롬프트
                    </button>
                  </>
                )}
              </div>

              {/* Tab Contents */}
              <div style={{ maxHeight: '600px', overflowY: 'auto', paddingRight: '0.5rem' }}>
                
                {/* PLAN TAB */}
                {activeTab === 'plan' && planData && (
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '1.25rem' }}>
                    <div>
                      <h4 style={{ color: 'white', fontSize: '1rem', fontWeight: 'bold', marginBottom: '0.4rem' }}>추천 제목 후보군</h4>
                      <div style={{ display: 'flex', flexDirection: 'column', gap: '0.4rem' }}>
                        {planData.ebook_title_candidates?.map((t, idx) => (
                          <div key={idx} style={{ padding: '0.5rem 0.75rem', background: 'rgba(255,255,255,0.01)', border: '1px solid rgba(255,255,255,0.04)', borderRadius: '6px', fontSize: '0.85rem', color: 'white' }}>
                            {idx + 1}. {t}
                          </div>
                        ))}
                      </div>
                    </div>

                    <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem' }}>
                      <div>
                        <h4 style={{ color: 'white', fontSize: '0.9rem', fontWeight: 'bold', marginBottom: '0.3rem' }}>🎯 구체적 타겟 독자</h4>
                        <p style={{ margin: 0, fontSize: '0.85rem', color: 'var(--text-secondary)', background: 'rgba(0,0,0,0.15)', padding: '0.75rem', borderRadius: '6px' }}>
                          {planData.target_reader}
                        </p>
                      </div>
                      <div>
                        <h4 style={{ color: 'white', fontSize: '0.9rem', fontWeight: 'bold', marginBottom: '0.3rem' }}>🔑 이 책만의 고유 소구점 (Unique Angle)</h4>
                        <p style={{ margin: 0, fontSize: '0.85rem', color: 'var(--text-secondary)', background: 'rgba(0,0,0,0.15)', padding: '0.75rem', borderRadius: '6px' }}>
                          {planData.unique_angle}
                        </p>
                      </div>
                    </div>

                    <div>
                      <h4 style={{ color: 'white', fontSize: '1rem', fontWeight: 'bold', marginBottom: '0.4rem' }}>📋 기획된 목차 및 아웃라인</h4>
                      <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
                        {planData.chapter_summary?.map((chapter, idx) => (
                          <div key={idx} style={{ padding: '1rem', background: 'rgba(255,255,255,0.02)', border: '1px solid rgba(255,255,255,0.04)', borderRadius: '8px' }}>
                            <div style={{ fontWeight: 'bold', color: 'white', fontSize: '0.9rem', marginBottom: '0.25rem' }}>
                              챕터 {chapter.chapter_number}. {chapter.title}
                            </div>
                            <p style={{ margin: 0, fontSize: '0.8rem', color: 'var(--text-secondary)', marginBottom: '0.4rem' }}>
                              {chapter.summary}
                            </p>
                            <div style={{ fontSize: '0.75rem', color: '#a78bfa', background: 'rgba(167,139,250,0.08)', padding: '0.4rem', borderRadius: '4px', display: 'inline-block' }}>
                              🎁 핵심 전달 가치: {chapter.key_deliverable}
                            </div>
                          </div>
                        ))}
                      </div>
                    </div>
                  </div>
                )}

                {/* CONTENT TAB */}
                {activeTab === 'content' && contentData && (
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '2rem' }}>
                    {contentData.chapters?.map((c, idx) => (
                      <div key={idx} style={{ background: 'rgba(255,255,255,0.01)', border: '1px solid rgba(255,255,255,0.03)', padding: '1.5rem', borderRadius: '12px' }}>
                        <h3 style={{ color: 'white', fontSize: '1.15rem', borderBottom: '1px solid rgba(255,255,255,0.05)', paddingBottom: '0.5rem', marginBottom: '1rem', fontWeight: 'bold' }}>
                          📖 챕터 {c.chapter_number}. {c.title}
                        </h3>
                        <div className="markdown-content" style={{ whiteSpace: 'pre-wrap', fontSize: '0.9rem' }}>
                          {c.content_markdown}
                        </div>
                      </div>
                    ))}

                    {/* 부록 체크리스트 */}
                    {contentData.checklists && (
                      <div style={{ background: 'rgba(255,255,255,0.02)', padding: '1.25rem', borderRadius: '10px', border: '1px solid rgba(255,255,255,0.05)' }}>
                        <h4 style={{ color: 'white', fontWeight: 'bold', fontSize: '1rem', marginBottom: '0.75rem' }}>📋 종합 실행 체크리스트</h4>
                        {contentData.checklists.map((list, idx) => (
                          <div key={idx} style={{ marginBottom: '1rem' }}>
                            <div style={{ fontSize: '0.85rem', color: '#fb7185', fontWeight: 'bold', marginBottom: '0.4rem' }}>{list.title}</div>
                            <div style={{ display: 'flex', flexDirection: 'column', gap: '0.3rem' }}>
                              {list.items?.map((item, i) => (
                                <div key={i} style={{ fontSize: '0.8rem', color: 'var(--text-secondary)', display: 'flex', alignItems: 'center', gap: '0.4rem' }}>
                                  <input type="checkbox" readOnly style={{ accentColor: '#fb7185' }} />
                                  <span>{item}</span>
                                </div>
                              ))}
                            </div>
                          </div>
                        ))}
                      </div>
                    )}

                    {/* 부록 템플릿 */}
                    {contentData.templates && (
                      <div style={{ background: 'rgba(255,255,255,0.02)', padding: '1.25rem', borderRadius: '10px', border: '1px solid rgba(255,255,255,0.05)' }}>
                        <h4 style={{ color: 'white', fontWeight: 'bold', fontSize: '1rem', marginBottom: '0.75rem' }}>📄 즉시 활용 템플릿 모음</h4>
                        {contentData.templates.map((tpl, idx) => (
                          <div key={idx} style={{ padding: '1rem', background: '#090a0f', border: '1px solid rgba(255,255,255,0.04)', borderRadius: '6px', marginBottom: '1rem' }}>
                            <div style={{ fontSize: '0.85rem', color: '#fff', fontWeight: 'bold', marginBottom: '0.2rem' }}>
                              {tpl.template_name}
                            </div>
                            <div style={{ fontSize: '0.75rem', color: 'var(--text-secondary)', marginBottom: '0.5rem', fontStyle: 'italic' }}>
                              설명: {tpl.description}
                            </div>
                            <pre style={{ margin: 0, padding: '0.75rem', background: '#13161c', border: '1px solid var(--border-color)', borderRadius: '4px', overflowX: 'auto', fontSize: '0.8rem', color: '#a78bfa' }}>
                              <code>{tpl.body_text}</code>
                            </pre>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                )}

                {/* SALES TAB */}
                {activeTab === 'sales' && salesData && (
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>
                    <div style={{ padding: '1rem', background: 'rgba(251,113,133,0.05)', border: '1px solid rgba(251,113,133,0.15)', borderRadius: '8px' }}>
                      <div style={{ fontSize: '0.75rem', color: '#fb7185', fontWeight: 'bold', textTransform: 'uppercase' }}>크몽 판매 등록용 제목</div>
                      <h3 style={{ margin: '0.25rem 0 0 0', color: 'white', fontSize: '1.2rem', fontWeight: 'bold' }}>{salesData.kmong_title}</h3>
                    </div>

                    <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem' }}>
                      <div>
                        <h4 style={{ color: 'white', fontSize: '0.9rem', fontWeight: 'bold', marginBottom: '0.3rem' }}>🎯 핵심 구매자 페르소나</h4>
                        <div style={{ display: 'flex', flexDirection: 'column', gap: '0.3rem' }}>
                          {salesData.buyer_personas?.map((p, i) => (
                            <div key={i} style={{ fontSize: '0.8rem', color: 'var(--text-secondary)', background: 'rgba(0,0,0,0.15)', padding: '0.5rem', borderRadius: '4px' }}>
                              • {p}
                            </div>
                          ))}
                        </div>
                      </div>

                      <div>
                        <h4 style={{ color: 'white', fontSize: '0.9rem', fontWeight: 'bold', marginBottom: '0.3rem' }}>⚖️ 예상 가격 추천 가이드</h4>
                        <div style={{ fontSize: '0.8rem', color: 'var(--text-secondary)', background: 'rgba(0,0,0,0.15)', padding: '0.75rem', borderRadius: '6px', display: 'flex', flexDirection: 'column', gap: '0.4rem' }}>
                          <div><strong>권장 가치:</strong> {salesData.pricing_recommendation}</div>
                          <div><strong>패키지 구성 전략:</strong> {salesData.pricing_recommendation_details}</div>
                        </div>
                      </div>
                    </div>

                    <div>
                      <h4 style={{ color: 'white', fontSize: '1rem', fontWeight: 'bold', marginBottom: '0.4rem' }}>📋 상세페이지 기획안 및 카피라이팅</h4>
                      <div className="markdown-content" style={{ whiteSpace: 'pre-wrap', background: 'rgba(255,255,255,0.01)', border: '1px solid rgba(255,255,255,0.03)', padding: '1.25rem', borderRadius: '8px', fontSize: '0.85rem' }}>
                        <div style={{ fontSize: '1.2rem', color: '#fb7185', fontWeight: 'bold', marginBottom: '1rem', borderBottom: '1px solid rgba(255,255,255,0.05)', paddingBottom: '0.5rem' }}>
                          Headline: {salesData.sales_page_headline}
                        </div>
                        {salesData.sales_page_body}
                      </div>
                    </div>

                    <div>
                      <h4 style={{ color: 'white', fontSize: '1rem', fontWeight: 'bold', marginBottom: '0.4rem' }}>🛒 크몽 상세페이지 문구 (등록용)</h4>
                      <div className="markdown-content" style={{ whiteSpace: 'pre-wrap', background: 'rgba(255,255,255,0.01)', border: '1px solid rgba(255,255,255,0.03)', padding: '1.25rem', borderRadius: '8px', fontSize: '0.85rem' }}>
                        {salesData.kmong_sales_page}
                      </div>
                    </div>

                    <div>
                      <h4 style={{ color: 'white', fontSize: '1rem', fontWeight: 'bold', marginBottom: '0.4rem' }}>🤝 환불 및 유의사항 문구</h4>
                      <div style={{ fontSize: '0.8rem', color: 'var(--text-secondary)', background: 'rgba(239,68,68,0.02)', border: '1px solid rgba(239,68,68,0.1)', padding: '1rem', borderRadius: '8px', whiteSpace: 'pre-wrap' }}>
                        {salesData.refund_policy_text}
                      </div>
                    </div>
                  </div>
                )}

                {/* PROMO TAB */}
                {activeTab === 'promo' && salesData && (
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>
                    <div>
                      <h4 style={{ color: 'white', fontSize: '1rem', fontWeight: 'bold', marginBottom: '0.4rem' }}>🎁 무료 배포용 미끼(Lead Magnet) 기획안 3개</h4>
                      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(250px, 1fr))', gap: '1rem' }}>
                        {salesData.free_lead_magnets?.map((m, i) => (
                          <div key={i} style={{ padding: '0.85rem', background: 'rgba(16,185,129,0.03)', border: '1px solid rgba(16,185,129,0.1)', borderRadius: '6px', fontSize: '0.8rem', color: 'white' }}>
                            <strong>아이디어 {i + 1}:</strong> {m}
                          </div>
                        ))}
                      </div>
                    </div>

                    <div>
                      <h4 style={{ color: 'white', fontSize: '1rem', fontWeight: 'bold', marginBottom: '0.4rem' }}>📝 블로그/SNS 홍보 마케팅 소개글</h4>
                      <div className="markdown-content" style={{ whiteSpace: 'pre-wrap', background: 'rgba(255,255,255,0.01)', border: '1px solid rgba(255,255,255,0.03)', padding: '1.25rem', borderRadius: '8px', fontSize: '0.85rem' }}>
                        {salesData.blog_promo_post}
                      </div>
                    </div>

                    <div>
                      <h4 style={{ color: 'white', fontSize: '1rem', fontWeight: 'bold', marginBottom: '0.4rem' }}>📺 숏폼 바이럴 영상 60초 대본 (인스타/쇼츠용)</h4>
                      <pre style={{ margin: 0, padding: '1rem', background: '#090a0f', border: '1px solid rgba(255,255,255,0.04)', borderRadius: '8px', fontSize: '0.8rem', color: '#fb7185', whiteSpace: 'pre-wrap', fontFamily: 'monospace' }}>
                        <code>{salesData.shortform_promo_script}</code>
                      </pre>
                    </div>
                  </div>
                )}

                {/* COVER TAB */}
                {activeTab === 'cover' && salesData && (
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                      <h4 style={{ color: 'white', fontSize: '1rem', fontWeight: 'bold', margin: 0 }}>AI 표지 이미지 생성 골든 프롬프트 (Golden Prompt)</h4>
                      <button 
                        onClick={() => handleCopyText(salesData.cover_prompt)}
                        className="btn-secondary btn"
                        style={{ fontSize: '0.75rem', display: 'inline-flex', alignItems: 'center', gap: '0.3rem', padding: '0.4rem 0.8rem' }}
                      >
                        <Copy size={12} />
                        <span>{copied ? '복사 완료!' : '프롬프트 복사'}</span>
                      </button>
                    </div>

                    <div style={{ padding: '1rem', background: '#090a0f', border: '1px solid rgba(255,255,255,0.04)', borderRadius: '8px', fontSize: '0.85rem', color: '#60a5fa', fontFamily: 'monospace', lineHeight: '1.6' }}>
                      {salesData.cover_prompt}
                    </div>

                    <div style={{ display: 'flex', gap: '0.8rem', background: 'rgba(0,0,0,0.2)', padding: '1rem', borderRadius: '8px', border: '1px solid rgba(255,255,255,0.03)', fontSize: '0.8rem', alignItems: 'start' }}>
                      <span style={{ fontSize: '1.1rem' }}>💡</span>
                      <div style={{ color: 'var(--text-secondary)' }}>
                        위 프롬프트를 복사하여 Midjourney나 DALL-E, 혹은 대시보드의 비주얼 생성 엔진에 주입하면 해당 전자책의 콘셉트에 완벽히 어울리는 고품질 표지 그래픽을 출력할 수 있습니다.
                      </div>
                    </div>
                  </div>
                )}

              </div>

            </div>

          </div>
        )}

      </div>

    </div>
  );
}
