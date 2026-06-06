'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import { 
  ArrowLeft, Brain, Film, BarChart2, TrendingUp, Search, Info, HelpCircle,
  Play, CheckCircle2, AlertOctagon, RotateCw, Loader2, Sparkles, AlertCircle, Check
} from 'lucide-react';

export default function LearningPage() {
  const [activeTab, setActiveTab] = useState('database'); // 'database', 'patterns', 'competitors'
  const [history, setHistory] = useState([]);
  const [loading, setLoading] = useState(true);
  const [seeding, setSeeding] = useState(false);
  const [analyzingId, setAnalyzingId] = useState(null);
  
  // Competitor benchmarking state
  const [topic, setTopic] = useState('맥북 M3');
  const [currentVideoId, setCurrentVideoId] = useState('');
  const [competitorLoading, setCompetitorLoading] = useState(false);
  const [competitorData, setCompetitorData] = useState(null);

  // Modal detail state
  const [selectedItem, setSelectedItem] = useState(null);

  const fetchHistory = async () => {
    try {
      const res = await fetch('/api/learning');
      if (res.ok) {
        const data = await res.json();
        setHistory(data.history || []);
      }
    } catch (e) {
      console.error('Failed to fetch learning history:', e);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchHistory();
  }, []);

  // Trigger seeding demo data
  const handleSeedData = async () => {
    if (seeding) return;
    setSeeding(true);
    try {
      const res = await fetch('/api/learning', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'seed' })
      });
      if (res.ok) {
        const data = await res.json();
        setHistory(data.history || []);
        alert('🎉 학습 시스템 검증용 데모 데이터(12개 분석 이력)가 데이터베이스에 세팅되었습니다!');
      }
    } catch (e) {
      console.error(e);
      alert('데이터 세팅에 실패했습니다.');
    } finally {
      setSeeding(false);
    }
  };

  // Trigger post-upload actual performance evaluation
  const handleRunPostAnalysis = async (id) => {
    if (analyzingId) return;
    setAnalyzingId(id);
    try {
      const res = await fetch('/api/learning', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'post_upload_analysis', id })
      });
      if (res.ok) {
        const data = await res.json();
        // Update item in local history state
        setHistory(prev => prev.map(item => item.id === id ? data.item : item));
        if (selectedItem && selectedItem.id === id) {
          setSelectedItem(data.item);
        }
        alert(`📊 [${data.item.scriptData?.title}] 실제 성과 분석 및 자기 개선 피드백 생성이 완료되었습니다!`);
      } else {
        const err = await res.json();
        alert(err.error || '성과 분석 도중 오류가 발생했습니다.');
      }
    } catch (e) {
      console.error(e);
      alert('네트워크 오류가 발생했습니다.');
    } finally {
      setAnalyzingId(null);
    }
  };

  // Trigger competitor benchmarking
  const handleRunCompetitorBrief = async (e) => {
    if (e) e.preventDefault();
    if (!topic || competitorLoading) return;
    setCompetitorLoading(true);
    setCompetitorData(null);
    try {
      const res = await fetch('/api/learning', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          action: 'competitor_analysis',
          topic,
          currentVideoId
        })
      });
      if (res.ok) {
        const data = await res.json();
        setCompetitorData(data.data);
      } else {
        const err = await res.json();
        alert(err.error || '경쟁 채널 분석에 실패했습니다.');
      }
    } catch (e) {
      console.error(e);
      alert('네트워크 오류가 발생했습니다.');
    } finally {
      setCompetitorLoading(false);
    }
  };

  // Calculate statistics from current database history
  const analyzedVideos = history.filter(h => h.postUploadAnalysis);
  const totalViews = analyzedVideos.reduce((sum, h) => sum + (h.views || 0), 0);
  const avgRetention = analyzedVideos.length > 0 
    ? Math.round(analyzedVideos.reduce((sum, h) => sum + (h.avgRetention || 0), 0) / analyzedVideos.length) 
    : 0;
  
  // Sort history for patterns tab
  const getTopAndBottomPatterns = () => {
    const scoredItems = history.map(item => {
      let views = 0;
      if (item.postUploadAnalysis && typeof item.postUploadAnalysis.views === 'number') {
        views = item.postUploadAnalysis.views;
      } else if (typeof item.views === 'number') {
        views = item.views;
      }
      return { ...item, calculatedViews: views };
    });

    const sorted = [...scoredItems].sort((a, b) => b.calculatedViews - a.calculatedViews);
    const top5 = sorted.slice(0, 5);
    const bottom5 = [...scoredItems].sort((a, b) => a.calculatedViews - b.calculatedViews).slice(0, 5);

    return { top5, bottom5 };
  };

  const { top5, bottom5 } = getTopAndBottomPatterns();

  const getScoreColor = (score) => {
    if (score >= 80) return '#10b981'; // Green
    if (score >= 60) return '#fbbf24'; // Amber
    return '#f87171'; // Red
  };

  return (
    <div className="container" style={{ padding: '2rem', maxWidth: '1200px' }}>
      
      {/* Header */}
      <header style={{ marginBottom: '2.5rem', display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
        <Link href="/" style={{ display: 'inline-flex', alignItems: 'center', gap: '0.5rem', color: 'var(--text-primary)', width: 'fit-content' }} className="btn-secondary btn">
          <ArrowLeft size={16} /> 대시보드로 돌아가기
        </Link>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', flexWrap: 'wrap', gap: '1rem' }}>
          <div>
            <h1 className="title gradient-text" style={{ fontSize: '2.2rem', margin: 0, display: 'flex', alignItems: 'center', gap: '0.6rem', background: 'linear-gradient(135deg, #34d399 0%, #00d2ff 100%)' }}>
              <Brain size={32} color="#34d399" style={{ filter: 'drop-shadow(0 0 8px rgba(52,211,153,0.4))' }} />
              <span>AI 자기개선 학습 시스템 (Self-Improvement Lab)</span>
            </h1>
            <p style={{ color: 'var(--text-secondary)', margin: 0, fontSize: '0.95rem', marginTop: '0.25rem' }}>
              영상의 품질을 단순히 측정하는 것을 넘어, 예상 지표와 실제 업로드 지표를 교차 검증하고 상/하위 영상의 패턴을 학습하여 다음 영상의 떡상 확률을 높입니다.
            </p>
          </div>
          {history.length === 0 && (
            <button 
              onClick={handleSeedData} 
              disabled={seeding}
              className="btn" 
              style={{ background: 'linear-gradient(135deg, #10b981 0%, #059669 100%)', fontWeight: 'bold', display: 'flex', gap: '0.5rem', alignItems: 'center' }}
            >
              {seeding ? <Loader2 size={16} className="animate-spin" /> : <Sparkles size={16} />}
              <span>시뮬레이션 데이터 세팅</span>
            </button>
          )}
        </div>
      </header>

      {/* Quick Summary Metrics Grid */}
      <section style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(240px, 1fr))', gap: '1.5rem', marginBottom: '2.5rem' }}>
        
        <div className="glass-panel" style={{ padding: '1.25rem', border: '1px solid rgba(52,211,153,0.15)', background: 'linear-gradient(145deg, rgba(255,255,255,0.01) 0%, rgba(52,211,153,0.02) 100%)' }}>
          <div style={{ color: 'var(--text-secondary)', fontSize: '0.85rem', fontWeight: 500, display: 'flex', alignItems: 'center', gap: '0.4rem' }}>
            <Film size={14} color="#34d399" />
            <span>총 분석된 영상</span>
          </div>
          <div style={{ fontSize: '1.8rem', fontWeight: 'bold', color: 'white', marginTop: '0.5rem' }}>
            {history.length} <span style={{ fontSize: '1rem', fontWeight: 'normal', color: 'var(--text-secondary)' }}>개 완료</span>
          </div>
        </div>

        <div className="glass-panel" style={{ padding: '1.25rem', border: '1px solid rgba(0,210,255,0.15)', background: 'linear-gradient(145deg, rgba(255,255,255,0.01) 0%, rgba(0,210,255,0.02) 100%)' }}>
          <div style={{ color: 'var(--text-secondary)', fontSize: '0.85rem', fontWeight: 500, display: 'flex', alignItems: 'center', gap: '0.4rem' }}>
            <TrendingUp size={14} color="#00d2ff" />
            <span>분석 완료 누적 조회수</span>
          </div>
          <div style={{ fontSize: '1.8rem', fontWeight: 'bold', color: 'white', marginTop: '0.5rem' }}>
            {totalViews.toLocaleString()} <span style={{ fontSize: '1rem', fontWeight: 'normal', color: 'var(--text-secondary)' }}>회</span>
          </div>
        </div>

        <div className="glass-panel" style={{ padding: '1.25rem', border: '1px solid rgba(167,139,250,0.15)', background: 'linear-gradient(145deg, rgba(255,255,255,0.01) 0%, rgba(167,139,250,0.02) 100%)' }}>
          <div style={{ color: 'var(--text-secondary)', fontSize: '0.85rem', fontWeight: 500, display: 'flex', alignItems: 'center', gap: '0.4rem' }}>
            <Brain size={14} color="#a78bfa" />
            <span>평균 시청 지속률</span>
          </div>
          <div style={{ fontSize: '1.8rem', fontWeight: 'bold', color: 'white', marginTop: '0.5rem' }}>
            {avgRetention}% <span style={{ fontSize: '1rem', fontWeight: 'normal', color: 'var(--text-secondary)' }}>{avgRetention >= 60 ? '🔥 우수' : '⚠️ 보완 필요'}</span>
          </div>
        </div>

        <div className="glass-panel" style={{ padding: '1.25rem', border: '1px solid rgba(251,113,133,0.15)', background: 'linear-gradient(145deg, rgba(255,255,255,0.01) 0%, rgba(251,113,133,0.02) 100%)' }}>
          <div style={{ color: 'var(--text-secondary)', fontSize: '0.85rem', fontWeight: 500, display: 'flex', alignItems: 'center', gap: '0.4rem' }}>
            <Sparkles size={14} color="#fb7185" />
            <span>자가 개선 피드백 상태</span>
          </div>
          <div style={{ fontSize: '0.9rem', color: 'white', marginTop: '0.6rem', fontWeight: 600, display: 'flex', alignItems: 'center', gap: '0.4rem' }}>
            <CheckCircle2 size={16} color="#10b981" />
            <span>오토파일럿 루프에 바인딩됨</span>
          </div>
        </div>

      </section>

      {/* Tabs Menu Navigation */}
      <div style={{ display: 'flex', borderBottom: '1px solid var(--border-color)', marginBottom: '2rem', gap: '1rem' }}>
        <button 
          onClick={() => setActiveTab('database')}
          style={{
            padding: '1rem 0.5rem',
            background: 'none',
            border: 'none',
            color: activeTab === 'database' ? '#34d399' : 'var(--text-secondary)',
            fontWeight: activeTab === 'database' ? 'bold' : 'normal',
            borderBottom: activeTab === 'database' ? '2px solid #34d399' : 'none',
            cursor: 'pointer',
            fontSize: '1rem',
            display: 'flex',
            alignItems: 'center',
            gap: '0.4rem'
          }}
        >
          <BarChart2 size={16} /> <span>학습 데이터베이스 (Learning DB)</span>
        </button>

        <button 
          onClick={() => setActiveTab('patterns')}
          style={{
            padding: '1rem 0.5rem',
            background: 'none',
            border: 'none',
            color: activeTab === 'patterns' ? '#34d399' : 'var(--text-secondary)',
            fontWeight: activeTab === 'patterns' ? 'bold' : 'normal',
            borderBottom: activeTab === 'patterns' ? '2px solid #34d399' : 'none',
            cursor: 'pointer',
            fontSize: '1rem',
            display: 'flex',
            alignItems: 'center',
            gap: '0.4rem'
          }}
        >
          <Brain size={16} /> <span>자기 개선 가이드 (Self-Improvement)</span>
        </button>

        <button 
          onClick={() => setActiveTab('competitors')}
          style={{
            padding: '1rem 0.5rem',
            background: 'none',
            border: 'none',
            color: activeTab === 'competitors' ? '#34d399' : 'var(--text-secondary)',
            fontWeight: activeTab === 'competitors' ? 'bold' : 'normal',
            borderBottom: activeTab === 'competitors' ? '2px solid #34d399' : 'none',
            cursor: 'pointer',
            fontSize: '1rem',
            display: 'flex',
            alignItems: 'center',
            gap: '0.4rem'
          }}
        >
          <Search size={16} /> <span>경쟁 영상 벤치마킹</span>
        </button>
      </div>

      {/* Tab Content 1: Database list */}
      {activeTab === 'database' && (
        <div>
          {loading ? (
            <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '1rem', padding: '5rem 0' }}>
              <Loader2 className="animate-spin" size={40} color="#34d399" />
              <p style={{ color: 'var(--text-secondary)' }}>분석 이력 데이터를 로딩 중입니다...</p>
            </div>
          ) : history.length === 0 ? (
            <div className="glass-panel" style={{ padding: '5rem 2rem', textAlign: 'center', display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '1.5rem' }}>
              <Brain size={50} style={{ color: 'rgba(255,255,255,0.1)' }} />
              <div style={{ maxWidth: '400px' }}>
                <h3 style={{ fontSize: '1.2rem', color: '#fff', marginBottom: '0.5rem' }}>아직 등록된 영상이 없습니다</h3>
                <p style={{ color: 'var(--text-secondary)', fontSize: '0.9rem', lineHeight: '1.6', margin: 0 }}>
                  상단 우측의 [시뮬레이션 데이터 세팅] 버튼을 클릭해 12개의 사전 성과 분석 이력 데이터를 즉시 채워넣거나, 오토파일럿 자동화를 실행해 쇼츠를 제작해 보세요.
                </p>
              </div>
            </div>
          ) : (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>
              
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <h3 style={{ fontSize: '1.1rem', color: 'white', margin: 0 }}>영상별 성과 및 AI 피드백 이력</h3>
                <span style={{ fontSize: '0.8rem', color: 'var(--text-secondary)' }}>총 {history.length}개의 영상 보관 기록</span>
              </div>

              <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
                {history.map((item) => {
                  const scores = item.preUploadAnalysis?.scores || { hookStrength: 0, scriptContent: 0, sceneVisuals: 0, subtitleAesthetics: 0, soundDesign: 0 };
                  const createdDate = new Date(parseInt(item.id)).toLocaleDateString('ko-KR', { month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' });
                  
                  return (
                    <div 
                      key={item.id} 
                      className="glass-panel hoverable" 
                      style={{ 
                        padding: '1.2rem', 
                        display: 'grid', 
                        gridTemplateColumns: '80px 1fr 240px 180px', 
                        alignItems: 'center', 
                        gap: '1.5rem', 
                        border: '1px solid rgba(255,255,255,0.04)',
                        background: 'rgba(255,255,255,0.01)'
                      }}
                    >
                      {/* Video Play Mock Icon */}
                      <div 
                        onClick={() => setSelectedItem(item)}
                        style={{ 
                          width: '80px', 
                          aspectRatio: '9/16', 
                          background: '#000', 
                          borderRadius: '8px', 
                          display: 'flex', 
                          alignItems: 'center', 
                          justifyContent: 'center',
                          cursor: 'pointer',
                          position: 'relative',
                          border: '1px solid rgba(255,255,255,0.08)'
                        }}
                      >
                        <Play size={20} color="#34d399" style={{ filter: 'drop-shadow(0 0 6px rgba(52,211,153,0.5))' }} />
                        <span style={{ position: 'absolute', bottom: '4px', right: '4px', fontSize: '0.65rem', background: 'rgba(0,0,0,0.6)', padding: '0.1rem 0.3rem', borderRadius: '3px', color: 'white' }}>20s</span>
                      </div>

                      {/* Video Titles / Metadata */}
                      <div style={{ minWidth: 0 }}>
                        <div style={{ display: 'flex', gap: '0.5rem', alignItems: 'center', marginBottom: '0.4rem', flexWrap: 'wrap' }}>
                          <span style={{ fontSize: '0.7rem', color: '#34d399', background: 'rgba(52,211,153,0.1)', padding: '0.15rem 0.4rem', borderRadius: '4px', fontWeight: 'bold' }}>
                            {item.topic || '기타'}
                          </span>
                          <span style={{ fontSize: '0.7rem', color: 'var(--text-secondary)' }}>
                            생성일: {createdDate}
                          </span>
                          {item.selfImprovementApplied && (
                            <span style={{ fontSize: '0.7rem', color: '#a78bfa', background: 'rgba(167,139,250,0.1)', padding: '0.15rem 0.4rem', borderRadius: '4px', fontWeight: 'bold' }}>
                              🔄 자기개선 적용됨
                            </span>
                          )}
                        </div>
                        <h4 
                          onClick={() => setSelectedItem(item)}
                          style={{ color: 'white', fontSize: '1.05rem', margin: 0, fontWeight: 600, cursor: 'pointer', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}
                        >
                          {item.scriptData?.title || '제목 없음'}
                        </h4>
                        <p style={{ color: 'var(--text-secondary)', fontSize: '0.8rem', margin: '0.25rem 0 0 0', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                          {item.scriptData?.cuts?.[0]?.subtitle || ''}
                        </p>
                      </div>

                      {/* Pre-Upload Evaluation Scores */}
                      <div style={{ display: 'flex', flexDirection: 'column', gap: '0.4rem' }}>
                        <div style={{ fontSize: '0.75rem', color: 'var(--text-secondary)', fontWeight: 600, marginBottom: '0.1rem' }}>
                          업로드 전 예상 평가
                        </div>
                        <div style={{ display: 'flex', gap: '0.4rem', flexWrap: 'wrap' }}>
                          <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', background: 'rgba(0,0,0,0.3)', padding: '0.25rem', borderRadius: '4px', minWidth: '40px' }} title="후킹 강도">
                            <span style={{ fontSize: '0.65rem', color: 'var(--text-secondary)' }}>후킹</span>
                            <span style={{ fontSize: '0.8rem', fontWeight: 'bold', color: getScoreColor(scores.hookStrength) }}>{scores.hookStrength}</span>
                          </div>
                          <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', background: 'rgba(0,0,0,0.3)', padding: '0.25rem', borderRadius: '4px', minWidth: '40px' }} title="대본 분석">
                            <span style={{ fontSize: '0.65rem', color: 'var(--text-secondary)' }}>대본</span>
                            <span style={{ fontSize: '0.8rem', fontWeight: 'bold', color: getScoreColor(scores.scriptContent) }}>{scores.scriptContent}</span>
                          </div>
                          <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', background: 'rgba(0,0,0,0.3)', padding: '0.25rem', borderRadius: '4px', minWidth: '40px' }} title="장면 분석">
                            <span style={{ fontSize: '0.65rem', color: 'var(--text-secondary)' }}>장면</span>
                            <span style={{ fontSize: '0.8rem', fontWeight: 'bold', color: getScoreColor(scores.sceneVisuals) }}>{scores.sceneVisuals}</span>
                          </div>
                          <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', background: 'rgba(0,0,0,0.3)', padding: '0.25rem', borderRadius: '4px', minWidth: '40px' }} title="자막 분석">
                            <span style={{ fontSize: '0.65rem', color: 'var(--text-secondary)' }}>자막</span>
                            <span style={{ fontSize: '0.8rem', fontWeight: 'bold', color: getScoreColor(scores.subtitleAesthetics) }}>{scores.subtitleAesthetics}</span>
                          </div>
                        </div>
                      </div>

                      {/* Post-Upload Actual Performance */}
                      <div style={{ display: 'flex', flexDirection: 'column', gap: '0.25rem', textAlign: 'right', alignItems: 'flex-end' }}>
                        {item.postUploadAnalysis ? (
                          <>
                            <div style={{ fontSize: '0.75rem', color: 'var(--text-secondary)', fontWeight: 600 }}>
                              실제 성과 지표
                            </div>
                            <div style={{ fontSize: '1.1rem', fontWeight: 'bold', color: 'white' }}>
                              {item.views.toLocaleString()} <span style={{ fontSize: '0.75rem', fontWeight: 'normal', color: 'var(--text-secondary)' }}>회</span>
                            </div>
                            <div style={{ fontSize: '0.7rem', color: 'var(--text-secondary)' }}>
                              좋아요 {item.likeRate}% · 지속률 {item.avgRetention}%
                            </div>
                            <button 
                              onClick={() => setSelectedItem(item)}
                              className="btn" 
                              style={{ padding: '0.25rem 0.5rem', fontSize: '0.7rem', background: 'rgba(52,211,153,0.1)', border: '1px solid rgba(52,211,153,0.2)', color: '#34d399', marginTop: '0.2rem' }}
                            >
                              소장 피드백 보기
                            </button>
                          </>
                        ) : (
                          <div style={{ width: '100%' }}>
                            <button
                              onClick={() => handleRunPostAnalysis(item.id)}
                              disabled={analyzingId === item.id}
                              className="btn"
                              style={{ 
                                width: '100%', 
                                padding: '0.5rem', 
                                fontSize: '0.75rem', 
                                background: 'linear-gradient(135deg, #10b981 0%, #00d2ff 100%)', 
                                fontWeight: 'bold',
                                boxShadow: '0 0 10px rgba(52,211,153,0.2)',
                                display: 'flex',
                                gap: '0.3rem',
                                justifyContent: 'center'
                              }}
                            >
                              {analyzingId === item.id ? (
                                <Loader2 size={12} className="animate-spin" />
                              ) : (
                                <RotateCw size={12} />
                              )}
                              <span>실제 성과 분석 실행</span>
                            </button>
                            <span style={{ fontSize: '0.65rem', color: 'var(--text-secondary)', display: 'block', marginTop: '0.25rem', textAlign: 'center' }}>
                              조회수/이탈 분석 및 개선안 생성
                            </span>
                          </div>
                        )}
                      </div>

                    </div>
                  );
                })}
              </div>

            </div>
          )}
        </div>
      )}

      {/* Tab Content 2: Self-Improvement Rules */}
      {activeTab === 'patterns' && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '2rem' }}>
          
          <div className="glass-panel" style={{ padding: '1.5rem', background: 'linear-gradient(145deg, rgba(255,255,255,0.02) 0%, rgba(167,139,250,0.03) 100%)', border: '1px solid rgba(167,139,250,0.2)' }}>
            <h3 style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', color: '#a78bfa', fontSize: '1.2rem', marginBottom: '0.75rem' }}>
              <Brain size={20} />
              <span>AI 자기 개선 작동 원리 (Self-Improvement Loop)</span>
            </h3>
            <p style={{ color: 'var(--text-secondary)', fontSize: '0.9rem', lineHeight: '1.6' }}>
              오토파일럿 시스템이 새로운 쇼츠 영상을 제작하기 직전, 과거 조회수가 가장 높았던 **상위 10개 영상**과 조회수가 가장 낮았던 **하위 10개 영상**의 데이터를 수집하여 비교 분석합니다. 
              상위 영상의 대본 패턴(후크, CTA 등)은 적극 **강화(Reinforce)**하고, 하위 영상의 실패 패턴은 프롬프트 필터를 거쳐 철저히 **배제(Eliminate)**시킵니다.
            </p>
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '2rem', flexWrap: 'wrap' }}>
            
            {/* Top performing patterns */}
            <div className="glass-panel" style={{ padding: '1.5rem', border: '1px solid rgba(16,185,129,0.15)' }}>
              <h4 style={{ color: '#10b981', display: 'flex', alignItems: 'center', gap: '0.4rem', fontSize: '1.1rem', marginBottom: '1rem', borderBottom: '1px solid rgba(16,185,129,0.1)', paddingBottom: '0.5rem' }}>
                <CheckCircle2 size={18} />
                <span>강화 패턴 (상위 5선)</span>
              </h4>
              {top5.length === 0 ? (
                <p style={{ color: 'var(--text-secondary)', fontSize: '0.85rem' }}>데이터 수집을 위해 성과 분석을 먼저 실행하세요.</p>
              ) : (
                <div style={{ display: 'flex', flexDirection: 'column', gap: '0.85rem' }}>
                  {top5.map((item, idx) => (
                    <div key={item.id} style={{ display: 'flex', gap: '0.6rem', background: 'rgba(16,185,129,0.03)', padding: '0.75rem', borderRadius: '6px', border: '1px solid rgba(16,185,129,0.05)' }}>
                      <span style={{ fontSize: '0.85rem', color: '#10b981', fontWeight: 'bold' }}>#{idx+1}</span>
                      <div>
                        <div style={{ color: 'white', fontSize: '0.85rem', fontWeight: 600 }}>{item.scriptData?.title}</div>
                        <div style={{ fontSize: '0.75rem', color: 'var(--text-secondary)', marginTop: '0.2rem' }}>후킹: "{item.scriptData?.cuts?.[0]?.subtitle}"</div>
                        <div style={{ fontSize: '0.75rem', color: '#34d399', marginTop: '0.25rem', display: 'flex', gap: '0.2rem', alignItems: 'center' }}>
                          <span style={{ fontWeight: 'bold' }}>성공 요인:</span> {item.successFactors || '시각적 매칭 우수 및 깔끔한 BGM'}
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>

            {/* Bottom performing patterns */}
            <div className="glass-panel" style={{ padding: '1.5rem', border: '1px solid rgba(239,68,68,0.15)' }}>
              <h4 style={{ color: '#f87171', display: 'flex', alignItems: 'center', gap: '0.4rem', fontSize: '1.1rem', marginBottom: '1rem', borderBottom: '1px solid rgba(239,68,68,0.1)', paddingBottom: '0.5rem' }}>
                <AlertOctagon size={18} />
                <span>배제/제거 패턴 (하위 5선)</span>
              </h4>
              {bottom5.length === 0 ? (
                <p style={{ color: 'var(--text-secondary)', fontSize: '0.85rem' }}>데이터 수집을 위해 성과 분석을 먼저 실행하세요.</p>
              ) : (
                <div style={{ display: 'flex', flexDirection: 'column', gap: '0.85rem' }}>
                  {bottom5.map((item, idx) => (
                    <div key={item.id} style={{ display: 'flex', gap: '0.6rem', background: 'rgba(239,68,68,0.03)', padding: '0.75rem', borderRadius: '6px', border: '1px solid rgba(239,68,68,0.05)' }}>
                      <span style={{ fontSize: '0.85rem', color: '#f87171', fontWeight: 'bold' }}>#{idx+1}</span>
                      <div>
                        <div style={{ color: 'white', fontSize: '0.85rem', fontWeight: 600 }}>{item.scriptData?.title}</div>
                        <div style={{ fontSize: '0.75rem', color: 'var(--text-secondary)', marginTop: '0.2rem' }}>후킹: "{item.scriptData?.cuts?.[0]?.subtitle}"</div>
                        <div style={{ fontSize: '0.75rem', color: '#f87171', marginTop: '0.25rem', display: 'flex', gap: '0.2rem', alignItems: 'center' }}>
                          <span style={{ fontWeight: 'bold' }}>실패 원인:</span> {item.failureFactors || '후킹 강도 부족, 지루한 문장 전개'}
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>

          </div>

          {/* Generated Prompts Guideline Preview */}
          <div className="glass-panel" style={{ padding: '1.5rem' }}>
            <h4 style={{ color: 'white', fontSize: '1rem', marginBottom: '0.75rem', display: 'flex', gap: '0.4rem', alignItems: 'center' }}>
              <Info size={16} color="#00d2ff" />
              <span>차기 생성 프롬프트 자동 삽입 지침 예시</span>
            </h4>
            <div style={{ background: '#000', padding: '1rem', borderRadius: '8px', border: '1px solid var(--border-color)', fontSize: '0.8rem', fontFamily: 'monospace', color: '#34d399', lineHeight: '1.6' }}>
              {`[자기 개선 규칙 적용 지침]
- 강화할 패턴 (상위 10개 기반):
  * "방구석 부업", "AI 치트키" 등 도입부에 수치와 강력한 키워드 제시로 멈추게 할 것.
  * 인물 중심의 9:16 vertical 구도를 프롬프트에 필수로 넣어 시인성을 극대화할 것.
- 제거할 패턴 (하위 10개 기반):
  * 상품 카탈로그처럼 설명만 늘어놓는 narration은 절대 지양하고 대화조로 재구성할 것.
  * 텍스트 설명이나 로고가 렌더링되도록 AI 프롬프트를 작성하지 말 것 (이미지 뭉개짐 우려).`}
            </div>
            <div style={{ fontSize: '0.75rem', color: 'var(--text-secondary)', marginTop: '0.5rem' }}>
              ※ 이 규칙들은 오토파일럿 대본 작성 시 Gemini API에 실시간 인젝트되어 다음 영상의 성공률을 향상시킵니다.
            </div>
          </div>

        </div>
      )}

      {/* Tab Content 3: Competitor Benchmarking */}
      {activeTab === 'competitors' && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '2rem' }}>
          
          <div className="glass-panel" style={{ padding: '1.5rem', background: 'rgba(255,255,255,0.01)' }}>
            <h3 style={{ color: 'white', fontSize: '1.1rem', marginBottom: '1rem' }}>🎯 실시간 경쟁사 쇼츠 20개 패턴 수집 및 벤치마킹</h3>
            
            <form onSubmit={handleRunCompetitorBrief} style={{ display: 'flex', gap: '1rem', alignItems: 'flex-end', flexWrap: 'wrap' }}>
              
              <div style={{ flex: 1, minWidth: '240px' }}>
                <label style={{ display: 'block', fontSize: '0.8rem', color: 'var(--text-secondary)', marginBottom: '0.4rem' }}>
                  분석할 키워드 / 상품 주제
                </label>
                <input 
                  type="text" 
                  value={topic}
                  onChange={(e) => setTopic(e.target.value)}
                  placeholder="예: 맥북 M3, AI 부업, 홍삼정"
                  style={{ width: '100%', padding: '0.75rem', background: 'rgba(0,0,0,0.3)', border: '1px solid var(--border-color)', borderRadius: '8px', color: 'white' }}
                />
              </div>

              <div style={{ flex: 1, minWidth: '240px' }}>
                <label style={{ display: 'block', fontSize: '0.8rem', color: 'var(--text-secondary)', marginBottom: '0.4rem' }}>
                  비교할 내 쇼츠 영상 선택 (선택사항)
                </label>
                <select 
                  value={currentVideoId}
                  onChange={(e) => setCurrentVideoId(e.target.value)}
                  style={{ width: '100%', padding: '0.75rem', background: 'rgba(0,0,0,0.3)', border: '1px solid var(--border-color)', borderRadius: '8px', color: 'white' }}
                >
                  <option value="">비교 영상 선택 안함 (경쟁 조사만 실행)</option>
                  {history.map(item => (
                    <option key={item.id} value={item.id}>{item.scriptData?.title || '제목 없음'}</option>
                  ))}
                </select>
              </div>

              <button 
                type="submit" 
                disabled={competitorLoading}
                className="btn" 
                style={{ padding: '0.75rem 1.5rem', background: 'linear-gradient(135deg, #34d399 0%, #00d2ff 100%)', fontWeight: 'bold' }}
              >
                {competitorLoading ? (
                  <>
                    <Loader2 size={16} className="animate-spin" style={{ marginRight: '0.5rem' }} />
                    <span>인기 20개 영상 패턴 학습 중...</span>
                  </>
                ) : (
                  <span>🔭 인기 쇼츠 20개 수집 및 학습</span>
                )}
              </button>

            </form>
          </div>

          {competitorLoading && (
            <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '1rem', padding: '5rem 0' }}>
              <Loader2 className="animate-spin" size={40} color="#34d399" />
              <p style={{ color: 'var(--text-secondary)' }}>YouTube에서 실시간 {topic} 관련 인기 세로 쇼츠 20개를 긁어와 AI가 템포, 자막 스타일, CTA를 크로스 분석 중입니다...</p>
            </div>
          )}

          {competitorData && (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '2rem' }}>
              
              {/* Score comparisons */}
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 2fr', gap: '2rem', flexWrap: 'wrap' }}>
                
                <div className="glass-panel" style={{ padding: '1.5rem', display: 'flex', flexDirection: 'column', justifyContent: 'center' }}>
                  <h4 style={{ color: 'var(--text-secondary)', fontSize: '0.85rem', marginBottom: '1rem' }}>인기 영상 vs 내 영상 지표비교</h4>
                  
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
                    
                    <div>
                      <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.8rem', color: 'white', marginBottom: '0.25rem' }}>
                        <span>인기 쇼츠 평균 후킹 점수</span>
                        <span style={{ fontWeight: 'bold', color: '#34d399' }}>{competitorData.averages?.hookScore || 85}점</span>
                      </div>
                      <div style={{ width: '100%', height: '8px', background: 'rgba(0,0,0,0.5)', borderRadius: '4px', overflow: 'hidden' }}>
                        <div style={{ width: `${competitorData.averages?.hookScore || 85}%`, height: '100%', background: '#34d399' }} />
                      </div>
                    </div>

                    {currentVideoId && (
                      <div>
                        <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.8rem', color: 'white', marginBottom: '0.25rem' }}>
                          <span>내 영상 예상 후킹 점수</span>
                          <span style={{ fontWeight: 'bold', color: '#fb7185' }}>
                            {history.find(h => h.id === currentVideoId)?.preUploadAnalysis?.scores?.hookStrength || 0}점
                          </span>
                        </div>
                        <div style={{ width: '100%', height: '8px', background: 'rgba(0,0,0,0.5)', borderRadius: '4px', overflow: 'hidden' }}>
                          <div style={{ width: `${history.find(h => h.id === currentVideoId)?.preUploadAnalysis?.scores?.hookStrength || 0}%`, height: '100%', background: '#fb7185' }} />
                        </div>
                      </div>
                    )}

                    <div style={{ borderTop: '1px solid var(--border-color)', paddingTop: '1rem', marginTop: '0.5rem' }}>
                      <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.8rem', color: 'var(--text-secondary)' }}>
                        <span>인기 평균 컷 전환 주기</span>
                        <span style={{ color: 'white', fontWeight: 'bold' }}>{competitorData.averages?.cutLength || 2.5}초</span>
                      </div>
                      <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.8rem', color: 'var(--text-secondary)', marginTop: '0.4rem' }}>
                        <span>내 영상 컷 전환 주기</span>
                        <span style={{ color: 'white', fontWeight: 'bold' }}>5.0초</span>
                      </div>
                    </div>

                  </div>
                </div>

                {/* Differences details card */}
                <div className="glass-panel" style={{ padding: '1.5rem', border: '1px solid rgba(52,211,153,0.15)' }}>
                  <h4 style={{ color: '#34d399', fontSize: '1rem', marginBottom: '1rem', fontWeight: 600 }}>
                    ⚠️ 소장 피드백: 인기 영상 대비 차이점 분석
                  </h4>
                  
                  <ul style={{ paddingLeft: '1.25rem', display: 'flex', flexDirection: 'column', gap: '0.6rem', color: 'var(--text-primary)', fontSize: '0.9rem' }}>
                    {competitorData.comparison?.differenceAnalysis?.map((diff, idx) => (
                      <li key={idx} style={{ lineHeight: '1.5' }}>{diff}</li>
                    ))}
                  </ul>

                  <div style={{ background: 'rgba(52,211,153,0.05)', padding: '1rem', borderRadius: '8px', border: '1px solid rgba(52,211,153,0.1)', marginTop: '1.25rem' }}>
                    <div style={{ fontSize: '0.8rem', fontWeight: 'bold', color: '#34d399', marginBottom: '0.25rem' }}>개선안 가이드 (Improvement Brief)</div>
                    <p style={{ fontSize: '0.85rem', color: 'white', margin: 0, lineHeight: '1.6' }}>
                      {competitorData.comparison?.improvementBrief}
                    </p>
                  </div>
                </div>

              </div>

              {/* Complete written report */}
              <div className="glass-panel" style={{ padding: '2rem' }}>
                <h4 style={{ color: 'white', fontSize: '1.1rem', marginBottom: '1.25rem', borderBottom: '1px solid var(--border-color)', paddingBottom: '0.5rem' }}>
                  🔬 쇼츠 연구소 정밀 벤치마킹 분석서
                </h4>
                <div 
                  className="markdown-content" 
                  style={{ fontSize: '0.95rem', color: '#e2e8f0', whiteSpace: 'pre-line', lineHeight: '1.8' }}
                >
                  {competitorData.rawReportMarkdown}
                </div>
              </div>

            </div>
          )}

        </div>
      )}

      {/* Visual Analysis Detail Modal */}
      {selectedItem && (
        <div style={{ position: 'fixed', top: 0, left: 0, width: '100%', height: '100%', background: 'rgba(0,0,0,0.85)', zIndex: 1000, display: 'flex', justifyContent: 'center', alignItems: 'center', padding: '2rem' }}>
          
          <div className="glass-panel" style={{ width: '100%', maxWidth: '850px', maxHeight: '90vh', overflowY: 'auto', padding: '2rem', display: 'flex', flexDirection: 'column', gap: '1.5rem', border: '1px solid rgba(255,255,255,0.1)', boxShadow: '0 20px 40px rgba(0,0,0,0.6)' }}>
            
            {/* Modal Header */}
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', borderBottom: '1px solid rgba(255,255,255,0.1)', paddingBottom: '1rem' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '0.6rem' }}>
                <Brain size={22} color="#34d399" />
                <h2 style={{ fontSize: '1.3rem', color: '#fff', margin: 0 }}>쇼츠 연구소 분석 리포트 - {selectedItem.scriptData?.title}</h2>
              </div>
              <button 
                onClick={() => setSelectedItem(null)}
                style={{ background: 'none', border: 'none', color: 'var(--text-secondary)', cursor: 'pointer', fontSize: '1.5rem' }}
              >
                &times;
              </button>
            </div>

            {/* Modal Content */}
            <div style={{ display: 'flex', flexDirection: 'column', gap: '2rem' }}>
              
              {/* Scores Overview Row */}
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(5, 1fr)', gap: '1rem', textAlign: 'center' }}>
                {Object.entries(selectedItem.preUploadAnalysis?.scores || {}).map(([key, val]) => {
                  const labelMap = {
                    hookStrength: '후킹 강도',
                    scriptContent: '대본 분석',
                    sceneVisuals: '장면 분석',
                    subtitleAesthetics: '자막 분석',
                    soundDesign: '사운드 분석'
                  };
                  return (
                    <div key={key} style={{ background: 'rgba(255,255,255,0.02)', padding: '0.8rem', borderRadius: '8px', border: '1px solid rgba(255,255,255,0.05)' }}>
                      <span style={{ fontSize: '0.75rem', color: 'var(--text-secondary)', display: 'block', marginBottom: '0.25rem' }}>{labelMap[key] || key}</span>
                      <span style={{ fontSize: '1.4rem', fontWeight: 'bold', color: getScoreColor(val) }}>{val}점</span>
                    </div>
                  );
                })}
              </div>

              {/* Expectations vs Actual comparison summary */}
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1.5rem', flexWrap: 'wrap' }}>
                
                <div style={{ background: 'rgba(255,255,255,0.02)', padding: '1rem', borderRadius: '8px', border: '1px solid rgba(255,255,255,0.04)' }}>
                  <h4 style={{ fontSize: '0.9rem', color: 'white', borderBottom: '1px solid rgba(255,255,255,0.08)', paddingBottom: '0.4rem', marginBottom: '0.6rem' }}>
                    🔮 사전 예상 성과
                  </h4>
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem', fontSize: '0.8rem', color: 'var(--text-primary)' }}>
                    <div><span style={{ color: 'var(--text-secondary)' }}>예상 조회수:</span> {selectedItem.preUploadAnalysis?.answers?.q5_expected_views?.toLocaleString() || '1,000 ~ 3,000'}회</div>
                    <div><span style={{ color: 'var(--text-secondary)' }}>핵심 리스크:</span> {selectedItem.preUploadAnalysis?.answers?.q2_dropoff || '2컷 설명 템포 늘어짐 우려'}</div>
                  </div>
                </div>

                <div style={{ background: 'rgba(52,211,153,0.02)', padding: '1rem', borderRadius: '8px', border: '1px solid rgba(52,211,153,0.15)' }}>
                  <h4 style={{ fontSize: '0.9rem', color: '#34d399', borderBottom: '1px solid rgba(52,211,153,0.1)', paddingBottom: '0.4rem', marginBottom: '0.6rem' }}>
                    📊 실제 성과 지표
                  </h4>
                  {selectedItem.postUploadAnalysis ? (
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem', fontSize: '0.8rem', color: 'var(--text-primary)' }}>
                      <div><span style={{ color: 'var(--text-secondary)' }}>조회수:</span> {selectedItem.views.toLocaleString()}회</div>
                      <div><span style={{ color: 'var(--text-secondary)' }}>좋아요율 / 이탈률:</span> {selectedItem.likeRate}% / 지속률 {selectedItem.avgRetention}%</div>
                    </div>
                  ) : (
                    <div style={{ display: 'flex', flexDirection: 'column', justifyContent: 'center', height: '100%', alignItems: 'center' }}>
                      <button 
                        onClick={() => handleRunPostAnalysis(selectedItem.id)}
                        className="btn" 
                        style={{ padding: '0.4rem 1rem', fontSize: '0.75rem', background: 'linear-gradient(135deg, #10b981 0%, #00d2ff 100%)', fontWeight: 'bold' }}
                      >
                        성과 분석 실행하기
                      </button>
                    </div>
                  )}
                </div>

              </div>

              {/* Researcher Agent 6 Core Questions Answers */}
              <div style={{ borderTop: '1px solid rgba(255,255,255,0.1)', paddingTop: '1.5rem' }}>
                <h4 style={{ color: 'white', fontSize: '1.05rem', marginBottom: '1.25rem', display: 'flex', gap: '0.4rem', alignItems: 'center' }}>
                  <Sparkles size={18} color="#34d399" />
                  <span>쇼츠 연구소장 6대 질문 분석 피드백 (냉철함 유지)</span>
                </h4>

                {selectedItem.postUploadAnalysis ? (
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '1.25rem' }}>
                    
                    <div style={{ display: 'grid', gridTemplateColumns: '40px 1fr', gap: '0.75rem' }}>
                      <div style={{ fontSize: '0.85rem', color: '#fb7185', fontWeight: 'bold', background: 'rgba(251,113,133,0.1)', padding: '0.2rem', borderRadius: '4px', textAlign: 'center', height: 'fit-content' }}>Q1</div>
                      <div>
                        <div style={{ fontSize: '0.85rem', color: 'white', fontWeight: 600 }}>왜 이 영상은 시청자가 멈췄는가?</div>
                        <p style={{ fontSize: '0.85rem', color: 'var(--text-secondary)', margin: '0.2rem 0 0 0' }}>
                          {selectedItem.postUploadAnalysis?.answers?.q1_hook_stop}
                        </p>
                      </div>
                    </div>

                    <div style={{ display: 'grid', gridTemplateColumns: '40px 1fr', gap: '0.75rem' }}>
                      <div style={{ fontSize: '0.85rem', color: '#fb7185', fontWeight: 'bold', background: 'rgba(251,113,133,0.1)', padding: '0.2rem', borderRadius: '4px', textAlign: 'center', height: 'fit-content' }}>Q2</div>
                      <div>
                        <div style={{ fontSize: '0.85rem', color: 'white', fontWeight: 600 }}>왜 이 영상은 이탈했는가?</div>
                        <p style={{ fontSize: '0.85rem', color: 'var(--text-secondary)', margin: '0.2rem 0 0 0' }}>
                          {selectedItem.postUploadAnalysis?.answers?.q2_dropoff}
                        </p>
                      </div>
                    </div>

                    <div style={{ display: 'grid', gridTemplateColumns: '40px 1fr', gap: '0.75rem' }}>
                      <div style={{ fontSize: '0.85rem', color: '#fb7185', fontWeight: 'bold', background: 'rgba(251,113,133,0.1)', padding: '0.2rem', borderRadius: '4px', textAlign: 'center', height: 'fit-content' }}>Q3</div>
                      <div>
                        <div style={{ fontSize: '0.85rem', color: 'white', fontWeight: 600 }}>인기 쇼츠와 비교했을 때 가장 큰 차이 3개는 무엇인가?</div>
                        <p style={{ fontSize: '0.85rem', color: 'var(--text-secondary)', margin: '0.2rem 0 0 0', whiteSpace: 'pre-line' }}>
                          {selectedItem.postUploadAnalysis?.answers?.q3_diff_from_viral}
                        </p>
                      </div>
                    </div>

                    <div style={{ display: 'grid', gridTemplateColumns: '40px 1fr', gap: '0.75rem' }}>
                      <div style={{ fontSize: '0.85rem', color: '#fb7185', fontWeight: 'bold', background: 'rgba(251,113,133,0.1)', padding: '0.2rem', borderRadius: '4px', textAlign: 'center', height: 'fit-content' }}>Q4</div>
                      <div>
                        <div style={{ fontSize: '0.85rem', color: 'white', fontWeight: 600 }}>다음 영상에서 반드시 수정해야 하는 요소는 무엇인가?</div>
                        <p style={{ fontSize: '0.85rem', color: 'var(--text-secondary)', margin: '0.2rem 0 0 0' }}>
                          {selectedItem.postUploadAnalysis?.answers?.q4_must_fix}
                        </p>
                      </div>
                    </div>

                    <div style={{ display: 'grid', gridTemplateColumns: '40px 1fr', gap: '0.75rem' }}>
                      <div style={{ fontSize: '0.85rem', color: '#fb7185', fontWeight: 'bold', background: 'rgba(251,113,133,0.1)', padding: '0.2rem', borderRadius: '4px', textAlign: 'center', height: 'fit-content' }}>Q5</div>
                      <div>
                        <div style={{ fontSize: '0.85rem', color: 'white', fontWeight: 600 }}>현재 영상의 예상 조회수는 얼마이며 실제 결과와는 어떠한가?</div>
                        <p style={{ fontSize: '0.85rem', color: 'var(--text-secondary)', margin: '0.2rem 0 0 0' }}>
                          {selectedItem.postUploadAnalysis?.answers?.q5_expected_views}
                        </p>
                      </div>
                    </div>

                    <div style={{ display: 'grid', gridTemplateColumns: '40px 1fr', gap: '0.75rem' }}>
                      <div style={{ fontSize: '0.85rem', color: '#fb7185', fontWeight: 'bold', background: 'rgba(251,113,133,0.1)', padding: '0.2rem', borderRadius: '4px', textAlign: 'center', height: 'fit-content' }}>Q6</div>
                      <div>
                        <div style={{ fontSize: '0.85rem', color: 'white', fontWeight: 600 }}>조회수를 10배 올리려면 무엇을 바꿔야 하는가?</div>
                        <p style={{ fontSize: '0.85rem', color: '#34d399', fontWeight: 600, margin: '0.2rem 0 0 0' }}>
                          {selectedItem.postUploadAnalysis?.answers?.q6_multiplier_10x}
                        </p>
                      </div>
                    </div>

                  </div>
                ) : (
                  <p style={{ color: 'var(--text-secondary)', fontSize: '0.85rem', textAlign: 'center' }}>
                    실제 지표 분석이 수행되지 않았습니다. 지표 분석을 돌리면 소장의 6대 질문 분석이 잠금 해제됩니다.
                  </p>
                )}
              </div>

              {/* Complete comparison report text */}
              {selectedItem.postUploadAnalysis && (
                <div style={{ borderTop: '1px solid rgba(255,255,255,0.1)', paddingTop: '1.5rem' }}>
                  <h4 style={{ color: 'white', fontSize: '1rem', marginBottom: '0.75rem' }}>📋 상세 비교 분석서</h4>
                  <div style={{ background: '#000', padding: '1rem', borderRadius: '8px', border: '1px solid var(--border-color)', fontSize: '0.85rem', color: '#e2e8f0', whiteSpace: 'pre-line', lineHeight: '1.7' }}>
                    {selectedItem.postUploadAnalysis?.comparisonReport}
                  </div>
                </div>
              )}

            </div>

            {/* Modal Footer */}
            <div style={{ display: 'flex', justifyContent: 'flex-end', borderTop: '1px solid rgba(255,255,255,0.1)', paddingTop: '1rem', marginTop: '1rem' }}>
              <button 
                onClick={() => setSelectedItem(null)}
                className="btn-secondary btn"
                style={{ padding: '0.5rem 1.5rem' }}
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
