import { 
  getSessions, 
  getAgents, 
  getLatestSummary, 
  getCompanyDirection, 
  getMonetizationProgress,
  getActiveAgents,
  getRecentTasks
} from './lib/api';
import DashboardClient from './components/DashboardClient';
import Link from 'next/link';

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
      <header className="header" style={{ marginBottom: '1.5rem', paddingBottom: '1rem', display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '1rem' }}>
        <div>
          <h1 className="title gradient-text" style={{ letterSpacing: '-0.03em', fontSize: '2.5rem' }}>맹칠컴퍼니</h1>
          <p style={{ color: 'var(--text-secondary)', marginTop: '0.25rem', fontSize: '0.9rem' }}>
            에이전트 쇼츠 제작 관제 및 비즈니스 의사결정 대시보드
          </p>
        </div>
        <div style={{ display: 'flex', gap: '1rem' }}>
          <Link href="/ebook" className="btn" style={{ background: 'linear-gradient(135deg, #a78bfa 0%, #fb7185 100%)', fontWeight: 'bold' }}>
            📘 AI 전자책 뚝딱 생성기
          </Link>
          <Link href="/archive" className="btn btn-secondary">
            🎬 쇼츠 보관함
          </Link>
        </div>
      </header>

      <DashboardClient 
        sessions={sessions}
        agents={agents}
        latestSummary={latestSummary}
        direction={direction}
        progress={progress}
        activeAgents={activeAgents}
        recentTasks={recentTasks}
      />
    </div>
  );
}
