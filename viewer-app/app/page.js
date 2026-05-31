import Link from 'next/link';
import { 
  getSessions, 
  getAgents, 
  getLatestSummary, 
  getCompanyDirection, 
  getMonetizationProgress,
  getActiveAgents,
  getRecentTasks
} from './lib/api';
import { 
  Bot, Calendar, ChevronRight, Activity, Lightbulb, CheckCircle2, 
  Target, Route, Flame, User, Video, PenTool, Palette, Camera, 
  Briefcase, Code, Search, Cpu, Check, Clock
} from 'lucide-react';
import ReactMarkdown from 'react-markdown';
import AutoRefresh from './components/AutoRefresh';

function getAgentIcon(agentName) {
  switch (agentName.toLowerCase()) {
    case 'secretary':
    case '영숙':
      return <User size={18} color="#a78bfa" />;
    case 'youtube':
      return <Video size={18} color="#f87171" />;
    case 'writer':
      return <PenTool size={18} color="#f472b6" />;
    case 'designer':
      return <Palette size={18} color="#34d399" />;
    case 'instagram':
      return <Camera size={18} color="#fb7185" />;
    case 'business':
    case '현빈':
      return <Briefcase size={18} color="#fbbf24" />;
    case 'developer':
      return <Code size={18} color="#60a5fa" />;
    case 'researcher':
      return <Search size={18} color="#2dd4bf" />;
    default:
      return <Cpu size={18} color="#94a3b8" />;
  }
}

function getAgentKoreanName(agentName) {
  const mapping = {
    secretary: '영숙 (비서)',
    youtube: '유튜브 관리자',
    writer: '콘텐츠 작가',
    designer: 'UI/UX 디자이너',
    instagram: '인스타그램 빌더',
    business: '현빈 (전략가)',
    developer: '개발자 에이전트',
    researcher: '시장 분석가'
  };
  return mapping[agentName.toLowerCase()] || agentName;
}

function formatTime(isoString) {
  if (!isoString) return '';
  const date = new Date(isoString);
  return date.toLocaleTimeString('ko-KR', { hour: '2-digit', minute: '2-digit' });
}


export default function Home() {
  const sessions = getSessions();
  const agents = getAgents();
  const latestSummary = getLatestSummary();
  const direction = getCompanyDirection();
  const progress = getMonetizationProgress();
  const activeAgents = getActiveAgents();
  const recentTasks = getRecentTasks();

  return (
    <div className="container">
      <AutoRefresh interval={3000} />
      <header className="header" style={{ marginBottom: '2rem' }}>
        <div>
          <h1 className="title gradient-text">Connect AI Company</h1>
          <p style={{ color: 'var(--text-secondary)', marginTop: '0.5rem' }}>
            에이전트 작업물 및 세션 실시간 대시보드
          </p>
        </div>
        <div style={{ display: 'flex', gap: '1rem' }}>
          <div className="glass-panel" style={{ padding: '0.5rem 1rem', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
            <Activity size={18} color="var(--accent-secondary)" />
            <span style={{ fontWeight: 500 }}>{sessions.length} Sessions</span>
          </div>
          <div className="glass-panel" style={{ padding: '0.5rem 1rem', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
            <Bot size={18} color="var(--accent-color)" />
            <span style={{ fontWeight: 500 }}>{agents.length} Agents</span>
          </div>
        </div>
      </header>

      {/* Monetization Progress Bar */}
      <section style={{ marginBottom: '3rem' }}>
        <h2 style={{ fontSize: '1.2rem', marginBottom: '1rem', display: 'flex', alignItems: 'center', gap: '0.5rem', color: 'var(--text-color)' }}>
          <Flame size={24} color="#f97316" /> 수익화 달성(Monetization) 진행률
        </h2>
        <div style={{ background: 'rgba(255,255,255,0.05)', borderRadius: '12px', padding: '1.5rem', border: '1px solid rgba(255,255,255,0.1)' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '0.5rem', fontSize: '0.9rem', color: 'var(--text-secondary)' }}>
            <span>현재 완료된 태스크: {progress.tasksCompleted}개</span>
            <span>1차 수익화 목표: {progress.targetTasks}개</span>
          </div>
          <div style={{ width: '100%', height: '24px', background: 'rgba(0,0,0,0.5)', borderRadius: '12px', overflow: 'hidden', position: 'relative' }}>
            <div style={{ 
              width: `${progress.percentage}%`, 
              height: '100%', 
              background: 'linear-gradient(90deg, #f59e0b 0%, #f97316 100%)',
              transition: 'width 1s ease-in-out',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'flex-end',
              paddingRight: '0.5rem',
              color: 'white',
              fontWeight: 'bold',
              fontSize: '0.8rem',
              boxShadow: '0 0 10px rgba(249, 115, 22, 0.5)'
            }}>
              {progress.percentage}%
            </div>
          </div>
        </div>
      </section>

      {/* 실시간 관제 센터 대시보드 (Live Control Center) */}
      <section style={{ marginBottom: '3rem' }}>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(350px, 1fr))', gap: '2rem' }}>
          
          {/* 에이전트 실시간 가동 상태 (Live Agents Status) */}
          <div className="glass-panel" style={{ padding: '1.5rem', display: 'flex', flexDirection: 'column', gap: '1rem' }}>
            <h2 style={{ fontSize: '1.2rem', display: 'flex', alignItems: 'center', gap: '0.5rem', color: 'var(--text-color)', borderBottom: '1px solid rgba(255,255,255,0.08)', paddingBottom: '0.75rem', margin: 0 }}>
              <Bot size={20} color="#10b981" /> 실시간 에이전트 가동 현황판 (Live)
            </h2>
            <div className="agent-grid" style={{ marginTop: '0.5rem' }}>
              {activeAgents.length === 0 ? (
                <div style={{ gridColumn: '1 / -1', textAlign: 'center', padding: '2rem', color: 'var(--text-secondary)' }}>
                  현재 활성화된 에이전트가 없습니다.
                </div>
              ) : (
                activeAgents.map(agent => (
                  <div key={agent.name} className="agent-item">
                    <div style={{ display: 'flex', justifyContent: 'space-between', width: '100%', alignItems: 'center' }}>
                      <span className="pulse-dot"></span>
                      <span style={{ fontSize: '0.75rem', color: 'var(--text-secondary)', display: 'flex', alignItems: 'center', gap: '0.25rem' }}>
                        <Clock size={10} /> {formatTime(agent.activatedAt)}
                      </span>
                    </div>
                    <div style={{ background: 'rgba(255,255,255,0.03)', borderRadius: '50%', padding: '0.75rem', marginTop: '0.25rem', border: '1px solid rgba(255,255,255,0.05)' }}>
                      {getAgentIcon(agent.name)}
                    </div>
                    <div style={{ fontWeight: 600, fontSize: '0.9rem' }}>
                      {getAgentKoreanName(agent.name)}
                    </div>
                    <div style={{ fontSize: '0.75rem', color: '#10b981', background: 'rgba(16, 185, 129, 0.1)', padding: '0.2rem 0.5rem', borderRadius: '4px', fontWeight: 500 }}>
                      ONLINE
                    </div>
                  </div>
                ))
              )}
            </div>
          </div>

          {/* 최근 완료된 태스크 스트림 (Live Task Stream) */}
          <div className="glass-panel" style={{ padding: '1.5rem', display: 'flex', flexDirection: 'column', gap: '1rem' }}>
            <h2 style={{ fontSize: '1.2rem', display: 'flex', alignItems: 'center', gap: '0.5rem', color: 'var(--text-color)', borderBottom: '1px solid rgba(255,255,255,0.08)', paddingBottom: '0.75rem', margin: 0 }}>
              <Activity size={20} color="#60a5fa" /> 최근 완료 태스크 스트림 (Task Stream)
            </h2>
            <div className="task-list" style={{ marginTop: '0.5rem' }}>
              {recentTasks.length === 0 ? (
                <div style={{ textAlign: 'center', padding: '2rem', color: 'var(--text-secondary)' }}>
                  최근 완료된 태스크가 없습니다.
                </div>
              ) : (
                recentTasks.map(task => (
                  <div key={task.id} className="task-item">
                    <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', flex: 1, minWidth: 0 }}>
                      <div style={{ background: 'rgba(255,255,255,0.03)', borderRadius: '50%', padding: '0.5rem', border: '1px solid rgba(255,255,255,0.05)', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                        {getAgentIcon(task.agentIds?.[0] || 'unknown')}
                      </div>
                      <div style={{ minWidth: 0, flex: 1 }}>
                        <div style={{ fontWeight: 500, fontSize: '0.9rem', color: 'var(--text-primary)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }} title={task.title}>
                          {task.title}
                        </div>
                        <div style={{ fontSize: '0.75rem', color: 'var(--text-secondary)', marginTop: '0.25rem' }}>
                          담당: {getAgentKoreanName(task.agentIds?.[0] || '알수없음')}
                        </div>
                      </div>
                    </div>
                    <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'flex-end', gap: '0.25rem', flexShrink: 0, marginLeft: '1rem' }}>
                      <span style={{ fontSize: '0.75rem', color: '#10b981', display: 'flex', alignItems: 'center', gap: '0.25rem', background: 'rgba(16, 185, 129, 0.1)', padding: '0.15rem 0.4rem', borderRadius: '4px', fontWeight: 500 }}>
                        <Check size={12} /> DONE
                      </span>
                      <span style={{ fontSize: '0.7rem', color: 'var(--text-secondary)', display: 'flex', alignItems: 'center', gap: '0.25rem' }}>
                        <Clock size={10} /> {formatTime(task.completedAt)}
                      </span>
                    </div>
                  </div>
                ))
              )}
            </div>
          </div>

        </div>
      </section>

      {direction && (
        <section style={{ marginBottom: '3rem' }}>
          <h2 style={{ fontSize: '1.5rem', marginBottom: '1rem', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
            <Target size={24} color="#f43f5e" /> 회사 전체 방향성 및 목표
          </h2>
          <div className="glass-panel" style={{ 
            padding: '2rem', 
            background: 'linear-gradient(145deg, rgba(255,255,255,0.03) 0%, rgba(244, 63, 94, 0.05) 100%)',
            border: '1px solid rgba(244, 63, 94, 0.2)' 
          }}>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '2rem' }}>
              <div>
                <h3 style={{ fontSize: '1.1rem', color: '#fb7185', marginBottom: '1rem', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                  <CheckCircle2 size={20} /> 공동 목표 (Goals)
                </h3>
                <div className="markdown-content" style={{ background: 'rgba(0,0,0,0.2)', padding: '1rem', borderRadius: '8px' }}>
                  <ReactMarkdown>{direction.goals}</ReactMarkdown>
                </div>
              </div>
              <div>
                <h3 style={{ fontSize: '1.1rem', color: '#38bdf8', marginBottom: '1rem', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                  <Route size={20} /> 최근 주요 의사결정 (Decisions)
                </h3>
                <div className="markdown-content" style={{ background: 'rgba(0,0,0,0.2)', padding: '1rem', borderRadius: '8px', maxHeight: '400px', overflowY: 'auto' }}>
                  <ReactMarkdown>{direction.decisions}</ReactMarkdown>
                </div>
              </div>
            </div>
          </div>
        </section>
      )}

      {latestSummary && (
        <section style={{ marginBottom: '3rem' }}>
          <h2 style={{ fontSize: '1.5rem', marginBottom: '1rem', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
            <Lightbulb size={24} color="#fcd34d" /> 실시간 방향성 요약 (최신 세션: {latestSummary.session})
          </h2>
          <div className="glass-panel" style={{ 
            padding: '2rem', 
            background: 'linear-gradient(145deg, rgba(255,255,255,0.03) 0%, rgba(138, 43, 226, 0.05) 100%)',
            border: '1px solid rgba(138, 43, 226, 0.2)' 
          }}>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '2rem' }}>
              <div>
                <h3 style={{ fontSize: '1.1rem', color: 'var(--accent-secondary)', marginBottom: '1rem', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                  🎯 현재 방향성
                </h3>
                <div className="markdown-content" style={{ background: 'rgba(0,0,0,0.2)', padding: '1rem', borderRadius: '8px' }}>
                  <ReactMarkdown>{latestSummary.summary}</ReactMarkdown>
                </div>
              </div>
              <div>
                <h3 style={{ fontSize: '1.1rem', color: 'var(--accent-color)', marginBottom: '1rem', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                  📋 에이전트 역할 분배
                </h3>
                <div className="markdown-content" style={{ background: 'rgba(0,0,0,0.2)', padding: '1rem', borderRadius: '8px' }}>
                  <ReactMarkdown>{latestSummary.tasks}</ReactMarkdown>
                </div>
              </div>
            </div>
            <div style={{ marginTop: '1.5rem', textAlign: 'right' }}>
              <Link href={`/sessions/${latestSummary.session}`}>
                <button className="btn">이 세션 결과물 확인하기</button>
              </Link>
            </div>
          </div>
        </section>
      )}

      <section style={{ marginBottom: '3rem' }}>
        <h2 style={{ fontSize: '1.5rem', marginBottom: '1.5rem', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
          <Calendar size={24} color="var(--accent-color)" /> 최근 작업 세션
        </h2>
        
        {sessions.length === 0 ? (
          <div className="glass-panel" style={{ padding: '3rem', textAlign: 'center', color: 'var(--text-secondary)' }}>
            진행된 세션이 없습니다.
          </div>
        ) : (
          <div className="grid">
            {sessions.map(session => (
              <Link href={`/sessions/${session}`} key={session}>
                <div className="glass-panel card" style={{ cursor: 'pointer', height: '100%' }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                    <div className="card-title">{session}</div>
                    <ChevronRight size={20} color="var(--text-secondary)" />
                  </div>
                  <div className="card-desc">
                    해당 세션에서 생성된 모든 에이전트의 작업물(.md)을 확인합니다.
                  </div>
                  <div style={{ marginTop: 'auto', paddingTop: '1rem', borderTop: '1px solid var(--border-color)' }}>
                    <span className="btn" style={{ padding: '0.4rem 0.8rem', fontSize: '0.8rem' }}>
                      결과물 보기
                    </span>
                  </div>
                </div>
              </Link>
            ))}
          </div>
        )}
      </section>
    </div>
  );
}
