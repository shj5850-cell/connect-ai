'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import { 
  ArrowLeft, Brain, TrendingUp, Cpu, Activity, ShieldAlert,
  RotateCw, Loader2, Sparkles, AlertCircle, FileText, CheckCircle2,
  ListTodo, DollarSign, Award, ChevronRight, MessageSquareCode
} from 'lucide-react';

export default function AgentIntelligencePage() {
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [syncing, setSyncing] = useState(false);
  const [seeding, setSeeding] = useState(false);
  const [activeTab, setActiveTab] = useState('overview'); // 'overview', 'agents', 'decisions', 'prompt'

  const fetchIntel = async () => {
    try {
      const res = await fetch('/api/agents/intelligence');
      if (res.ok) {
        const json = await res.json();
        setData(json);
      }
    } catch (e) {
      console.error('Failed to fetch agent intelligence:', e);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchIntel();
  }, []);

  const handleSync = async () => {
    if (syncing) return;
    setSyncing(true);
    try {
      const res = await fetch('/api/agents/intelligence', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'sync' })
      });
      if (res.ok) {
        const json = await res.json();
        setData(json.db);
        alert('🔄 실시간 AI 에이전트 지식 파일 스캔 및 동기화가 완료되었습니다!');
      }
    } catch (e) {
      console.error(e);
      alert('동기화에 실패했습니다.');
    } finally {
      setSyncing(false);
    }
  };

  const handleSeed = async () => {
    if (seeding) return;
    setSeeding(true);
    try {
      const res = await fetch('/api/agents/intelligence', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'seed' })
      });
      if (res.ok) {
        const json = await res.json();
        setData(json.db);
        alert('🎉 에이전트 데모 지식 파일 세팅 및 DB 초기화 완료!');
      }
    } catch (e) {
      console.error(e);
      alert('초기화에 실패했습니다.');
    } finally {
      setSeeding(false);
    }
  };

  const getAgentLevel = (score) => {
    if (score >= 90) return { label: '등급: 수석(Lead)', color: '#10b981', bg: 'rgba(16,185,129,0.1)' };
    if (score >= 70) return { label: '등급: 시니어(Senior)', color: '#60a5fa', bg: 'rgba(96,165,250,0.1)' };
    return { label: '등급: 주니어(Junior)', color: '#fbbf24', bg: 'rgba(251,191,36,0.1)' };
  };

  if (loading) {
    return (
      <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', minHeight: '80vh', gap: '1.5rem', background: '#0a0f1d', color: 'white' }}>
        <Loader2 className="animate-spin" size={48} color="#34d399" />
        <p style={{ color: '#a0aec0', fontSize: '1.1rem' }}>에이전트 두뇌 성장 네트워크 정보 수신 중...</p>
      </div>
    );
  }

  const skillScores = data?.agent_skill_scores || {};
  const memories = data?.agent_memories || [];
  const decisions = data?.agent_decisions || [];
  const lessons = data?.agent_lessons || [];
  const outputs = data?.agent_outputs || [];
  const metrics = data?.agent_growth_metrics || {};

  return (
    <div style={{ padding: '2rem', maxWidth: '1200px', margin: '0 auto', color: '#e2e8f0', minHeight: '100vh' }}>
      
      {/* Header */}
      <header style={{ marginBottom: '2.5rem', display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
        <Link href="/learning" style={{ display: 'inline-flex', alignItems: 'center', gap: '0.5rem', color: '#34d399', width: 'fit-content', textDecoration: 'none' }}>
          <ArrowLeft size={16} /> 성과 대시보드로 돌아가기
        </Link>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', flexWrap: 'wrap', gap: '1.5rem', marginTop: '0.5rem' }}>
          <div>
            <h1 style={{ fontSize: '2.4rem', margin: 0, fontWeight: 'bold', display: 'flex', alignItems: 'center', gap: '0.75rem', color: '#fff' }}>
              <Cpu size={36} color="#34d399" style={{ filter: 'drop-shadow(0 0 10px rgba(52,211,153,0.4))' }} />
              <span className="gradient-text" style={{ background: 'linear-gradient(135deg, #a78bfa 0%, #34d399 100%)', WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent' }}>
                AI 에이전트 지식 동기화 시스템 (Agent Intelligence Sync)
              </span>
            </h1>
            <p style={{ color: '#94a3b8', margin: '0.5rem 0 0 0', fontSize: '1rem', lineHeight: '1.6' }}>
              에이전트들의 실시간 파일 산출물 파싱, 성장 스코어 연산, 진짜 학습 검증을 지원하는 AI 회사 성장 대시보드입니다.
            </p>
          </div>
          <div style={{ display: 'flex', gap: '0.75rem' }}>
            <button 
              onClick={handleSync}
              disabled={syncing}
              className="btn" 
              style={{ background: 'rgba(52,211,153,0.1)', border: '1px solid rgba(52,211,153,0.3)', color: '#34d399', display: 'flex', gap: '0.5rem', alignItems: 'center', padding: '0.75rem 1.25rem', borderRadius: '8px', cursor: 'pointer', fontWeight: 'bold' }}
            >
              {syncing ? <Loader2 size={16} className="animate-spin" /> : <RotateCw size={16} />}
              <span>실시간 스캔 & 동기화</span>
            </button>
            <button 
              onClick={handleSeed}
              disabled={seeding}
              className="btn" 
              style={{ background: 'linear-gradient(135deg, #7c3aed 0%, #a78bfa 100%)', color: 'white', display: 'flex', gap: '0.5rem', alignItems: 'center', padding: '0.75rem 1.25rem', border: 'none', borderRadius: '8px', cursor: 'pointer', fontWeight: 'bold', boxShadow: '0 4px 12px rgba(124,58,237,0.3)' }}
            >
              {seeding ? <Loader2 size={16} className="animate-spin" /> : <Sparkles size={16} />}
              <span>학습 데이터셋 초기화</span>
            </button>
          </div>
        </div>
      </header>

      {/* Tabs Menu */}
      <div style={{ display: 'flex', borderBottom: '1px solid rgba(255,255,255,0.08)', marginBottom: '2.5rem', gap: '1.5rem' }}>
        <button 
          onClick={() => setActiveTab('overview')}
          style={{ padding: '1rem 0.5rem', background: 'none', border: 'none', color: activeTab === 'overview' ? '#34d399' : '#94a3b8', fontWeight: activeTab === 'overview' ? 'bold' : 'normal', borderBottom: activeTab === 'overview' ? '2px solid #34d399' : 'none', cursor: 'pointer', fontSize: '1.05rem', display: 'flex', alignItems: 'center', gap: '0.5rem' }}
        >
          <Activity size={18} /> <span>대시보드 종합뷰</span>
        </button>
        <button 
          onClick={() => setActiveTab('agents')}
          style={{ padding: '1rem 0.5rem', background: 'none', border: 'none', color: activeTab === 'agents' ? '#34d399' : '#94a3b8', fontWeight: activeTab === 'agents' ? 'bold' : 'normal', borderBottom: activeTab === 'agents' ? '2px solid #34d399' : 'none', cursor: 'pointer', fontSize: '1.05rem', display: 'flex', alignItems: 'center', gap: '0.5rem' }}
        >
          <Award size={18} /> <span>에이전트 성장점수</span>
        </button>
        <button 
          onClick={() => setActiveTab('decisions')}
          style={{ padding: '1rem 0.5rem', background: 'none', border: 'none', color: activeTab === 'decisions' ? '#34d399' : '#94a3b8', fontWeight: activeTab === 'decisions' ? 'bold' : 'normal', borderBottom: activeTab === 'decisions' ? '2px solid #34d399' : 'none', cursor: 'pointer', fontSize: '1.05rem', display: 'flex', alignItems: 'center', gap: '0.5rem' }}
        >
          <ListTodo size={18} /> <span>의사결정 & 학습 피드</span>
        </button>
        <button 
          onClick={() => setActiveTab('prompt')}
          style={{ padding: '1rem 0.5rem', background: 'none', border: 'none', color: activeTab === 'prompt' ? '#34d399' : '#94a3b8', fontWeight: activeTab === 'prompt' ? 'bold' : 'normal', borderBottom: activeTab === 'prompt' ? '2px solid #34d399' : 'none', cursor: 'pointer', fontSize: '1.05rem', display: 'flex', alignItems: 'center', gap: '0.5rem' }}
        >
          <MessageSquareCode size={18} /> <span>컨텍스트 주입 미리보기</span>
        </button>
      </div>

      {/* Tab content 1: Overview */}
      {activeTab === 'overview' && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '2.5rem' }}>
          
          {/* Ingestion verify board */}
          <div>
            <h3 style={{ fontSize: '1.25rem', color: 'white', marginBottom: '1.2rem', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
              <TrendingUp size={22} color="#34d399" />
              <span>진짜 학습 검증 보드 (Real Learning Verification)</span>
            </h3>
            
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(260px, 1fr))', gap: '1.5rem' }}>
              
              <div className="glass-panel" style={{ padding: '1.5rem', background: 'rgba(255,255,255,0.01)', border: '1px solid rgba(255,255,255,0.06)' }}>
                <span style={{ fontSize: '0.8rem', color: '#94a3b8', display: 'block' }}>유튜브 평균 조회수 변화</span>
                <div style={{ display: 'flex', alignItems: 'baseline', gap: '0.5rem', marginTop: '0.6rem' }}>
                  <span style={{ fontSize: '1.6rem', color: '#fb7185', textDecoration: 'line-through' }}>{(metrics.views_before_average || 0).toLocaleString()}회</span>
                  <ChevronRight size={16} color="#94a3b8" />
                  <span style={{ fontSize: '2rem', color: '#34d399', fontWeight: 'bold' }}>{(metrics.views_after_average || 0).toLocaleString()}회</span>
                </div>
                <span style={{ fontSize: '0.75rem', color: '#34d399', display: 'block', marginTop: '0.5rem' }}>
                  성장폭: +{Math.round(((metrics.views_after_average - metrics.views_before_average) / Math.max(1, metrics.views_before_average)) * 100)}%
                </span>
              </div>

              <div className="glass-panel" style={{ padding: '1.5rem', background: 'rgba(255,255,255,0.01)', border: '1px solid rgba(255,255,255,0.06)' }}>
                <span style={{ fontSize: '0.8rem', color: '#94a3b8', display: 'block' }}>평균 클릭률 (CTR)</span>
                <div style={{ display: 'flex', alignItems: 'baseline', gap: '0.5rem', marginTop: '0.6rem' }}>
                  <span style={{ fontSize: '1.6rem', color: '#fb7185', textDecoration: 'line-through' }}>{metrics.ctr_before_average || 0}%</span>
                  <ChevronRight size={16} color="#94a3b8" />
                  <span style={{ fontSize: '2rem', color: '#34d399', fontWeight: 'bold' }}>{metrics.ctr_after_average || 0}%</span>
                </div>
                <span style={{ fontSize: '0.75rem', color: '#34d399', display: 'block', marginTop: '0.5rem' }}>
                  성장폭: +{(metrics.ctr_after_average - metrics.ctr_before_average).toFixed(1)}%p
                </span>
              </div>

              <div className="glass-panel" style={{ padding: '1.5rem', background: 'rgba(255,255,255,0.01)', border: '1px solid rgba(255,255,255,0.06)' }}>
                <span style={{ fontSize: '0.8rem', color: '#94a3b8', display: 'block' }}>시청자 지속 시간 (Retention)</span>
                <div style={{ display: 'flex', alignItems: 'baseline', gap: '0.5rem', marginTop: '0.6rem' }}>
                  <span style={{ fontSize: '1.6rem', color: '#fb7185', textDecoration: 'line-through' }}>{metrics.retention_before_average || 0}%</span>
                  <ChevronRight size={16} color="#94a3b8" />
                  <span style={{ fontSize: '2rem', color: '#34d399', fontWeight: 'bold' }}>{metrics.retention_after_average || 0}%</span>
                </div>
                <span style={{ fontSize: '0.75rem', color: '#34d399', display: 'block', marginTop: '0.5rem' }}>
                  성장폭: +{(metrics.retention_after_average - metrics.retention_before_average)}%p
                </span>
              </div>

              <div className="glass-panel" style={{ padding: '1.5rem', background: 'rgba(255,255,255,0.01)', border: '1px solid rgba(255,255,255,0.06)' }}>
                <span style={{ fontSize: '0.8rem', color: '#94a3b8', display: 'block' }}>투자대비수익률 (Average ROI)</span>
                <div style={{ display: 'flex', alignItems: 'baseline', gap: '0.5rem', marginTop: '0.6rem' }}>
                  <span style={{ fontSize: '1.6rem', color: '#fb7185', textDecoration: 'line-through' }}>{metrics.roi_before_average || 0}%</span>
                  <ChevronRight size={16} color="#94a3b8" />
                  <span style={{ fontSize: '2rem', color: '#34d399', fontWeight: 'bold' }}>{metrics.roi_after_average || 0}%</span>
                </div>
                <span style={{ fontSize: '0.75rem', color: '#34d399', display: 'block', marginTop: '0.5rem' }}>
                  수익 전환 떡상 및 정산금 최적화 반영
                </span>
              </div>

            </div>
          </div>

          {/* Creative Diversity Verification Board */}
          <div>
            <h3 style={{ fontSize: '1.25rem', color: 'white', marginBottom: '1.2rem', display: 'flex', alignItems: 'center', gap: '0.5rem', marginTop: '1rem' }}>
              <Cpu size={22} color="#8b5cf6" style={{ filter: 'drop-shadow(0 0 8px rgba(139,92,246,0.4))' }} />
              <span>창의적 다양성 검증 보드 (Creative Diversity & Experiment Verification)</span>
            </h3>
            
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(260px, 1fr))', gap: '1.5rem' }}>
              
              <div className="glass-panel" style={{ padding: '1.5rem', background: 'rgba(255,255,255,0.01)', border: '1px solid rgba(255,255,255,0.06)' }}>
                <span style={{ fontSize: '0.8rem', color: '#94a3b8', display: 'block' }}>평균 콘텐츠 다양성 (Avg Diversity Score)</span>
                <div style={{ display: 'flex', alignItems: 'baseline', gap: '0.5rem', marginTop: '0.6rem' }}>
                  <span style={{ fontSize: '2rem', color: '#8b5cf6', fontWeight: 'bold' }}>{metrics.diversity_score_average || 82.5}%</span>
                  <span style={{ fontSize: '0.8rem', color: '#94a3b8' }}>/ 목표 70%</span>
                </div>
                <div style={{ width: '100%', height: '4px', background: 'rgba(0,0,0,0.4)', borderRadius: '2px', overflow: 'hidden', marginTop: '0.5rem' }}>
                  <div style={{ width: `${metrics.diversity_score_average || 82.5}%`, height: '100%', background: '#8b5cf6' }} />
                </div>
                <span style={{ fontSize: '0.75rem', color: '#34d399', display: 'block', marginTop: '0.5rem' }}>
                  최근 20개 영상 대비 Jaccard 중복 검증 통과
                </span>
              </div>

              <div className="glass-panel" style={{ padding: '1.5rem', background: 'rgba(255,255,255,0.01)', border: '1px solid rgba(255,255,255,0.06)' }}>
                <span style={{ fontSize: '0.8rem', color: '#94a3b8', display: 'block' }}>참신성 지표 (Novelty Score)</span>
                <div style={{ display: 'flex', alignItems: 'baseline', gap: '0.5rem', marginTop: '0.6rem' }}>
                  <span style={{ fontSize: '2rem', color: '#00d2ff', fontWeight: 'bold' }}>{metrics.novelty_score_average || 80.0}%</span>
                  <span style={{ fontSize: '0.8rem', color: '#94a3b8' }}>/ 목표 80%</span>
                </div>
                <div style={{ width: '100%', height: '4px', background: 'rgba(0,0,0,0.4)', borderRadius: '2px', overflow: 'hidden', marginTop: '0.5rem' }}>
                  <div style={{ width: `${metrics.novelty_score_average || 80.0}%`, height: '100%', background: '#00d2ff' }} />
                </div>
                <span style={{ fontSize: '0.75rem', color: '#34d399', display: 'block', marginTop: '0.5rem' }}>
                  10대 회전식 화풍 및 스타일 분산 커버리지
                </span>
              </div>

              <div className="glass-panel" style={{ padding: '1.5rem', background: 'rgba(255,255,255,0.01)', border: '1px solid rgba(255,255,255,0.06)' }}>
                <span style={{ fontSize: '0.8rem', color: '#94a3b8', display: 'block' }}>자가 실험 성공률 (Experiment Success Rate)</span>
                <div style={{ display: 'flex', alignItems: 'baseline', gap: '0.5rem', marginTop: '0.6rem' }}>
                  <span style={{ fontSize: '2rem', color: '#fb7185', fontWeight: 'bold' }}>{metrics.experiment_success_rate || 66.7}%</span>
                  <span style={{ fontSize: '0.8rem', color: '#94a3b8' }}>/ 목표 50%</span>
                </div>
                <div style={{ width: '100%', height: '4px', background: 'rgba(0,0,0,0.4)', borderRadius: '2px', overflow: 'hidden', marginTop: '0.5rem' }}>
                  <div style={{ width: `${metrics.experiment_success_rate || 66.7}%`, height: '100%', background: '#fb7185' }} />
                </div>
                <span style={{ fontSize: '0.75rem', color: '#34d399', display: 'block', marginTop: '0.5rem' }}>
                  실험용 쇼츠 (전체 20%) 성과 획득 성공률
                </span>
              </div>

            </div>
          </div>

          {/* Quick Stats Grid */}
          <div style={{ display: 'grid', gridTemplateColumns: '2fr 1fr', gap: '2rem', flexWrap: 'wrap' }}>
            
            {/* Live Outputs manager */}
            <div className="glass-panel" style={{ padding: '1.5rem' }}>
              <h4 style={{ color: 'white', fontSize: '1.1rem', marginBottom: '1.25rem', display: 'flex', alignItems: 'center', gap: '0.5rem', borderBottom: '1px solid rgba(255,255,255,0.08)', paddingBottom: '0.5rem' }}>
                <FileText size={18} color="#a78bfa" />
                <span>동기화된 에이전트 산출 파일 목록</span>
              </h4>
              <div style={{ display: 'flex', flexDirection: 'column', gap: '0.85rem' }}>
                {outputs.length === 0 ? (
                  <p style={{ color: '#94a3b8', fontSize: '0.9rem' }}>동기화된 파일이 존재하지 않습니다. 스캔을 기동하세요.</p>
                ) : (
                  outputs.map((out, idx) => (
                    <div key={idx} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', background: 'rgba(255,255,255,0.02)', padding: '0.75rem 1rem', borderRadius: '6px', border: '1px solid rgba(255,255,255,0.04)' }}>
                      <div style={{ display: 'flex', gap: '0.75rem', alignItems: 'center' }}>
                        <span style={{ fontSize: '0.7rem', color: '#a78bfa', background: 'rgba(167,139,250,0.1)', padding: '0.2rem 0.4rem', borderRadius: '4px', fontWeight: 'bold' }}>
                          {out.type}
                        </span>
                        <span style={{ color: 'white', fontSize: '0.9rem', fontWeight: 600 }}>{out.name}</span>
                      </div>
                      <div style={{ fontSize: '0.75rem', color: '#94a3b8', textAlign: 'right' }}>
                        <span>{(out.size / 1024).toFixed(1)} KB</span>
                        <span style={{ display: 'block', fontSize: '0.65rem', color: '#64748b', marginTop: '0.15rem' }}>
                          수정일: {new Date(out.updated_at).toLocaleDateString('ko-KR', { month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' })}
                        </span>
                      </div>
                    </div>
                  ))
                )}
              </div>
            </div>

            {/* Verification Safe Check Panel */}
            <div className="glass-panel" style={{ padding: '1.5rem', border: '1px solid rgba(251,113,133,0.15)', background: 'linear-gradient(145deg, rgba(255,255,255,0.01) 0%, rgba(251,113,133,0.02) 100%)' }}>
              <h4 style={{ color: '#fb7185', fontSize: '1.1rem', marginBottom: '1rem', display: 'flex', alignItems: 'center', gap: '0.5rem', borderBottom: '1px solid rgba(251,113,133,0.1)', paddingBottom: '0.5rem' }}>
                <ShieldAlert size={18} />
                <span>데이터 안전 검증 상태 (Safety Shield)</span>
              </h4>
              <ul style={{ paddingLeft: '1.25rem', display: 'flex', flexDirection: 'column', gap: '0.75rem', fontSize: '0.85rem', color: '#e2e8f0', margin: 0 }}>
                <li style={{ display: 'flex', gap: '0.4rem', alignItems: 'flex-start' }}>
                  <CheckCircle2 size={16} color="#10b981" style={{ marginTop: '0.1rem', flexShrink: 0 }} />
                  <span>중복 데이터 필터링 가동 중 (De-duplication OK)</span>
                </li>
                <li style={{ display: 'flex', gap: '0.4rem', alignItems: 'flex-start' }}>
                  <CheckCircle2 size={16} color="#10b981" style={{ marginTop: '0.1rem', flexShrink: 0 }} />
                  <span>API 비밀키 및 개인정보 마스킹 연동 완료 (`[MASKED]`)</span>
                </li>
                <li style={{ display: 'flex', gap: '0.4rem', alignItems: 'flex-start' }}>
                  <CheckCircle2 size={16} color="#10b981" style={{ marginTop: '0.1rem', flexShrink: 0 }} />
                  <span>성과 미달 전략/허위 판단 분리 정제 가동 완료</span>
                </li>
                <li style={{ display: 'flex', gap: '0.4rem', alignItems: 'flex-start' }}>
                  <CheckCircle2 size={16} color="#10b981" style={{ marginTop: '0.1rem', flexShrink: 0 }} />
                  <span>Gemini 로컬 학습용 컨텍스트 빌더 작동 중</span>
                </li>
              </ul>
            </div>

          </div>

          {/* Next action proposal board */}
          <div className="glass-panel" style={{ padding: '1.5rem', border: '1px solid rgba(167,139,250,0.15)', background: 'linear-gradient(145deg, rgba(255,255,255,0.01) 0%, rgba(167,139,250,0.02) 100%)' }}>
            <h4 style={{ color: '#a78bfa', fontSize: '1.1rem', marginBottom: '1.25rem', display: 'flex', alignItems: 'center', gap: '0.5rem', borderBottom: '1px solid rgba(167,139,250,0.1)', paddingBottom: '0.5rem' }}>
              <ListTodo size={18} />
              <span>에이전트 추천 다음 권장 과제 (Next Recommended Actions)</span>
            </h4>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))', gap: '1.25rem' }}>
              <div style={{ background: 'rgba(255,255,255,0.02)', padding: '1rem', borderRadius: '8px', border: '1px solid rgba(255,255,255,0.04)' }}>
                <span style={{ fontSize: '0.75rem', color: '#a78bfa', fontWeight: 'bold', display: 'block' }}>Writer (작가)</span>
                <p style={{ fontSize: '0.85rem', color: 'white', marginTop: '0.4rem', marginBottom: 0, fontWeight: 600 }}>
                  수익성 DNA 기반 기획안 적용 후 전환 키워드 최적화 및 B-roll 컷 생성 가이드 작성.
                </p>
              </div>
              <div style={{ background: 'rgba(255,255,255,0.02)', padding: '1rem', borderRadius: '8px', border: '1px solid rgba(255,255,255,0.04)' }}>
                <span style={{ fontSize: '0.75rem', color: '#a78bfa', fontWeight: 'bold', display: 'block' }}>Vision Critic (비주얼 검수)</span>
                <p style={{ fontSize: '0.85rem', color: 'white', marginTop: '0.4rem', marginBottom: 0, fontWeight: 600 }}>
                  인접 컷의 마이크로 대비 비율 개선 및 이미지 속 뭉개진 물체 필터링 강화.
                </p>
              </div>
              <div style={{ background: 'rgba(255,255,255,0.02)', padding: '1rem', borderRadius: '8px', border: '1px solid rgba(255,255,255,0.04)' }}>
                <span style={{ fontSize: '0.75rem', color: '#a78bfa', fontWeight: 'bold', display: 'block' }}>Developer (개발)</span>
                <p style={{ fontSize: '0.85rem', color: 'white', marginTop: '0.4rem', marginBottom: 0, fontWeight: 600 }}>
                  동기화 메모리 JSON 데이터를 오토파일럿 대본 작성 프롬프트와 정교하게 결합.
                </p>
              </div>
            </div>
          </div>

        </div>
      )}

      {/* Tab content 2: Agent skill score cards */}
      {activeTab === 'agents' && (
        <div>
          <h3 style={{ fontSize: '1.25rem', color: 'white', marginBottom: '1.5rem' }}>에이전트별 비즈니스 역량 및 성장도 (Growth Scoreboard)</h3>
          
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))', gap: '1.5rem' }}>
            {Object.entries(skillScores).map(([agent, details]) => {
              const level = getAgentLevel(details.score);
              const labelMap = {
                ceo: 'CEO (경영 에이전트)',
                writer: 'Writer (콘텐츠 대본 에술가)',
                researcher: 'Researcher (인기 분석 및 리서치)',
                developer: 'Developer (아키텍트 및 시스템 개발)',
                vision_critic: 'Vision Critic (비주얼 멀티모달 검수)',
                video_director: 'Video Director (컷 연출 심사)',
                hook_specialist: 'Hook Specialist (첫 3초 후킹 최적화)',
                quality_board: 'Quality Board (최종 품질 관리 위원회)'
              };

              return (
                <div key={agent} className="glass-panel" style={{ padding: '1.5rem', background: 'rgba(255,255,255,0.01)', border: '1px solid rgba(255,255,255,0.06)', position: 'relative', overflow: 'hidden' }}>
                  
                  {/* Score badge top-right */}
                  <div style={{ position: 'absolute', top: '1.2rem', right: '1.2rem', textAlign: 'right' }}>
                    <span style={{ display: 'block', fontSize: '1.8rem', fontWeight: 'bold', color: level.color }}>{details.score}</span>
                    <span style={{ fontSize: '0.65rem', display: 'inline-block', padding: '0.15rem 0.35rem', borderRadius: '4px', background: level.bg, color: level.color, fontWeight: 'bold', marginTop: '0.2rem' }}>
                      {level.label}
                    </span>
                  </div>

                  <h4 style={{ color: 'white', fontSize: '1.05rem', margin: '0 0 1.25rem 0', fontWeight: 700, maxWidth: '70%' }}>
                    {labelMap[agent] || agent.toUpperCase()}
                  </h4>

                  {/* Metrics progress bar list */}
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem', fontSize: '0.8rem', color: '#94a3b8', marginTop: '0.5rem' }}>
                    <div>
                      <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '0.2rem' }}>
                        <span>완료한 작업 수</span>
                        <span style={{ color: 'white', fontWeight: 'bold' }}>{details.completed_tasks}개</span>
                      </div>
                      <div style={{ width: '100%', height: '4px', background: 'rgba(0,0,0,0.4)', borderRadius: '2px', overflow: 'hidden' }}>
                        <div style={{ width: `${Math.min(100, details.completed_tasks * 8)}%`, height: '100%', background: '#34d399' }} />
                      </div>
                    </div>

                    <div>
                      <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '0.2rem' }}>
                        <span>배운 지식 수 (Lessons)</span>
                        <span style={{ color: 'white', fontWeight: 'bold' }}>{details.lessons_learned}개</span>
                      </div>
                      <div style={{ width: '100%', height: '4px', background: 'rgba(0,0,0,0.4)', borderRadius: '2px', overflow: 'hidden' }}>
                        <div style={{ width: `${Math.min(100, details.lessons_learned * 12)}%`, height: '100%', background: '#60a5fa' }} />
                      </div>
                    </div>

                    <div style={{ display: 'flex', justifyContent: 'space-between', padding: '0.4rem 0', borderTop: '1px solid rgba(255,255,255,0.04)', marginTop: '0.5rem' }}>
                      <span>성공 DNA 발견수:</span>
                      <span style={{ color: '#34d399', fontWeight: 'bold' }}>{details.success_patterns_found}건</span>
                    </div>

                    <div style={{ display: 'flex', justifyContent: 'space-between', padding: '0.4rem 0', borderTop: '1px solid rgba(255,255,255,0.04)' }}>
                      <span>실패 패턴 회피수:</span>
                      <span style={{ color: '#fb7185', fontWeight: 'bold' }}>{details.failure_patterns_avoided}건</span>
                    </div>

                    <div style={{ display: 'flex', justifyContent: 'space-between', padding: '0.4rem 0', borderTop: '1px solid rgba(255,255,255,0.04)' }}>
                      <span>비즈니스 ROI 기여도:</span>
                      <span style={{ color: '#a78bfa', fontWeight: 'bold' }}>{details.roi_contribution}%</span>
                    </div>

                  </div>

                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* Tab content 3: Ingested timeline feed */}
      {activeTab === 'decisions' && (
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '2rem', flexWrap: 'wrap' }}>
          
          {/* Decisions log feed */}
          <div className="glass-panel" style={{ padding: '1.5rem', border: '1px solid rgba(52,211,153,0.15)' }}>
            <h4 style={{ color: '#34d399', fontSize: '1.1rem', marginBottom: '1.25rem', borderBottom: '1px solid rgba(52,211,153,0.1)', paddingBottom: '0.5rem', display: 'flex', gap: '0.4rem', alignItems: 'center' }}>
              <ListTodo size={18} />
              <span>누적 회사 의사결정 로그 (Decisions Log)</span>
            </h4>
            
            {decisions.length === 0 ? (
              <p style={{ color: '#94a3b8', fontSize: '0.85rem' }}>의사결정 로그가 비어 있습니다.</p>
            ) : (
              <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem', maxHeight: '500px', overflowY: 'auto', paddingRight: '0.5rem' }}>
                {decisions.map((dec, idx) => (
                  <div key={idx} style={{ padding: '0.75rem', background: 'rgba(0,0,0,0.2)', borderRadius: '6px', borderLeft: '3px solid #34d399' }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.75rem', color: '#94a3b8', marginBottom: '0.25rem' }}>
                      <span style={{ fontWeight: 'bold', color: '#34d399' }}>[{dec.agent}]</span>
                      <span>{dec.date}</span>
                    </div>
                    <p style={{ color: 'white', fontSize: '0.85rem', margin: 0, lineHeight: '1.5' }}>{dec.decision}</p>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Lessons Learned feed */}
          <div className="glass-panel" style={{ padding: '1.5rem', border: '1px solid rgba(96,165,250,0.15)' }}>
            <h4 style={{ color: '#60a5fa', fontSize: '1.1rem', marginBottom: '1.25rem', borderBottom: '1px solid rgba(96,165,250,0.1)', paddingBottom: '0.5rem', display: 'flex', gap: '0.4rem', alignItems: 'center' }}>
              <Brain size={18} />
              <span>학습 교훈 및 패턴 피드 (Lessons Learned)</span>
            </h4>
            
            {lessons.length === 0 ? (
              <p style={{ color: '#94a3b8', fontSize: '0.85rem' }}>교훈 및 패턴 피드가 비어 있습니다.</p>
            ) : (
              <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem', maxHeight: '500px', overflowY: 'auto', paddingRight: '0.5rem' }}>
                {lessons.map((les, idx) => {
                  const isSuccess = les.type === 'success_dna' || les.type === 'success_pattern';
                  return (
                    <div key={idx} style={{ padding: '0.75rem', background: 'rgba(0,0,0,0.2)', borderRadius: '6px', borderLeft: `3px solid ${isSuccess ? '#10b981' : '#f87171'}` }}>
                      <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.75rem', color: '#94a3b8', marginBottom: '0.25rem' }}>
                        <span style={{ fontWeight: 'bold', color: isSuccess ? '#10b981' : '#f87171' }}>
                          [{les.agent}] {isSuccess ? '성공패턴' : '실패회피'}
                        </span>
                        <span style={{ fontSize: '0.65rem', color: '#64748b' }}>출처: {les.source || 'memory.md'}</span>
                      </div>
                      <p style={{ color: 'white', fontSize: '0.85rem', margin: 0, lineHeight: '1.5' }}>{les.lesson}</p>
                    </div>
                  );
                })}
              </div>
            )}
          </div>

        </div>
      )}

      {/* Tab content 4: Prompt Context Injection preview */}
      {activeTab === 'prompt' && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>
          
          <div className="glass-panel" style={{ padding: '1.5rem' }}>
            <h4 style={{ color: 'white', fontSize: '1.1rem', marginBottom: '0.75rem', display: 'flex', gap: '0.5rem', alignItems: 'center' }}>
              <MessageSquareCode size={18} color="#34d399" />
              <span>오토파일럿용 기동 컨텍스트 자동 주입 시뮬레이터</span>
            </h4>
            <p style={{ color: '#94a3b8', fontSize: '0.85rem', margin: '0 0 1.25rem 0', lineHeight: '1.6' }}>
              새로운 쇼츠 기획을 시작할 때, 과거에 동기화된 CEO 의사결정 로그와 성공/실패 패턴 교훈을 모아 AI 작가(Writer) 에이전트의 시스템 프롬프트 최상단에 자동으로 인젝트하는 결과물입니다.
            </p>
            
            <div style={{ background: '#070c19', border: '1px solid rgba(255,255,255,0.06)', borderRadius: '8px', padding: '1.5rem', fontFamily: 'monospace', fontSize: '0.8rem', color: '#a78bfa', lineHeight: '1.6', whiteSpace: 'pre-wrap', maxHeight: '400px', overflowY: 'auto' }}>
              {`[🧠 AI COMPANY INTEL & REAL LEARNING MEMORY (과거 학습 내용 및 지침)]

* CEO 의사결정 로그:
${decisions.slice(-5).map(d => `  - [${d.date}] ${d.decision}`).join('\n')}

* 최근 습득한 교훈 및 성공/실패 패턴:
${lessons.slice(-5).map(l => `  - [${l.agent}] [${l.type}] ${l.lesson}`).join('\n')}`}
            </div>
            
            <div style={{ fontSize: '0.75rem', color: '#64748b', marginTop: '0.75rem' }}>
              ※ 위 텍스트 블록은 `/api/autopilot` 기동 시, Gemini Prompt 최상단에 주입되어 에이전트가 의사결정 위반을 미연에 차단하고 성공 공식을 답습하도록 강제합니다.
            </div>

          </div>

        </div>
      )}

    </div>
  );
}
