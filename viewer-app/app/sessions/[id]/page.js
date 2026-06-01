import Link from 'next/link';
import { getSessionFiles, getSessionMindmap, getSessionDirection } from '../../lib/api';
import { ArrowLeft } from 'lucide-react';
import SessionView from '../../components/SessionView';

export default async function SessionPage({ params }) {
  const resolvedParams = await params;
  const { id } = resolvedParams;
  const files = getSessionFiles(id);
  const mindmapData = getSessionMindmap(id);
  const directionData = getSessionDirection(id);

  return (
    <div className="container">
      <header className="header" style={{ marginBottom: '2rem', borderBottom: 'none', paddingBottom: 0 }}>
        <div style={{ display: 'flex', width: '100%', justifyContent: 'space-between', alignItems: 'flex-end', flexWrap: 'wrap', gap: '1.5rem' }}>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
            <Link href="/" style={{ display: 'inline-flex', alignItems: 'center', gap: '0.5rem', color: 'var(--text-primary)', width: 'fit-content' }} className="btn-secondary btn">
              <ArrowLeft size={16} /> 대시보드로 돌아가기
            </Link>
            <h1 className="title" style={{ fontSize: '2rem', margin: 0 }}>
              세션 <span className="gradient-text">{id}</span>
            </h1>
          </div>
        </div>
      </header>

      {files.length === 0 ? (
        <div className="glass-panel" style={{ padding: '3rem', textAlign: 'center', color: 'var(--text-secondary)' }}>
          이 세션에는 작업물이 없습니다.
        </div>
      ) : (
        <SessionView files={files} mindmapData={mindmapData} directionData={directionData} />
      )}
    </div>
  );
}
