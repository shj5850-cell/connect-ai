'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import { 
  ArrowLeft, BookOpen, Loader2, Trash2, Eye, Download, Copy,
  CheckCircle, AlertTriangle, FileText, Sparkles, X, Info
} from 'lucide-react';

export default function EbookArchivePage() {
  const [historyList, setHistoryList] = useState([]);
  const [loading, setLoading] = useState(true);
  const [selectedItem, setSelectedItem] = useState(null); // Metadata of currently opened item
  const [detailData, setDetailData] = useState(null); // Full ebook.json payload loaded dynamically
  const [loadingDetail, setLoadingDetail] = useState(false);
  const [activeTab, setActiveTab] = useState('plan'); // plan, content, sales, promo, cover
  const [copied, setCopied] = useState(false);

  // Fetch e-book history list
  const fetchHistory = async () => {
    try {
      const res = await fetch('/api/ebook');
      if (res.ok) {
        const data = await res.json();
        setHistoryList(data);
      }
    } catch (e) {
      console.error('Failed to fetch e-book history:', e);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchHistory();
  }, []);

  // Delete e-book package
  const handleDelete = async (id) => {
    if (!confirm('이 전자책 패키지를 정말 삭제하시겠습니까? 관련 파일과 아카이브 기록이 영구히 삭제됩니다.')) {
      return;
    }

    try {
      const res = await fetch('/api/ebook', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          action: 'delete',
          id: id
        })
      });

      if (res.ok) {
        setHistoryList(prev => prev.filter(item => item.id !== id));
        if (selectedItem && selectedItem.id === id) {
          handleCloseDetail();
        }
        alert('전자책 패키지 관련 리소스가 완전히 삭제되었습니다.');
      } else {
        const err = await res.json();
        alert(err.error || '삭제 처리에 실패했습니다.');
      }
    } catch (e) {
      alert('오류가 발생했습니다: ' + e.message);
    }
  };

  // Open detail popup and fetch full ebook.json
  const handleOpenDetail = async (item) => {
    setSelectedItem(item);
    setLoadingDetail(true);
    setDetailData(null);
    setActiveTab('plan');

    try {
      const res = await fetch(`/ebooks/${item.id}/ebook.json`);
      if (res.ok) {
        const data = await res.json();
        setDetailData(data);
      } else {
        throw new Error('전자책 상세 정보 파일(ebook.json)을 로드하지 못했습니다.');
      }
    } catch (e) {
      alert(e.message);
      setSelectedItem(null);
    } finally {
      setLoadingDetail(false);
    }
  };

  const handleCloseDetail = () => {
    setSelectedItem(null);
    setDetailData(null);
  };

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

  // Compile Download Raw Text
  const buildEbookMdText = () => {
    if (!detailData) return '';
    const { planData, contentData, salesData, targetReader, promisedResult } = detailData;
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
    if (!detailData) return '';
    const { salesData } = detailData;
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
    if (!detailData) return '';
    const { salesData } = detailData;
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
        <Link href="/ebook" style={{ display: 'inline-flex', alignItems: 'center', gap: '0.5rem', color: 'var(--text-primary)', width: 'fit-content' }} className="btn-secondary btn">
          <ArrowLeft size={16} /> 생성기로 돌아가기
        </Link>
        <h1 className="title gradient-text" style={{ fontSize: '2.2rem', margin: '1rem 0 0 0', display: 'flex', alignItems: 'center', gap: '0.6rem' }}>
          <BookOpen size={30} color="#a78bfa" style={{ filter: 'drop-shadow(0 0 8px rgba(167,139,250,0.4))' }} />
          <span>생성된 전자책 보관함 (E-book Archive)</span>
        </h1>
        <p style={{ color: 'var(--text-secondary)', margin: 0, fontSize: '0.95rem' }}>
          비즈니스 자동화 모델이 생성한 모든 지식 창업 전자책 상품 목록입니다. 기획서, 실전 원고, 상세페이지, 표지 프롬프트 등 각 상품의 완제품 패키지를 열어보고 다운로드할 수 있습니다.
        </p>
      </header>

      {/* Main Grid List */}
      {loading ? (
        <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '1rem', padding: '5rem 0' }}>
          <Loader2 className="animate-spin" size={40} color="var(--accent-color)" />
          <p style={{ color: 'var(--text-secondary)' }}>전자책 목록을 불러오고 있습니다...</p>
        </div>
      ) : historyList.length === 0 ? (
        <div className="glass-panel" style={{ padding: '5rem 2rem', textAlign: 'center', display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '1.5rem' }}>
          <BookOpen size={50} style={{ color: 'rgba(255,255,255,0.1)' }} />
          <div style={{ maxWidth: '400px' }}>
            <h3 style={{ fontSize: '1.2rem', color: '#fff', marginBottom: '0.5rem' }}>보관함이 비어 있습니다</h3>
            <p style={{ color: 'var(--text-secondary)', fontSize: '0.9rem', lineHeight: '1.6', margin: 0 }}>
              아직 생성한 전자책 상품 패키지가 없습니다. 생성기로 이동하여 첫 번째 완제품을 기획하고 집필해 보세요!
            </p>
          </div>
          <Link href="/ebook" className="btn" style={{ padding: '0.7rem 2rem', background: 'linear-gradient(135deg, #a78bfa 0%, #fb7185 100%)', fontWeight: 'bold' }}>
            📘 전자책 생성하러 가기
          </Link>
        </div>
      ) : (
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(360px, 1fr))', gap: '2rem' }}>
          {historyList.map((item) => {
            const timestampDate = new Date(item.created_at || parseInt(item.id)).toLocaleString('ko-KR');

            return (
              <div key={item.id} className="glass-panel" style={{ display: 'flex', flexDirection: 'column', padding: '1.5rem', background: 'linear-gradient(180deg, rgba(255,255,255,0.01) 0%, rgba(255,255,255,0.03) 100%)', border: '1px solid rgba(255,255,255,0.06)' }}>
                <div style={{ flexGrow: 1, display: 'flex', flexDirection: 'column', gap: '0.8rem' }}>
                  
                  <div>
                    <span style={{ fontSize: '0.7rem', color: '#fb7185', fontWeight: 'bold', background: 'rgba(251,113,133,0.1)', padding: '0.2rem 0.5rem', borderRadius: '4px' }}>
                      💡 {item.topic}
                    </span>
                    <h3 style={{ fontSize: '1.1rem', color: 'white', marginTop: '0.5rem', marginBottom: '0.25rem', fontWeight: 600, lineHeight: '1.4' }}>
                      {item.title}
                    </h3>
                    <div style={{ fontSize: '0.75rem', color: 'var(--text-secondary)' }}>
                      생성일: {timestampDate}
                    </div>
                  </div>

                  <div style={{ fontSize: '0.8rem', display: 'flex', flexDirection: 'column', gap: '0.4rem', background: 'rgba(0,0,0,0.15)', padding: '0.75rem', borderRadius: '6px' }}>
                    <div><span style={{ color: 'var(--text-secondary)' }}>타겟 독자:</span> <span style={{ color: '#fff' }}>{item.target_reader}</span></div>
                    
                    <div style={{ display: 'flex', justifyContent: 'space-between', borderTop: '1px solid rgba(255,255,255,0.05)', paddingTop: '0.4rem', marginTop: '0.2rem' }}>
                      <div>
                        <span style={{ color: 'var(--text-secondary)' }}>시장성:</span>{' '}
                        <span style={{ color: item.marketability_score >= 85 ? '#10b981' : (item.marketability_score < 70 ? '#ef4444' : '#f59e0b'), fontWeight: 'bold' }}>
                          {item.marketability_score}점
                        </span>
                      </div>
                      <div>
                        <span style={{ color: 'var(--text-secondary)' }}>구매의도:</span>{' '}
                        <span style={{ color: '#60a5fa', fontWeight: 'bold' }}>{item.buyer_intent_score}점</span>
                      </div>
                    </div>
                  </div>

                  {/* Warning Indicator */}
                  {item.warnings && item.warnings.length > 0 && (
                    <div style={{ display: 'flex', alignItems: 'center', gap: '0.3rem', background: 'rgba(245,158,11,0.05)', border: '1px solid rgba(245,158,11,0.1)', padding: '0.4rem 0.6rem', borderRadius: '6px', fontSize: '0.7rem', color: '#fbbf24' }}>
                      <AlertTriangle size={12} />
                      <span>{item.warnings.length}개의 자가 검수 권고 사안이 있습니다.</span>
                    </div>
                  )}

                  {/* Marketability Message Badge */}
                  {item.marketability_score >= 85 ? (
                    <div style={{ display: 'flex', alignItems: 'center', gap: '0.3rem', background: 'rgba(16,185,129,0.05)', border: '1px solid rgba(16,185,129,0.1)', padding: '0.4rem 0.6rem', borderRadius: '6px', fontSize: '0.7rem', color: '#34d399', fontWeight: 'bold' }}>
                      <CheckCircle size={12} />
                      <span>우선 제작 추천</span>
                    </div>
                  ) : item.marketability_score < 70 ? (
                    <div style={{ display: 'flex', alignItems: 'center', gap: '0.3rem', background: 'rgba(239,68,68,0.05)', border: '1px solid rgba(239,68,68,0.1)', padding: '0.4rem 0.6rem', borderRadius: '6px', fontSize: '0.7rem', color: '#f87171', fontWeight: 'bold' }}>
                      <AlertTriangle size={12} />
                      <span>판매 가능성이 낮습니다. 주제나 타겟을 더 구체화하세요.</span>
                    </div>
                  ) : null}

                  {/* Status Badge */}
                  <div style={{ display: 'flex', alignItems: 'center', gap: '0.4rem', fontSize: '0.75rem', color: 'var(--text-secondary)' }}>
                    <div style={{ width: '6px', height: '6px', borderRadius: '50%', background: item.marketability_score < 70 ? '#ef4444' : '#10b981' }} />
                    <span>
                      상태: {item.marketability_score < 70 ? '생성 주의 (낮은 시장성)' : '상품화 완료 ✅'}
                    </span>
                  </div>

                </div>

                {/* Card Actions */}
                <div style={{ display: 'grid', gridTemplateColumns: '1.2fr 1fr', gap: '0.5rem', borderTop: '1px solid var(--border-color)', paddingTop: '1rem', marginTop: '1rem' }}>
                  <button 
                    onClick={() => handleOpenDetail(item)}
                    className="btn" 
                    style={{ fontSize: '0.8rem', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '0.3rem', padding: '0.55rem' }}
                  >
                    <Eye size={13} /> <span>상세 보기 & 파일</span>
                  </button>
                  <button
                    onClick={() => handleDelete(item.id)}
                    className="btn"
                    style={{ fontSize: '0.8rem', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '0.3rem', padding: '0.55rem', background: 'rgba(239, 68, 68, 0.1)', border: '1px solid rgba(239, 68, 68, 0.2)', color: '#f87171' }}
                  >
                    <Trash2 size={13} /> <span>삭제하기</span>
                  </button>
                </div>

              </div>
            );
          })}
        </div>
      )}

      {/* Slide-in Detail Modal */}
      {selectedItem && (
        <div style={{ position: 'fixed', top: 0, left: 0, width: '100%', height: '100%', background: 'rgba(0,0,0,0.85)', zIndex: 1000, display: 'flex', justifyContent: 'center', alignItems: 'center', padding: '2rem' }}>
          
          <div className="glass-panel" style={{ width: '100%', maxWidth: '900px', maxHeight: '92vh', overflowY: 'auto', padding: '2rem', display: 'flex', flexDirection: 'column', gap: '1.5rem', border: '1px solid rgba(255,255,255,0.1)', boxShadow: '0 20px 40px rgba(0,0,0,0.6)' }}>
            
            {/* Modal Header */}
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', borderBottom: '1px solid rgba(255,255,255,0.1)', paddingBottom: '1rem' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                <BookOpen size={20} color="#fb7185" />
                <h2 style={{ fontSize: '1.25rem', color: '#fff', margin: 0 }}>전자책 패키지 상세: {selectedItem.title}</h2>
              </div>
              <button 
                onClick={handleCloseDetail}
                style={{ background: 'none', border: 'none', color: 'var(--text-secondary)', cursor: 'pointer' }}
              >
                <X size={24} />
              </button>
            </div>

            {loadingDetail ? (
              <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '1rem', padding: '4rem 0' }}>
                <Loader2 className="animate-spin" size={30} color="var(--accent-color)" />
                <p style={{ color: 'var(--text-secondary)', fontSize: '0.9rem' }}>상세 파일 데이터(ebook.json)를 로드 중입니다...</p>
              </div>
            ) : detailData ? (
              <>
                {/* Download Actions inside Modal */}
                <div style={{ background: 'rgba(255,255,255,0.02)', padding: '1rem', borderRadius: '8px', border: '1px solid rgba(255,255,255,0.05)', display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
                  <div style={{ fontSize: '0.75rem', color: 'white', fontWeight: 'bold' }}>📦 디지털 완제품 다운로드</div>
                  <div style={{ display: 'flex', gap: '0.5rem', flexWrap: 'wrap' }}>
                    <button 
                      onClick={() => handleDownload(`${detailData.salesData.final_title}_전자책.md`, buildEbookMdText())}
                      className="btn" 
                      style={{ fontSize: '0.75rem', display: 'inline-flex', alignItems: 'center', gap: '0.4rem', padding: '0.45rem 1rem', background: 'linear-gradient(135deg, #a78bfa 0%, #fb7185 100%)', fontWeight: 'bold' }}
                    >
                      <Download size={13} />
                      <span>PDF 변환용 Markdown 다운로드</span>
                    </button>
                    <button 
                      onClick={() => handleDownload('sales_page.md', buildSalesPageMdText())}
                      className="btn-secondary btn" 
                      style={{ fontSize: '0.75rem', display: 'inline-flex', alignItems: 'center', gap: '0.4rem', padding: '0.45rem 1rem' }}
                    >
                      <FileText size={13} />
                      <span>판매 상세페이지 카피</span>
                    </button>
                    <button 
                      onClick={() => handleDownload('promo_scripts.md', buildPromoScriptsMdText())}
                      className="btn-secondary btn" 
                      style={{ fontSize: '0.75rem', display: 'inline-flex', alignItems: 'center', gap: '0.4rem', padding: '0.45rem 1rem' }}
                    >
                      <Sparkles size={13} />
                      <span>홍보 대본/대사</span>
                    </button>
                  </div>
                </div>

                {/* Validation Warnings inside Modal */}
                {detailData.warnings && detailData.warnings.length > 0 && (
                  <div style={{ background: 'rgba(245,158,11,0.05)', border: '1px solid rgba(245,158,11,0.15)', padding: '0.85rem', borderRadius: '8px', display: 'flex', flexDirection: 'column', gap: '0.3rem' }}>
                    <div style={{ fontSize: '0.8rem', color: '#fbbf24', fontWeight: 'bold', display: 'flex', alignItems: 'center', gap: '0.3rem' }}>
                      <AlertTriangle size={14} />
                      <span>자가 검수 권고 및 보완점 ({detailData.warnings.length})</span>
                    </div>
                    {detailData.warnings.map((w, idx) => (
                      <div key={idx} style={{ fontSize: '0.75rem', color: 'var(--text-secondary)', paddingLeft: '1.2rem' }}>
                        • {w}
                      </div>
                    ))}
                  </div>
                )}

                {/* Tab Navigation */}
                <div style={{ display: 'flex', gap: '0.4rem', borderBottom: '1px solid var(--border-color)', paddingBottom: '0.75rem', flexWrap: 'wrap' }}>
                  <button 
                    onClick={() => setActiveTab('plan')}
                    className="btn"
                    style={{ 
                      fontSize: '0.75rem', 
                      padding: '0.35rem 0.85rem', 
                      background: activeTab === 'plan' ? 'var(--accent-color)' : 'transparent',
                      color: activeTab === 'plan' ? 'white' : 'var(--text-secondary)',
                      border: activeTab === 'plan' ? 'none' : '1px solid var(--border-color)'
                    }}
                  >
                    기획 & 목차 ({detailData.planData?.table_of_contents?.length || 0})
                  </button>
                  <button 
                    onClick={() => setActiveTab('content')}
                    className="btn"
                    style={{ 
                      fontSize: '0.75rem', 
                      padding: '0.35rem 0.85rem', 
                      background: activeTab === 'content' ? 'var(--accent-color)' : 'transparent',
                      color: activeTab === 'content' ? 'white' : 'var(--text-secondary)',
                      border: activeTab === 'content' ? 'none' : '1px solid var(--border-color)'
                    }}
                  >
                    📖 본문 미리보기 ({detailData.contentData?.chapters?.length || 0}챕터)
                  </button>
                  <button 
                    onClick={() => setActiveTab('sales')}
                    className="btn"
                    style={{ 
                      fontSize: '0.75rem', 
                      padding: '0.35rem 0.85rem', 
                      background: activeTab === 'sales' ? 'var(--accent-color)' : 'transparent',
                      color: activeTab === 'sales' ? 'white' : 'var(--text-secondary)',
                      border: activeTab === 'sales' ? 'none' : '1px solid var(--border-color)'
                    }}
                  >
                    💰 크몽 & 상세페이지
                  </button>
                  <button 
                    onClick={() => setActiveTab('promo')}
                    className="btn"
                    style={{ 
                      fontSize: '0.75rem', 
                      padding: '0.35rem 0.85rem', 
                      background: activeTab === 'promo' ? 'var(--accent-color)' : 'transparent',
                      color: activeTab === 'promo' ? 'white' : 'var(--text-secondary)',
                      border: activeTab === 'promo' ? 'none' : '1px solid var(--border-color)'
                    }}
                  >
                    📣 홍보 & 바이럴
                  </button>
                  <button 
                    onClick={() => setActiveTab('cover')}
                    className="btn"
                    style={{ 
                      fontSize: '0.75rem', 
                      padding: '0.35rem 0.85rem', 
                      background: activeTab === 'cover' ? 'var(--accent-color)' : 'transparent',
                      color: activeTab === 'cover' ? 'white' : 'var(--text-secondary)',
                      border: activeTab === 'cover' ? 'none' : '1px solid var(--border-color)'
                    }}
                  >
                    🎨 표지 프롬프트
                  </button>
                </div>

                {/* Tab Frame */}
                <div style={{ maxHeight: '420px', overflowY: 'auto', paddingRight: '0.5rem' }}>
                  
                  {/* Plan Tab */}
                  {activeTab === 'plan' && (
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
                      <div style={{ fontSize: '0.85rem', background: 'rgba(0,0,0,0.15)', padding: '0.75rem', borderRadius: '6px', display: 'flex', flexDirection: 'column', gap: '0.4rem' }}>
                        <div><strong>타겟 독자:</strong> {detailData.targetReader}</div>
                        <div><strong>해결 결과:</strong> {detailData.promisedResult}</div>
                        <div><strong>차별화 포인트 (Unique Angle):</strong> {detailData.planData.unique_angle}</div>
                        <div style={{ display: 'flex', gap: '1.5rem', borderTop: '1px solid rgba(255,255,255,0.05)', paddingTop: '0.4rem', marginTop: '0.2rem' }}>
                          <div>
                            <strong>시장성 지수:</strong>{' '}
                            <span style={{ color: detailData.planData.marketability_score >= 85 ? '#10b981' : (detailData.planData.marketability_score < 70 ? '#ef4444' : '#f59e0b'), fontWeight: 'bold' }}>
                              {detailData.planData.marketability_score}점
                            </span>
                          </div>
                          <div>
                            <strong>구매 의도 지수:</strong>{' '}
                            <span style={{ color: '#60a5fa', fontWeight: 'bold' }}>
                              {detailData.planData.buyer_intent_score}점
                            </span>
                          </div>
                        </div>
                        {detailData.planData.marketability_score >= 85 ? (
                          <div style={{ fontSize: '0.75rem', color: '#10b981', fontWeight: 'bold', display: 'flex', alignItems: 'center', gap: '0.2rem' }}>
                            <span>✨ 우선 제작 추천</span>
                          </div>
                        ) : detailData.planData.marketability_score < 70 ? (
                          <div style={{ fontSize: '0.75rem', color: '#ef4444', fontWeight: 'bold', display: 'flex', alignItems: 'center', gap: '0.2rem' }}>
                            <span>⚠️ 판매 가능성이 낮습니다. 주제나 타겟을 더 구체화하세요.</span>
                          </div>
                        ) : (
                          <div style={{ fontSize: '0.75rem', color: '#f59e0b', fontWeight: 'bold', display: 'flex', alignItems: 'center', gap: '0.2rem' }}>
                            <span>⚖️ 스탠다드 등급 (보완 후 제작 권장)</span>
                          </div>
                        )}
                      </div>
                      <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
                        <div style={{ fontSize: '0.85rem', fontWeight: 'bold', color: 'white' }}>목차 아웃라인</div>
                        {detailData.planData.chapter_summary?.map((chapter, i) => (
                          <div key={i} style={{ padding: '0.75rem', background: 'rgba(255,255,255,0.01)', border: '1px solid rgba(255,255,255,0.04)', borderRadius: '6px', fontSize: '0.8rem' }}>
                            <strong>챕터 {chapter.chapter_number}. {chapter.title}</strong>
                            <div style={{ color: 'var(--text-secondary)', marginTop: '0.2rem' }}>{chapter.summary}</div>
                            <div style={{ color: '#a78bfa', fontSize: '0.75rem', marginTop: '0.25rem' }}>전달 가치: {chapter.key_deliverable}</div>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}

                  {/* Content Tab */}
                  {activeTab === 'content' && (
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>
                      {detailData.contentData.chapters?.map((c, i) => (
                        <div key={i} style={{ background: 'rgba(255,255,255,0.01)', border: '1px solid rgba(255,255,255,0.03)', padding: '1.25rem', borderRadius: '8px' }}>
                          <h4 style={{ color: 'white', borderBottom: '1px solid rgba(255,255,255,0.05)', paddingBottom: '0.4rem', marginBottom: '0.75rem', fontSize: '1rem', fontWeight: 'bold' }}>
                            챕터 {c.chapter_number}. {c.title}
                          </h4>
                          <div className="markdown-content" style={{ whiteSpace: 'pre-wrap', fontSize: '0.85rem' }}>
                            {c.content_markdown}
                          </div>
                        </div>
                      ))}
                    </div>
                  )}

                  {/* Sales Tab */}
                  {activeTab === 'sales' && (
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '1.25rem' }}>
                      <div style={{ padding: '0.85rem', background: 'rgba(251,113,133,0.05)', border: '1px solid rgba(251,113,133,0.1)', borderRadius: '6px' }}>
                        <strong>크몽 등록 제목:</strong> <span style={{ color: '#fff' }}>{detailData.salesData.kmong_title}</span>
                      </div>
                      <div className="markdown-content" style={{ whiteSpace: 'pre-wrap', background: 'rgba(255,255,255,0.01)', border: '1px solid rgba(255,255,255,0.03)', padding: '1.25rem', borderRadius: '8px', fontSize: '0.85rem' }}>
                        <div style={{ fontSize: '1.1rem', color: '#fb7185', fontWeight: 'bold', marginBottom: '0.75rem' }}>Headline: {detailData.salesData.sales_page_headline}</div>
                        {detailData.salesData.sales_page_body}
                      </div>
                      <div style={{ padding: '0.85rem', background: 'rgba(255,255,255,0.02)', border: '1px solid rgba(255,255,255,0.05)', borderRadius: '6px', display: 'flex', flexDirection: 'column', gap: '0.3rem' }}>
                        <div style={{ fontSize: '0.85rem', fontWeight: 'bold', color: 'white' }}>🛒 크몽 상세페이지 문구 (등록용):</div>
                        <div className="markdown-content" style={{ whiteSpace: 'pre-wrap', fontSize: '0.8rem', color: 'var(--text-secondary)' }}>
                          {detailData.salesData.kmong_sales_page}
                        </div>
                      </div>
                      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem' }}>
                        <div>
                          <div style={{ fontSize: '0.85rem', fontWeight: 'bold', color: 'white', marginBottom: '0.3rem' }}>🎯 구매자 페르소나:</div>
                          <div style={{ display: 'flex', flexDirection: 'column', gap: '0.2rem' }}>
                            {detailData.salesData.buyer_personas?.map((p, idx) => (
                              <div key={idx} style={{ fontSize: '0.75rem', color: 'var(--text-secondary)' }}>• {p}</div>
                            ))}
                          </div>
                        </div>
                        <div>
                          <div style={{ fontSize: '0.85rem', fontWeight: 'bold', color: 'white', marginBottom: '0.3rem' }}>💰 권장 가격:</div>
                          <div style={{ fontSize: '0.75rem', color: 'var(--text-secondary)' }}>
                            {detailData.salesData.pricing_recommendation}<br/>
                            <span style={{ fontSize: '0.7rem', color: 'gray' }}>{detailData.salesData.pricing_recommendation_details}</span>
                          </div>
                        </div>
                      </div>
                      <div style={{ padding: '0.85rem', background: 'rgba(239,68,68,0.02)', border: '1px solid rgba(239,68,68,0.1)', borderRadius: '6px' }}>
                        <div style={{ fontSize: '0.85rem', fontWeight: 'bold', color: '#f87171', marginBottom: '0.3rem' }}>🤝 환불 및 주의사항 규정:</div>
                        <div style={{ fontSize: '0.75rem', color: 'var(--text-secondary)', whiteSpace: 'pre-wrap' }}>
                          {detailData.salesData.refund_policy_text}
                        </div>
                      </div>
                    </div>
                  )}

                  {/* Promo Tab */}
                  {activeTab === 'promo' && (
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '1.25rem' }}>
                      <div>
                        <div style={{ fontSize: '0.85rem', fontWeight: 'bold', color: 'white', marginBottom: '0.4rem' }}>🎁 무료 미끼(Lead Magnet) 기획</div>
                        {detailData.salesData.free_lead_magnets?.map((m, i) => (
                          <div key={i} style={{ padding: '0.5rem', background: 'rgba(16,185,129,0.05)', borderRadius: '4px', fontSize: '0.8rem', color: 'white', marginBottom: '0.3rem' }}>
                            {i + 1}. {m}
                          </div>
                        ))}
                      </div>
                      <div className="markdown-content" style={{ whiteSpace: 'pre-wrap', background: 'rgba(255,255,255,0.01)', border: '1px solid rgba(255,255,255,0.03)', padding: '1.25rem', borderRadius: '8px', fontSize: '0.85rem' }}>
                        {detailData.salesData.blog_promo_post}
                      </div>
                      <div>
                        <div style={{ fontSize: '0.85rem', fontWeight: 'bold', color: 'white', marginBottom: '0.4rem' }}>60초 숏폼 바이럴 대본</div>
                        <pre style={{ margin: 0, padding: '0.75rem', background: '#090a0f', border: '1px solid rgba(255,255,255,0.04)', borderRadius: '6px', fontSize: '0.75rem', color: '#fb7185', whiteSpace: 'pre-wrap' }}>
                          <code>{detailData.salesData.shortform_promo_script}</code>
                        </pre>
                      </div>
                    </div>
                  )}

                  {/* Cover Tab */}
                  {activeTab === 'cover' && (
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
                      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                        <span style={{ fontSize: '0.85rem', fontWeight: 'bold', color: 'white' }}>Cover Prompt</span>
                        <button 
                          onClick={() => handleCopyText(detailData.salesData.cover_prompt)}
                          className="btn-secondary btn"
                          style={{ fontSize: '0.7rem', padding: '0.3rem 0.6rem' }}
                        >
                          <Copy size={12} />
                          <span>{copied ? '복사 완료!' : '복사'}</span>
                        </button>
                      </div>
                      <div style={{ padding: '1rem', background: '#090a0f', border: '1px solid rgba(255,255,255,0.04)', borderRadius: '8px', fontSize: '0.8rem', color: '#60a5fa', fontFamily: 'monospace' }}>
                        {detailData.salesData.cover_prompt}
                      </div>
                    </div>
                  )}

                </div>
              </>
            ) : (
              <div style={{ color: 'red', textAlign: 'center', padding: '2rem' }}>데이터를 로딩하지 못했습니다.</div>
            )}

            {/* Modal Footer */}
            <div style={{ display: 'flex', justifyContent: 'flex-end', borderTop: '1px solid rgba(255,255,255,0.1)', paddingTop: '1rem', marginTop: '0.5rem' }}>
              <button 
                onClick={handleCloseDetail}
                className="btn-secondary btn"
                style={{ padding: '0.6rem 1.5rem', fontSize: '0.85rem' }}
              >
                닫기
              </button>
            </div>

          </div>

        </div>
      )}

    </div>
  );
}
