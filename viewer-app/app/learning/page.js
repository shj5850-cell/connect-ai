'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import { 
  ArrowLeft, Brain, Film, BarChart2, TrendingUp, Search, Info, HelpCircle,
  Play, CheckCircle2, AlertOctagon, RotateCw, Loader2, Sparkles, AlertCircle, Check,
  DollarSign, ShoppingBag, TrendingDown
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

  // Phase 2 State Hooks
  const [performanceList, setPerformanceList] = useState([]);
  const [successDnaList, setSuccessDnaList] = useState([]);
  const [failureDnaList, setFailureDnaList] = useState([]);
  const [revenueDnaList, setRevenueDnaList] = useState([]);
  const [correlationStats, setCorrelationStats] = useState(null);
  const [dailyReport, setDailyReport] = useState(null);
  const [growthMetrics, setGrowthMetrics] = useState(null);
  const [styleDnaList, setStyleDnaList] = useState([]);

  const fetchHistory = async () => {
    try {
      const res = await fetch('/api/learning');
      if (res.ok) {
        const data = await res.json();
        setHistory(data.history || []);
        setPerformanceList(data.performanceList || []);
        setSuccessDnaList(data.successDnaList || []);
        setFailureDnaList(data.failureDnaList || []);
        setRevenueDnaList(data.revenueDnaList || []);
        setCorrelationStats(data.correlationStats || null);
        setDailyReport(data.dailyReport || null);
        setGrowthMetrics(data.growthMetrics || null);
        setStyleDnaList(data.styleDnaList || []);
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
        // Pull fresh states, correlations, DNA databases, and daily report
        await fetchHistory();
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

  // SaaS Revenue & Monetization Intelligence Attribution Stats
  const analyzedPerformance = performanceList.filter(v => typeof v.total_revenue === 'number');
  const totalRevenue = analyzedPerformance.reduce((acc, v) => acc + (v.total_revenue || 0), 0);
  const totalNetProfit = analyzedPerformance.reduce((acc, v) => acc + (v.net_profit || 0), 0);
  const totalCost = analyzedPerformance.reduce((acc, v) => acc + (v.production_cost || 0), 0);
  const averageRoi = totalCost > 0 ? parseFloat(((totalNetProfit / totalCost) * 100).toFixed(1)) : 0;
  
  let productRevenueMap = {};
  analyzedPerformance.forEach(v => {
    const prod = v.product_name || '기타';
    productRevenueMap[prod] = (productRevenueMap[prod] || 0) + (v.total_revenue || 0);
  });
  let bestProduct = '데이터 부족';
  let maxProdRev = 0;
  Object.entries(productRevenueMap).forEach(([prod, rev]) => {
    if (rev > maxProdRev) {
      maxProdRev = rev;
      bestProduct = prod;
    }
  });
  
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
          <div style={{ display: 'flex', gap: '0.75rem', alignItems: 'center' }}>
            <Link 
              href="/agents/intelligence"
              className="btn"
              style={{ background: 'linear-gradient(135deg, #8b5cf6 0%, #6d28d9 100%)', fontWeight: 'bold', display: 'flex', gap: '0.5rem', alignItems: 'center', color: 'white', border: 'none', textDecoration: 'none' }}
            >
              <Brain size={16} />
              <span>🧠 에이전트 두뇌 성장 관제소</span>
            </Link>
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
          onClick={() => setActiveTab('growth')}
          style={{
            padding: '1rem 0.5rem',
            background: 'none',
            border: 'none',
            color: activeTab === 'growth' ? '#34d399' : 'var(--text-secondary)',
            fontWeight: activeTab === 'growth' ? 'bold' : 'normal',
            borderBottom: activeTab === 'growth' ? '2px solid #34d399' : 'none',
            cursor: 'pointer',
            fontSize: '1rem',
            display: 'flex',
            alignItems: 'center',
            gap: '0.4rem'
          }}
        >
          <TrendingUp size={16} /> <span>CEO Revenue Control Panel (수익 관제 대시보드)</span>
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

      {/* Tab Content 4: Growth Dashboard & Daily Reports */}
      {activeTab === 'growth' && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '2.5rem' }}>
          
          {/* Growth KPIs Summary */}
          <div>
            <h3 style={{ fontSize: '1.2rem', color: 'white', marginBottom: '1rem', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
              <TrendingUp size={20} color="#34d399" />
              <span>SaaS 비즈니스 핵심 매출 깔대기 (CEO Revenue Attribution Panel)</span>
            </h3>
            
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))', gap: '1.5rem' }}>
              
              <div className="glass-panel" style={{ padding: '1.25rem', border: '1px solid rgba(52,211,153,0.15)', background: 'linear-gradient(145deg, rgba(255,255,255,0.01) 0%, rgba(52,211,153,0.02) 100%)' }}>
                <span style={{ fontSize: '0.75rem', color: 'var(--text-secondary)', display: 'block' }}>누적 매출액 (Total Revenue)</span>
                <span style={{ fontSize: '1.8rem', fontWeight: 'bold', color: '#10b981', display: 'block', marginTop: '0.5rem' }}>
                  ₩{totalRevenue.toLocaleString()}
                </span>
                <span style={{ fontSize: '0.7rem', color: '#10b981', display: 'block', marginTop: '0.25rem' }}>광고 + 쿠팡 제휴 누적 정산금</span>
              </div>

              <div className="glass-panel" style={{ padding: '1.25rem', border: '1px solid rgba(0,210,255,0.15)', background: 'linear-gradient(145deg, rgba(255,255,255,0.01) 0%, rgba(0,210,255,0.02) 100%)' }}>
                <span style={{ fontSize: '0.75rem', color: 'var(--text-secondary)', display: 'block' }}>누적 순이익 (Total Net Profit)</span>
                <span style={{ fontSize: '1.8rem', fontWeight: 'bold', color: totalNetProfit >= 0 ? '#00d2ff' : '#f87171', display: 'block', marginTop: '0.5rem' }}>
                  ₩{totalNetProfit.toLocaleString()}
                </span>
                <span style={{ fontSize: '0.7rem', color: 'var(--text-secondary)', display: 'block', marginTop: '0.25rem' }}>누적 매출 - 누적 제작 비용</span>
              </div>

              <div className="glass-panel" style={{ padding: '1.25rem', border: '1px solid rgba(167,139,250,0.15)', background: 'linear-gradient(145deg, rgba(255,255,255,0.01) 0%, rgba(167,139,250,0.02) 100%)' }}>
                <span style={{ fontSize: '0.75rem', color: 'var(--text-secondary)', display: 'block' }}>투자대비수익률 (Average ROI)</span>
                <span style={{ fontSize: '1.8rem', fontWeight: 'bold', color: averageRoi >= 0 ? '#a78bfa' : '#f87171', display: 'block', marginTop: '0.5rem' }}>
                  {averageRoi}%
                </span>
                <span style={{ fontSize: '0.7rem', color: 'var(--text-secondary)', display: 'block', marginTop: '0.25rem' }}>제작 단가 ₩1,000 기준 수익 비율</span>
              </div>

              <div className="glass-panel" style={{ padding: '1.25rem', border: '1px solid rgba(251,191,36,0.15)', background: 'linear-gradient(145deg, rgba(255,255,255,0.01) 0%, rgba(251,191,36,0.02) 100%)' }}>
                <span style={{ fontSize: '0.75rem', color: 'var(--text-secondary)', display: 'block' }}>최고 매출 유발 상품 (Best Product)</span>
                <span style={{ fontSize: '1.05rem', fontWeight: 'bold', color: '#fbbf24', display: 'block', marginTop: '0.6rem', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }} title={bestProduct}>
                  {bestProduct}
                </span>
                <span style={{ fontSize: '0.7rem', color: '#fbbf24', display: 'block', marginTop: '0.25rem' }}>매출 누적액: ₩{maxProdRev.toLocaleString()}</span>
              </div>

            </div>

            <h3 style={{ fontSize: '1.2rem', color: 'white', marginTop: '2rem', marginBottom: '1rem', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
              <Brain size={20} color="#a78bfa" />
              <span>크리에이티브 다양성 지표 (Creative Diversity Engine KPIs)</span>
            </h3>
            
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))', gap: '1.5rem', marginBottom: '1rem' }}>
              
              <div className="glass-panel" style={{ padding: '1.25rem', border: '1px solid rgba(96,165,250,0.15)', background: 'linear-gradient(145deg, rgba(255,255,255,0.01) 0%, rgba(96,165,250,0.02) 100%)' }}>
                <span style={{ fontSize: '0.75rem', color: 'var(--text-secondary)', display: 'block' }}>다양성 스코어 평균 (Average Diversity)</span>
                <span style={{ fontSize: '1.8rem', fontWeight: 'bold', color: '#60a5fa', display: 'block', marginTop: '0.5rem' }}>
                  {growthMetrics?.diversity_score_average !== undefined ? `${growthMetrics.diversity_score_average}%` : '80.0%'}
                </span>
                <span style={{ fontSize: '0.7rem', color: 'var(--text-secondary)', display: 'block', marginTop: '0.25rem' }}>최근 20개 비디오 평균 다양성 비율</span>
              </div>

              <div className="glass-panel" style={{ padding: '1.25rem', border: '1px solid rgba(167,139,250,0.15)', background: 'linear-gradient(145deg, rgba(255,255,255,0.01) 0%, rgba(167,139,250,0.02) 100%)' }}>
                <span style={{ fontSize: '0.75rem', color: 'var(--text-secondary)', display: 'block' }}>신선도 지수 (Novelty Score)</span>
                <span style={{ fontSize: '1.8rem', fontWeight: 'bold', color: '#a78bfa', display: 'block', marginTop: '0.5rem' }}>
                  {growthMetrics?.novelty_score_average !== undefined ? `${growthMetrics.novelty_score_average}%` : '80.0%'}
                </span>
                <span style={{ fontSize: '0.7rem', color: 'var(--text-secondary)', display: 'block', marginTop: '0.25rem' }}>최근 20개 비디오 스타일 고유 커버리지</span>
              </div>

              <div className="glass-panel" style={{ padding: '1.25rem', border: '1px solid rgba(251,113,133,0.15)', background: 'linear-gradient(145deg, rgba(255,255,255,0.01) 0%, rgba(251,113,133,0.02) 100%)' }}>
                <span style={{ fontSize: '0.75rem', color: 'var(--text-secondary)', display: 'block' }}>자가 실험 성공률 (Experiment Success Rate)</span>
                <span style={{ fontSize: '1.8rem', fontWeight: 'bold', color: '#fb7185', display: 'block', marginTop: '0.5rem' }}>
                  {growthMetrics?.experiment_success_rate !== undefined ? `${growthMetrics.experiment_success_rate}%` : '66.7%'}
                </span>
                <span style={{ fontSize: '0.7rem', color: 'var(--text-secondary)', display: 'block', marginTop: '0.25rem' }}>자가 실험 비디오 중 성공(조회수 5천+) 비율</span>
              </div>

              <div className="glass-panel" style={{ padding: '1.25rem', border: '1px solid rgba(52,211,153,0.15)', background: 'linear-gradient(145deg, rgba(255,255,255,0.01) 0%, rgba(52,211,153,0.02) 100%)' }}>
                <span style={{ fontSize: '0.75rem', color: 'var(--text-secondary)', display: 'block' }}>실험 진행 비중 (Experiment Share)</span>
                <span style={{ fontSize: '1.8rem', fontWeight: 'bold', color: '#34d399', display: 'block', marginTop: '0.5rem' }}>
                  20.0%
                </span>
                <span style={{ fontSize: '0.7rem', color: 'var(--text-secondary)', display: 'block', marginTop: '0.25rem' }}>전체 영상 중 자가 실험 영상의 비율</span>
              </div>

              <div className="glass-panel" style={{ padding: '1.25rem', border: '1px solid rgba(251,191,36,0.15)', background: 'linear-gradient(145deg, rgba(255,255,255,0.01) 0%, rgba(251,191,36,0.02) 100%)' }}>
                <span style={{ fontSize: '0.75rem', color: 'var(--text-secondary)', display: 'block' }}>성공 DNA 반영률 (Success DNA Reflection)</span>
                <span style={{ fontSize: '1.8rem', fontWeight: 'bold', color: '#fbbf24', display: 'block', marginTop: '0.5rem' }}>
                  {growthMetrics?.success_dna_reflection_rate !== undefined ? `${growthMetrics.success_dna_reflection_rate}%` : '0.0%'}
                </span>
                <span style={{ fontSize: '0.7rem', color: 'var(--text-secondary)', display: 'block', marginTop: '0.25rem' }}>성공 DNA 가이드 반영 생성 비율 (목표: 90%+)</span>
              </div>

            </div>
          </div>

          {/* Revenue Attribution & ROI Chart Section */}
          <div className="glass-panel" style={{ padding: '1.5rem' }}>
            <h4 style={{ fontSize: '1.1rem', color: 'white', marginBottom: '1.25rem', borderBottom: '1px solid var(--border-color)', paddingBottom: '0.5rem', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
              <BarChart2 size={18} color="#34d399" />
              <span>영상별 소모 비용 vs 유치 정산액 대조 차트 (Cost vs Revenue)</span>
            </h4>
            
            {analyzedPerformance.length > 0 ? (
              <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem', marginTop: '1.25rem' }}>
                {analyzedPerformance.map(v => {
                  const maxVal = Math.max(...analyzedPerformance.map(x => Math.max(x.total_revenue || 0, x.production_cost || 0, 5000)));
                  const costPct = ((v.production_cost || 0) / maxVal) * 100;
                  const revPct = ((v.total_revenue || 0) / maxVal) * 100;
                  
                  return (
                    <div key={v.video_id} style={{ display: 'grid', gridTemplateColumns: '220px 1fr', alignItems: 'center', gap: '1.5rem', background: 'rgba(255,255,255,0.01)', padding: '0.85rem', borderRadius: '6px', border: '1px solid rgba(255,255,255,0.03)' }}>
                      <div style={{ minWidth: 0 }}>
                        <div style={{ fontSize: '0.85rem', color: 'white', fontWeight: 600, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }} title={v.title}>
                          {v.title}
                        </div>
                        <div style={{ fontSize: '0.7rem', color: 'var(--text-secondary)', marginTop: '0.15rem' }}>
                          {v.product_name}
                        </div>
                      </div>
                      <div style={{ display: 'flex', flexDirection: 'column', gap: '0.4rem' }}>
                        {/* Cost Bar */}
                        <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                          <div style={{ width: `${costPct}%`, minWidth: '4px', height: '12px', background: 'linear-gradient(90deg, #ef4444 0%, #f87171 100%)', borderRadius: '3px' }} />
                          <span style={{ fontSize: '0.75rem', color: '#f87171' }}>비용: ₩{(v.production_cost || 0).toLocaleString()}</span>
                        </div>
                        {/* Revenue Bar */}
                        <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                          <div style={{ width: `${revPct}%`, minWidth: '4px', height: '12px', background: 'linear-gradient(90deg, #10b981 0%, #34d399 100%)', borderRadius: '3px' }} />
                          <span style={{ fontSize: '0.75rem', color: '#34d399', fontWeight: 'bold' }}>수익: ₩{(v.total_revenue || 0).toLocaleString()} (ROI: {v.roi}%)</span>
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            ) : (
              <div style={{ textAlign: 'center', padding: '2rem 0', color: 'var(--text-secondary)' }}>
                수익 정보를 표현하기 위해 성과 분석이 완료된 영상이 필요합니다.
              </div>
            )}
          </div>

          {/* Automatic Investment Judgment & Money Score Table */}
          <div className="glass-panel" style={{ padding: '1.5rem' }}>
            <h4 style={{ fontSize: '1.1rem', color: 'white', marginBottom: '1.25rem', borderBottom: '1px solid var(--border-color)', paddingBottom: '0.5rem', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
              <TrendingUp size={18} color="#a78bfa" />
              <span>AI 자동 투자 수익성 판별기 (Automatic Investment Advisor)</span>
            </h4>
            
            {analyzedPerformance.length > 0 ? (
              <div style={{ overflowX: 'auto' }}>
                <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left', fontSize: '0.85rem' }}>
                  <thead>
                    <tr style={{ borderBottom: '1px solid rgba(255,255,255,0.08)', color: 'var(--text-secondary)' }}>
                      <th style={{ padding: '0.75rem 0.5rem' }}>영상 제목</th>
                      <th style={{ padding: '0.75rem 0.5rem', textAlign: 'right' }}>조회수</th>
                      <th style={{ padding: '0.75rem 0.5rem', textAlign: 'right' }}>제작 비용</th>
                      <th style={{ padding: '0.75rem 0.5rem', textAlign: 'right' }}>순수익</th>
                      <th style={{ padding: '0.75rem 0.5rem', textAlign: 'right' }}>돈 점수 (Money)</th>
                      <th style={{ padding: '0.75rem 0.5rem', textAlign: 'center' }}>투자성 판정</th>
                    </tr>
                  </thead>
                  <tbody>
                    {analyzedPerformance.map(v => {
                      const isHighEff = v.views < 15000 && v.net_profit > 5000;
                      const isBait = v.views >= 15000 && v.net_profit < 3000;
                      
                      let badgeColor = 'rgba(255,255,255,0.1)';
                      let badgeTextColor = 'var(--text-secondary)';
                      let badgeLabel = '일반형';

                      if (isHighEff) {
                        badgeColor = 'rgba(16,185,129,0.15)';
                        badgeTextColor = '#10b981';
                        badgeLabel = '🟢 고효율형';
                      } else if (isBait) {
                        badgeColor = 'rgba(239,68,68,0.15)';
                        badgeTextColor = '#ef4444';
                        badgeLabel = '🔴 미끼형 (개선)';
                      }

                      return (
                        <tr key={v.video_id} style={{ borderBottom: '1px solid rgba(255,255,255,0.04)', color: 'white' }}>
                          <td style={{ padding: '0.75rem 0.5rem', fontWeight: 600 }}>{v.title}</td>
                          <td style={{ padding: '0.75rem 0.5rem', textAlign: 'right' }}>{v.views?.toLocaleString()}회</td>
                          <td style={{ padding: '0.75rem 0.5rem', textAlign: 'right', color: '#f87171' }}>₩{v.production_cost?.toLocaleString()}</td>
                          <td style={{ padding: '0.75rem 0.5rem', textAlign: 'right', color: v.net_profit >= 0 ? '#34d399' : '#f87171', fontWeight: 'bold' }}>
                            ₩{v.net_profit?.toLocaleString()}
                          </td>
                          <td style={{ padding: '0.75rem 0.5rem', textAlign: 'right', color: '#fbbf24', fontWeight: 'bold' }}>{v.money_score || 0}점</td>
                          <td style={{ padding: '0.75rem 0.5rem', textAlign: 'center' }}>
                            <span style={{ display: 'inline-block', padding: '0.2rem 0.5rem', borderRadius: '4px', background: badgeColor, color: badgeTextColor, fontSize: '0.75rem', fontWeight: 'bold' }}>
                              {badgeLabel}
                            </span>
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            ) : (
              <div style={{ textAlign: 'center', padding: '2rem 0', color: 'var(--text-secondary)' }}>
                데이터 수집 중...
              </div>
            )}
          </div>

          {/* Correlation Engine Visualizer */}
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '2rem', flexWrap: 'wrap' }}>
            
            {/* Correlation Index Card */}
            <div className="glass-panel" style={{ padding: '1.5rem' }}>
              <h4 style={{ fontSize: '1rem', color: 'white', marginBottom: '1.25rem', borderBottom: '1px solid var(--border-color)', paddingBottom: '0.5rem', display: 'flex', alignItems: 'center', gap: '0.4rem' }}>
                <BarChart2 size={18} color="#00d2ff" />
                <span>AI 지표 상관관계 분석 지수 (Pearson Coefficient)</span>
              </h4>
              
              {correlationStats && correlationStats.available ? (
                <div style={{ display: 'flex', flexDirection: 'column', gap: '1.25rem' }}>
                  
                  <div>
                    <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.85rem', color: 'var(--text-primary)', marginBottom: '0.4rem' }}>
                      <span>첫 3초 후킹 점수 ➔ 실제 유튜브 조회수 상관관계</span>
                      <span style={{ fontWeight: 'bold', color: correlationStats.hookVsViews >= 0.5 ? '#10b981' : '#60a5fa' }}>
                        {correlationStats.hookVsViews >= 0.5 ? '🔥 강한 양의 상관관계' : '양의 상관관계'} ({correlationStats.hookVsViews})
                      </span>
                    </div>
                    <div style={{ width: '100%', height: '8px', background: 'rgba(0,0,0,0.5)', borderRadius: '4px', overflow: 'hidden' }}>
                      <div style={{ width: `${Math.round(Math.abs(correlationStats.hookVsViews) * 100)}%`, height: '100%', background: 'linear-gradient(90deg, #60a5fa 0%, #10b981 100%)' }} />
                    </div>
                  </div>

                  <div>
                    <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.85rem', color: 'var(--text-primary)', marginBottom: '0.4rem' }}>
                      <span>비주얼 정밀도 점수 ➔ 실제 시청 지속률(Retention) 상관관계</span>
                      <span style={{ fontWeight: 'bold', color: correlationStats.visualVsRetention >= 0.5 ? '#10b981' : '#60a5fa' }}>
                        {correlationStats.visualVsRetention >= 0.5 ? '🔥 강한 양의 상관관계' : '양의 상관관계'} ({correlationStats.visualVsRetention})
                      </span>
                    </div>
                    <div style={{ width: '100%', height: '8px', background: 'rgba(0,0,0,0.5)', borderRadius: '4px', overflow: 'hidden' }}>
                      <div style={{ width: `${Math.round(Math.abs(correlationStats.visualVsRetention) * 100)}%`, height: '100%', background: 'linear-gradient(90deg, #60a5fa 0%, #10b981 100%)' }} />
                    </div>
                  </div>

                  <div>
                    <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.85rem', color: 'var(--text-primary)', marginBottom: '0.4rem' }}>
                      <span>자막 레이아웃 점수 ➔ 제휴 링크 클릭률(CTR) 상관관계</span>
                      <span style={{ fontWeight: 'bold', color: correlationStats.subtitleVsCtr >= 0.5 ? '#10b981' : '#60a5fa' }}>
                        {correlationStats.subtitleVsCtr >= 0.5 ? '🔥 강한 양의 상관관계' : '양의 상관관계'} ({correlationStats.subtitleVsCtr})
                      </span>
                    </div>
                    <div style={{ width: '100%', height: '8px', background: 'rgba(0,0,0,0.5)', borderRadius: '4px', overflow: 'hidden' }}>
                      <div style={{ width: `${Math.round(Math.abs(correlationStats.subtitleVsCtr) * 100)}%`, height: '100%', background: 'linear-gradient(90deg, #60a5fa 0%, #10b981 100%)' }} />
                    </div>
                  </div>

                </div>
              ) : (
                <div style={{ textAlign: 'center', padding: '2rem 0', color: 'var(--text-secondary)' }}>
                  상관관계를 계산하기 위한 분석 데이터가 부족합니다 (최소 2개 영상의 성과 수집이 완결되어야 지수가 표기됩니다).
                </div>
              )}
            </div>

            {/* Performance Contrast Details */}
            <div className="glass-panel" style={{ padding: '1.5rem' }}>
              <h4 style={{ fontSize: '1rem', color: 'white', marginBottom: '1.25rem', borderBottom: '1px solid var(--border-color)', paddingBottom: '0.5rem', display: 'flex', alignItems: 'center', gap: '0.4rem' }}>
                <Brain size={18} color="#a78bfa" />
                <span>지표 성과 대조 통계 (Contrast Analysis)</span>
              </h4>

              {correlationStats && correlationStats.available ? (
                <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem', fontSize: '0.9rem' }}>
                  
                  <div style={{ display: 'flex', justifyContent: 'space-between', padding: '0.5rem 0', borderBottom: '1px solid rgba(255,255,255,0.04)' }}>
                    <span style={{ color: 'var(--text-secondary)' }}>후킹 점수 80점 이상 영상 평균 조회수:</span>
                    <span style={{ color: '#34d399', fontWeight: 'bold' }}>{correlationStats.highHookViewsAvg.toLocaleString()}회</span>
                  </div>

                  <div style={{ display: 'flex', justifyContent: 'space-between', padding: '0.5rem 0', borderBottom: '1px solid rgba(255,255,255,0.04)' }}>
                    <span style={{ color: 'var(--text-secondary)' }}>후킹 점수 80점 미만 영상 평균 조회수:</span>
                    <span style={{ color: '#f87171', fontWeight: 'bold' }}>{correlationStats.lowHookViewsAvg.toLocaleString()}회</span>
                  </div>

                  <div style={{ display: 'flex', justifyContent: 'space-between', padding: '0.5rem 0', borderBottom: '1px solid rgba(255,255,255,0.04)' }}>
                    <span style={{ color: 'var(--text-secondary)' }}>비주얼 점수 80점 이상 영상 시청 지속률:</span>
                    <span style={{ color: '#34d399', fontWeight: 'bold' }}>{correlationStats.highVisualRetentionAvg}%</span>
                  </div>

                  <div style={{ display: 'flex', justifyContent: 'space-between', padding: '0.5rem 0', borderBottom: '1px solid rgba(255,255,255,0.04)' }}>
                    <span style={{ color: 'var(--text-secondary)' }}>비주얼 점수 80점 미만 영상 시청 지속률:</span>
                    <span style={{ color: '#f87171', fontWeight: 'bold' }}>{correlationStats.lowVisualRetentionAvg}%</span>
                  </div>

                </div>
              ) : (
                <div style={{ textAlign: 'center', padding: '2rem 0', color: 'var(--text-secondary)' }}>
                  분석 대상 데이터 부족
                </div>
              )}
            </div>

          </div>

          {/* Success DNA vs Failure DNA vs Style DNA */}
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(320px, 1fr))', gap: '2rem', flexWrap: 'wrap' }}>
            
            <div className="glass-panel" style={{ padding: '1.5rem', border: '1px solid rgba(251,191,36,0.15)' }}>
              <h4 style={{ color: '#fbbf24', display: 'flex', alignItems: 'center', gap: '0.4rem', fontSize: '1rem', marginBottom: '1rem', borderBottom: '1px solid rgba(251,191,36,0.1)', paddingBottom: '0.5rem' }}>
                <DollarSign size={16} />
                <span>최우수 수익 DNA (상위 10% 자동 추출)</span>
              </h4>
              {revenueDnaList.length === 0 ? (
                <p style={{ color: 'var(--text-secondary)', fontSize: '0.85rem' }}>수익 영상 기준(수익성 상위 10%) 데이터를 도출하는 중입니다.</p>
              ) : (
                <div style={{ display: 'flex', flexDirection: 'column', gap: '0.8rem' }}>
                  {revenueDnaList.slice(0, 3).map((item, idx) => (
                    <div key={idx} style={{ background: 'rgba(251,191,36,0.03)', padding: '0.75rem', borderRadius: '6px', fontSize: '0.85rem' }}>
                      <div style={{ color: 'white', fontWeight: 600 }}>{item.title} (순이익: ₩{item.net_profit?.toLocaleString()})</div>
                      <div style={{ color: 'var(--text-secondary)', fontSize: '0.75rem', marginTop: '0.2rem' }}>
                        매칭 상품: {item.product_name} | Money Score: {item.money_score}점 | ROI: {item.roi}%
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>

            <div className="glass-panel" style={{ padding: '1.5rem', border: '1px solid rgba(239,68,68,0.15)' }}>
              <h4 style={{ color: '#f87171', display: 'flex', alignItems: 'center', gap: '0.4rem', fontSize: '1rem', marginBottom: '1rem', borderBottom: '1px solid rgba(239,68,68,0.1)', paddingBottom: '0.5rem' }}>
                <AlertOctagon size={16} />
                <span>최저 성과 요인 (하위 20% 자동 추출)</span>
              </h4>
              {failureDnaList.length === 0 ? (
                <p style={{ color: 'var(--text-secondary)', fontSize: '0.85rem' }}>실패 영상 원인(조회수 하위 20%) 데이터를 도출하는 중입니다.</p>
              ) : (
                <div style={{ display: 'flex', flexDirection: 'column', gap: '0.8rem' }}>
                  {failureDnaList.slice(0, 3).map((item, idx) => (
                    <div key={idx} style={{ background: 'rgba(239,68,68,0.03)', padding: '0.75rem', borderRadius: '6px', fontSize: '0.85rem' }}>
                      <div style={{ color: 'white', fontWeight: 600 }}>{item.title} (조회수: {item.views.toLocaleString()}회)</div>
                      <div style={{ color: '#f87171', fontSize: '0.75rem', marginTop: '0.2rem' }}>실패 회피 대상 요인: {item.failureFactors}</div>
                    </div>
                  ))}
                </div>
              )}
            </div>

            <div className="glass-panel" style={{ padding: '1.5rem', border: '1px solid rgba(167,139,250,0.15)' }}>
              <h4 style={{ color: '#a78bfa', display: 'flex', alignItems: 'center', gap: '0.4rem', fontSize: '1rem', marginBottom: '1rem', borderBottom: '1px solid rgba(167,139,250,0.1)', paddingBottom: '0.5rem' }}>
                <Brain size={16} />
                <span>Style DNA Database (조회수 5천+ 성공 스타일)</span>
              </h4>
              {styleDnaList.length === 0 ? (
                <p style={{ color: 'var(--text-secondary)', fontSize: '0.85rem' }}>등록된 성공 스타일 DNA가 없습니다. (시뮬레이션 조회수 5,000회 이상 시 등록)</p>
              ) : (
                <div style={{ display: 'flex', flexDirection: 'column', gap: '0.8rem' }}>
                  {styleDnaList.slice(0, 3).map((item, idx) => (
                    <div key={idx} style={{ background: 'rgba(167,139,250,0.03)', padding: '0.75rem', borderRadius: '6px', fontSize: '0.85rem' }}>
                      <div style={{ color: 'white', fontWeight: 600 }}>{item.style} DNA (조회수: {item.views?.toLocaleString()}회)</div>
                      <div style={{ color: 'var(--text-secondary)', fontSize: '0.75rem', marginTop: '0.2rem' }}>
                        대표 비디오: "{item.title}" | ROI: {item.roi}%
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>

          </div>

          {/* Daily Admin Report */}
          {dailyReport && (
            <div className="glass-panel" style={{ padding: '2rem', background: 'linear-gradient(145deg, rgba(255,255,255,0.03) 0%, rgba(52,211,153,0.04) 100%)', border: '1px solid rgba(52,211,153,0.25)' }}>
              <h3 style={{ fontSize: '1.25rem', color: '#34d399', margin: '0 0 1rem 0', display: 'flex', alignItems: 'center', gap: '0.6rem' }}>
                <Sparkles size={24} />
                <span>쇼츠 분석 연구소장 일일 관리자 비즈니스 보고서 (Auto-Generated)</span>
              </h3>
              
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '2rem', flexWrap: 'wrap', marginBottom: '1.5rem' }}>
                
                <div style={{ display: 'flex', flexDirection: 'column', gap: '0.8rem', fontSize: '0.9rem' }}>
                  <div>
                    <span style={{ color: 'var(--text-secondary)', display: 'block', fontSize: '0.8rem' }}>🔥 오늘 최고 성과 영상</span>
                    <span style={{ color: 'white', fontWeight: 600, display: 'block', marginTop: '0.2rem' }}>{dailyReport.bestVideo}</span>
                  </div>
                  <div>
                    <span style={{ color: 'var(--text-secondary)', display: 'block', fontSize: '0.8rem' }}>⚠️ 오늘 최저 성과 영상</span>
                    <span style={{ color: 'white', fontWeight: 600, display: 'block', marginTop: '0.2rem' }}>{dailyReport.worstVideo}</span>
                  </div>
                </div>

                <div style={{ display: 'flex', flexDirection: 'column', gap: '0.8rem', fontSize: '0.9rem' }}>
                  <div>
                    <span style={{ color: 'var(--text-secondary)', display: 'block', fontSize: '0.8rem' }}>🎯 가장 효과적인 후킹 문구</span>
                    <span style={{ color: 'white', fontWeight: 600, display: 'block', marginTop: '0.2rem' }}>{dailyReport.bestHook}</span>
                  </div>
                  <div>
                    <span style={{ color: 'var(--text-secondary)', display: 'block', fontSize: '0.8rem' }}>🎨 가장 효과적인 비주얼 스타일</span>
                    <span style={{ color: 'white', fontWeight: 600, display: 'block', marginTop: '0.2rem' }}>{dailyReport.bestStyle}</span>
                  </div>
                </div>

              </div>

              {/* Investment Advisor Section */}
              {dailyReport.investmentAdvisor && (
                <div style={{ borderTop: '1px solid rgba(255,255,255,0.08)', padding: '1rem 0', marginBottom: '0.5rem' }}>
                  <div style={{ fontSize: '0.85rem', fontWeight: 'bold', color: '#fbbf24', marginBottom: '0.4rem', display: 'flex', alignItems: 'center', gap: '0.4rem' }}>
                    <DollarSign size={16} /> <span>AI 자동 투자 의사결정 전략 (SaaS Investment Judgment)</span>
                  </div>
                  <p style={{ color: '#fbbf24', fontSize: '0.85rem', lineHeight: '1.7', margin: 0 }}>
                    {dailyReport.investmentAdvisor}
                  </p>
                </div>
              )}

              <div style={{ borderTop: '1px solid rgba(255,255,255,0.08)', paddingTop: '1.25rem' }}>
                <div style={{ fontSize: '0.85rem', fontWeight: 'bold', color: '#34d399', marginBottom: '0.4rem' }}>💡 다음 제작 추천 전략 가이드</div>
                <p style={{ color: 'white', fontSize: '0.9rem', lineHeight: '1.7', margin: 0 }}>
                  {dailyReport.recommendation}
                </p>
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

                {/* Monetization Attribution Details in Modal */}
                {selectedItem.postUploadAnalysis && performanceList.find(p => p.video_id === selectedItem.id) && (
                  <div style={{ gridColumn: 'span 2', background: 'rgba(251,191,36,0.02)', padding: '1.2rem', borderRadius: '8px', border: '1px solid rgba(251,191,36,0.2)' }}>
                    <h4 style={{ fontSize: '0.95rem', color: '#fbbf24', borderBottom: '1px solid rgba(251,191,36,0.15)', paddingBottom: '0.4rem', marginBottom: '0.8rem', display: 'flex', alignItems: 'center', gap: '0.4rem' }}>
                      <DollarSign size={16} /> <span>실시간 수익 정산서 (Monetization Attribution Report)</span>
                    </h4>
                    <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))', gap: '1rem', fontSize: '0.8rem' }}>
                      <div>
                        <span style={{ color: 'var(--text-secondary)' }}>영상 제작 비용:</span>{' '}
                        <span style={{ color: '#f87171', fontWeight: 'bold' }}>₩{(performanceList.find(p => p.video_id === selectedItem.id).production_cost || 1000).toLocaleString()}</span>
                      </div>
                      <div>
                        <span style={{ color: 'var(--text-secondary)' }}>유튜브 광고 수익:</span>{' '}
                        <span style={{ color: 'white' }}>₩{(performanceList.find(p => p.video_id === selectedItem.id).ad_revenue || 0).toLocaleString()}</span>
                      </div>
                      <div>
                        <span style={{ color: 'var(--text-secondary)' }}>제휴 클릭 / 전환수:</span>{' '}
                        <span style={{ color: 'white' }}>{performanceList.find(p => p.video_id === selectedItem.id).affiliate_clicks || 0}회 / {performanceList.find(p => p.video_id === selectedItem.id).affiliate_conversions || 0}건</span>
                      </div>
                      <div>
                        <span style={{ color: 'var(--text-secondary)' }}>제휴 정산 수익:</span>{' '}
                        <span style={{ color: 'white' }}>₩{(performanceList.find(p => p.video_id === selectedItem.id).affiliate_revenue || 0).toLocaleString()}</span>
                      </div>
                      <div>
                        <span style={{ color: 'var(--text-secondary)' }}>총 매출액 (Revenue):</span>{' '}
                        <span style={{ color: '#34d399', fontWeight: 'bold' }}>₩{(performanceList.find(p => p.video_id === selectedItem.id).total_revenue || 0).toLocaleString()}</span>
                      </div>
                      <div>
                        <span style={{ color: 'var(--text-secondary)' }}>순수익 (Net Profit):</span>{' '}
                        <span style={{ color: (performanceList.find(p => p.video_id === selectedItem.id).net_profit || 0) >= 0 ? '#34d399' : '#f87171', fontWeight: 'bold' }}>
                          ₩{(performanceList.find(p => p.video_id === selectedItem.id).net_profit || 0).toLocaleString()}
                        </span>
                      </div>
                      <div>
                        <span style={{ color: 'var(--text-secondary)' }}>투자대비수익률 (ROI):</span>{' '}
                        <span style={{ color: (performanceList.find(p => p.video_id === selectedItem.id).roi || 0) >= 0 ? '#34d399' : '#f87171', fontWeight: 'bold' }}>
                          {performanceList.find(p => p.video_id === selectedItem.id).roi || 0}%
                        </span>
                      </div>
                      <div>
                        <span style={{ color: 'var(--text-secondary)' }}>돈 점수 (Money Score):</span>{' '}
                        <span style={{ color: '#fbbf24', fontWeight: 'bold' }}>
                          {performanceList.find(p => p.video_id === selectedItem.id).money_score || 0}점
                        </span>
                      </div>
                    </div>
                  </div>
                )}

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
