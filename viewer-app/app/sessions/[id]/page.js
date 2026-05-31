import Link from 'next/link';
import { getSessionFiles } from '../../lib/api';
import ReactMarkdown from 'react-markdown';
import { ArrowLeft, FileText, Bot } from 'lucide-react';

export default async function SessionPage({ params }) {
  // In Next.js App Router, params must be awaited if it's dynamic
  const resolvedParams = await params;
  const { id } = resolvedParams;
  const files = getSessionFiles(id);

  return (
    <div className="container">
      <header className="header" style={{ marginBottom: '2rem', borderBottom: 'none', paddingBottom: 0 }}>
        <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
          <Link href="/" style={{ display: 'inline-flex', alignItems: 'center', gap: '0.5rem', color: 'var(--text-primary)', width: 'fit-content' }} className="btn-secondary btn">
            <ArrowLeft size={16} /> 대시보드로 돌아가기
          </Link>
          <h1 className="title" style={{ fontSize: '2rem' }}>
            세션 <span className="gradient-text">{id}</span>
          </h1>
        </div>
      </header>

      {files.length === 0 ? (
        <div className="glass-panel" style={{ padding: '3rem', textAlign: 'center', color: 'var(--text-secondary)' }}>
          이 세션에는 작업물이 없습니다.
        </div>
      ) : (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '2rem' }}>
          {files.map(file => {
            // Determine icon based on file name
            const isBrief = file.name.includes('_brief');
            const agentName = file.name.replace('.md', '');
            
            return (
              <div key={file.name} className="glass-panel" style={{ overflow: 'hidden' }}>
                <div style={{ 
                  padding: '1.25rem 1.5rem', 
                  borderBottom: '1px solid var(--border-color)',
                  background: 'rgba(0,0,0,0.2)',
                  display: 'flex',
                  alignItems: 'center',
                  gap: '0.75rem'
                }}>
                  {isBrief ? <FileText size={20} color="var(--accent-secondary)" /> : <Bot size={20} color="var(--accent-color)" />}
                  <h2 style={{ fontSize: '1.25rem', fontWeight: 600, margin: 0, textTransform: 'capitalize' }}>
                    {agentName}
                  </h2>
                  <span style={{ marginLeft: 'auto', fontSize: '0.85rem', color: 'var(--text-secondary)', background: 'rgba(255,255,255,0.1)', padding: '0.2rem 0.6rem', borderRadius: '12px' }}>
                    {file.name}
                  </span>
                </div>
                <div style={{ padding: '2rem 1.5rem' }} className="markdown-content">
                  <ReactMarkdown>{file.content}</ReactMarkdown>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
