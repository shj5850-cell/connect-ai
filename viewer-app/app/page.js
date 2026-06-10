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
      <header className="header" style={{ marginBottom: '1.5rem', paddingBottom: '1rem' }}>
        <div>
          <h1 className="title gradient-text" style={{ letterSpacing: '-0.03em', fontSize: '2.5rem' }}>맹칠컴퍼니</h1>
          <p style={{ color: 'var(--text-secondary)', marginTop: '0.25rem', fontSize: '0.9rem' }}>
            에이전트 쇼츠 제작 관제 및 비즈니스 의사결정 대시보드
          </p>
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
