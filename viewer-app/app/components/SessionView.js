'use client';

import { useState, useEffect } from 'react';
import ReactMarkdown from 'react-markdown';
import { 
  FileText, Bot, Brain, Compass, Target, 
  Workflow, ArrowRight, Zap, Loader2, Sparkles, Copy, Check
} from 'lucide-react';
import Mindmap from './Mindmap';

export default function SessionView({ files, mindmapData, directionData }) {
  const [activeTab, setActiveTab] = useState('direction');
  const [ideas, setIdeas] = useState([]);
  const [feedbackTemplate, setFeedbackTemplate] = useState('');
  const [loadingIdeas, setLoadingIdeas] = useState(true);
  const [copied, setCopied] = useState(false);

  // Read URL query parameter on mount to set active tab
  useEffect(() => {
    if (typeof window !== 'undefined') {
      const params = new URLSearchParams(window.location.search);
      const tab = params.get('tab');
      if (tab && ['direction', 'mindmap', 'documents'].includes(tab)) {
        setActiveTab(tab);
      }
    }
  }, []);

  // Fetch business ideas & feedback templates dynamically
  useEffect(() => {
    let active = true;
    setLoadingIdeas(true);
    
    fetch('/api/business-ideas', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({ sessionId: mindmapData.sessionId })
    })
      .then(res => res.json())
      .then(data => {
        if (active && data.success) {
          if (data.ideas) setIdeas(data.ideas);
          if (data.feedbackTemplate) setFeedbackTemplate(data.feedbackTemplate);
          setLoadingIdeas(false);
        }
      })
      .catch(err => {
        console.error(err);
        if (active) setLoadingIdeas(false);
      });
      
    return () => {
      active = false;
    };
  }, [mindmapData.sessionId]);

  const handleCopyFeedback = () => {
    if (!feedbackTemplate) return;
    navigator.clipboard.writeText(feedbackTemplate);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <div>
      {/* Premium Tab Buttons */}
      <div className="tabs-container">
        <button 
          className={`tab-btn ${activeTab === 'direction' ? 'active' : ''}`}
          onClick={() => setActiveTab('direction')}
        >
          <Compass size={18} />
          <span>🧭 전체 방향성 & 로드맵 (Direction & Roadmap)</span>
        </button>
        <button 
          className={`tab-btn ${activeTab === 'mindmap' ? 'active' : ''}`}
          onClick={() => setActiveTab('mindmap')}
        >
          <Brain size={18} />
          <span>🧠 성과 마인드맵 (Identity & Actions)</span>
        </button>
        <button 
          className={`tab-btn ${activeTab === 'documents' ? 'active' : ''}`}
          onClick={() => setActiveTab('documents')}
        >
          <FileText size={18} />
          <span>📁 개별 문서 보기 (Documents)</span>
        </button>
      </div>

      {/* 1. Overall Direction Tab */}
      {activeTab === 'direction' && (
        <div className="direction-container">
          {/* Card 1: 세션 정체성 & 요약 */}
          <div className="glass-panel highlight-panel" style={{ padding: '2rem' }}>
            <h2 className="section-title gradient-text" style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', marginBottom: '1.25rem', fontSize: '1.4rem' }}>
              <Compass size={24} color="#00d2ff" style={{ filter: 'drop-shadow(0 0 8px rgba(0, 210, 255, 0.5))' }} /> 이 세션의 종합 방향성 & 성과
            </h2>
            <div className="direction-brief">
              {directionData.summary}
            </div>
            
            <div className="instruction-box">
              <span className="instruction-label">시작 명령 (Prompt Context)</span>
              <div className="instruction-content">
                "{directionData.originalCommand}"
              </div>
            </div>
          </div>

          {/* Section 2: 구체적인 활용 가능 사업 아이템 리스트 */}
          <div className="glass-panel business-ideas-panel" style={{ padding: '2rem' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.5rem', borderBottom: '1px solid rgba(255,255,255,0.05)', paddingBottom: '0.75rem' }}>
              <h2 style={{ display: 'flex', alignItems: 'center', gap: '0.6rem', fontSize: '1.3rem', fontWeight: 700, margin: 0 }}>
                <Sparkles size={22} color="#fbbf24" style={{ filter: 'drop-shadow(0 0 8px rgba(251, 191, 36, 0.4))' }} /> 
                <span>💡 실체화 가능한 구체적 사업 아이템 (Concrete Business Ideas)</span>
              </h2>
              {loadingIdeas && (
                <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', fontSize: '0.85rem', color: 'var(--text-secondary)' }}>
                  <Loader2 size={16} className="animate-spin" />
                  <span>AI 분석 중...</span>
                </div>
              )}
            </div>

            {loadingIdeas ? (
              <div className="skeleton-grid">
                {[1, 2, 3].map(n => (
                  <div key={n} className="skeleton-card">
                    <div className="skeleton-line title"></div>
                    <div className="skeleton-line badge"></div>
                    <div className="skeleton-line text long"></div>
                    <div className="skeleton-line text"></div>
                  </div>
                ))}
              </div>
            ) : (
              <div className="ideas-grid">
                {ideas.map((idea, index) => (
                  <div key={index} className="idea-card">
                    <div className="idea-header">
                      <div className="idea-category-tag">{idea.category || '1인 창업 사업'}</div>
                      <h3 className="idea-title">{idea.title}</h3>
                    </div>
                    <div className="idea-body">
                      <div className="idea-section">
                        <span className="section-label">🛠️ 세션 결과물 활용 방법:</span>
                        <p className="section-text">{idea.utilization}</p>
                      </div>
                      <div className="idea-section">
                        <span className="section-label" style={{ color: '#34d399' }}>💰 구체적 수익 모델:</span>
                        <p className="section-text" style={{ color: '#e2e8f0' }}>{idea.monetization}</p>
                      </div>
                      <div className="idea-action-box">
                        <span className="action-badge">NEXT ACTION</span>
                        <p className="action-text">{idea.action}</p>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Section 3: 피드백 복사 생성기 (진짜 똑똑해지기 위한 피드백 전달기) */}
          <div className="glass-panel feedback-panel" style={{ padding: '2rem' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '1rem', borderBottom: '1px solid rgba(255,255,255,0.05)', paddingBottom: '0.75rem', flexWrap: 'wrap', gap: '1rem' }}>
              <div>
                <h2 style={{ display: 'flex', alignItems: 'center', gap: '0.6rem', fontSize: '1.3rem', fontWeight: 700, margin: 0, color: 'var(--text-primary)' }}>
                  <Brain size={22} color="var(--accent-secondary)" style={{ filter: 'drop-shadow(0 0 8px rgba(167, 139, 250, 0.4))' }} />
                  <span>📢 에이전트 성장 피드백 생성기 (Feedback Generator)</span>
                </h2>
                <p style={{ fontSize: '0.8rem', color: 'var(--text-secondary)', marginTop: '0.25rem' }}>
                  아래 피드백 템플릿을 복사하여 <code>_shared/decisions.md</code> 파일 하단에 붙여넣어 주시면, 에이전트들이 이를 학습하여 다음 사이클에서 훨씬 고도화된 업무를 수행합니다.
                </p>
              </div>
              
              <button 
                onClick={handleCopyFeedback} 
                disabled={loadingIdeas || !feedbackTemplate}
                className={`btn ${copied ? 'copied-btn' : ''}`}
                style={{ 
                  padding: '0.5rem 1.25rem', 
                  borderRadius: '10px', 
                  fontSize: '0.85rem', 
                  display: 'flex', 
                  alignItems: 'center', 
                  gap: '0.5rem',
                  background: copied ? 'linear-gradient(135deg, #10b981, #059669)' : 'var(--accent-gradient)'
                }}
              >
                {copied ? <Check size={16} /> : <Copy size={16} />}
                <span>{copied ? '복사 완료!' : '피드백 복사하기'}</span>
              </button>
            </div>

            {loadingIdeas ? (
              <div className="skeleton-card" style={{ height: '120px' }}>
                <div className="skeleton-line text long"></div>
                <div className="skeleton-line text"></div>
                <div className="skeleton-line text"></div>
              </div>
            ) : (
              <div className="feedback-textarea-box">
                <pre className="feedback-preview-code">
                  {feedbackTemplate}
                </pre>
              </div>
            )}
          </div>

          {/* Grid for: Goals alignment & Roadmap */}
          <div className="direction-grid">
            
            {/* Left: 회사 공동 목표와의 정렬 */}
            <div className="glass-panel" style={{ padding: '2rem' }}>
              <h3 style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', fontSize: '1.2rem', marginBottom: '1.25rem', color: '#fb7185', fontWeight: 600 }}>
                <Target size={20} /> 회사 공동 목표와의 정렬 (Goal Alignment)
              </h3>
              <div style={{ background: 'rgba(0, 0, 0, 0.2)', border: '1px solid var(--border-color)', borderRadius: '12px', padding: '1.5rem', minHeight: '200px' }} className="markdown-content">
                <ReactMarkdown>{directionData.companyGoals}</ReactMarkdown>
              </div>
              <div className="alignment-badges" style={{ marginTop: '1.5rem', display: 'flex', gap: '0.5rem', flexWrap: 'wrap' }}>
                <span className="badge-item teal">✓ 자료수집 및 실체화 연동</span>
                <span className="badge-item blue">✓ 1인 기업 자동화 진행 중</span>
              </div>
            </div>

            {/* Right: 통합 행동 로드맵 */}
            <div className="glass-panel" style={{ padding: '2rem' }}>
              <h3 style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', fontSize: '1.2rem', marginBottom: '1.25rem', color: '#fb923c', fontWeight: 600 }}>
                <Workflow size={20} /> 에이전트 통합 로드맵 (Integrated Roadmap)
              </h3>
              <div className="roadmap-timeline">
                {directionData.roadmap.map((step, idx) => (
                  <div key={idx} className="roadmap-step">
                    <div className="step-number">{idx + 1}</div>
                    {idx < directionData.roadmap.length - 1 && <div className="step-line"></div>}
                    <div className="step-body">
                      <div className="step-header">
                        <span className="step-agent-name">{step.agent}</span>
                        <span className="step-agent-role">{step.role || '러너'}</span>
                      </div>
                      <div className="step-content">
                        <div style={{ display: 'flex', flexDirection: 'column', gap: '0.15rem', marginTop: '0.5rem' }}>
                          <span style={{ fontSize: '0.75rem', color: 'var(--text-secondary)' }}>실질적 성과:</span>
                          <span style={{ fontSize: '0.85rem', color: 'var(--text-primary)', fontWeight: 500 }}>{step.mainDeliverable}</span>
                        </div>
                        <div style={{ display: 'flex', flexDirection: 'column', gap: '0.15rem', marginTop: '0.6rem', borderTop: '1px solid rgba(255,255,255,0.03)', paddingTop: '0.4rem' }}>
                          <span style={{ fontSize: '0.75rem', color: '#fb923c', fontWeight: 600, display: 'flex', alignItems: 'center', gap: '0.2rem' }}>
                            <Zap size={12} /> 다음 행동 (Next Action):
                          </span>
                          <span style={{ fontSize: '0.85rem', color: 'var(--text-primary)', fontWeight: 500 }}>{step.nextAction}</span>
                        </div>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </div>

          </div>
        </div>
      )}

      {/* 2. Mindmap Tab */}
      {activeTab === 'mindmap' && (
        <Mindmap mindmapData={mindmapData} />
      )}

      {/* 3. Document Tab */}
      {activeTab === 'documents' && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '2rem' }}>
          {files.map(file => {
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

      <style jsx>{`
        .tabs-container {
          display: flex;
          gap: 1rem;
          margin-bottom: 2rem;
          border-bottom: 1px solid var(--border-color);
          padding-bottom: 1rem;
        }

        .tab-btn {
          display: flex;
          align-items: center;
          gap: 0.6rem;
          background: rgba(255, 255, 255, 0.02);
          border: 1px solid var(--border-color);
          padding: 0.75rem 1.5rem;
          border-radius: 10px;
          color: var(--text-secondary);
          font-weight: 600;
          font-size: 0.95rem;
          cursor: pointer;
          transition: all 0.3s cubic-bezier(0.16, 1, 0.3, 1);
        }

        .tab-btn:hover {
          background: rgba(255, 255, 255, 0.05);
          color: var(--text-primary);
          transform: translateY(-1px);
        }

        .tab-btn.active {
          background: var(--accent-gradient);
          border-color: transparent;
          color: #ffffff;
          box-shadow: 0 0 20px rgba(0, 210, 255, 0.15);
        }

        /* Direction Tab Layout */
        .direction-container {
          display: flex;
          flex-direction: column;
          gap: 1.5rem;
        }

        .highlight-panel {
          background: linear-gradient(135deg, rgba(0, 210, 255, 0.05) 0%, rgba(109, 40, 217, 0.03) 100%);
          border-color: rgba(0, 210, 255, 0.15);
        }

        .direction-brief {
          font-size: 1.05rem;
          line-height: 1.8;
          color: #e2e8f0;
          background: rgba(0, 0, 0, 0.25);
          padding: 1.5rem;
          border-radius: 12px;
          border: 1px solid rgba(255, 255, 255, 0.02);
          margin-bottom: 1.5rem;
        }

        .instruction-box {
          background: rgba(0, 0, 0, 0.3);
          border-left: 3px solid #00d2ff;
          border-radius: 0 8px 8px 0;
          padding: 1rem;
        }

        .instruction-label {
          font-size: 0.75rem;
          font-weight: 700;
          color: #00d2ff;
          display: block;
          margin-bottom: 0.25rem;
          text-transform: uppercase;
          letter-spacing: 0.05em;
        }

        .instruction-content {
          font-size: 0.85rem;
          color: var(--text-secondary);
          font-style: italic;
        }

        /* Business Ideas Section */
        .business-ideas-panel {
          background: linear-gradient(145deg, rgba(255, 255, 255, 0.01) 0%, rgba(251, 191, 36, 0.02) 100%);
          border-color: rgba(251, 191, 36, 0.12);
        }

        .ideas-grid {
          display: grid;
          grid-template-columns: repeat(auto-fit, minmax(280px, 1fr));
          gap: 1.5rem;
        }

        .idea-card {
          background: rgba(255, 255, 255, 0.02);
          border: 1px solid rgba(255, 255, 255, 0.04);
          border-radius: 14px;
          padding: 1.5rem;
          display: flex;
          flex-direction: column;
          gap: 1.25rem;
          transition: all 0.3s cubic-bezier(0.16, 1, 0.3, 1);
        }

        .idea-card:hover {
          transform: translateY(-4px);
          border-color: rgba(251, 191, 36, 0.25);
          box-shadow: 0 10px 30px rgba(251, 191, 36, 0.06);
          background: rgba(255, 255, 255, 0.03);
        }

        .idea-category-tag {
          font-size: 0.7rem;
          font-weight: 700;
          color: #fbbb24;
          background: rgba(251, 191, 36, 0.1);
          padding: 0.2rem 0.5rem;
          border-radius: 4px;
          width: fit-content;
          margin-bottom: 0.5rem;
          text-transform: uppercase;
        }

        .idea-title {
          font-size: 1.1rem;
          font-weight: 700;
          color: #ffffff;
          line-height: 1.4;
          margin: 0;
        }

        .idea-body {
          display: flex;
          flex-direction: column;
          gap: 0.9rem;
          flex: 1;
        }

        .idea-section {
          display: flex;
          flex-direction: column;
          gap: 0.2rem;
        }

        .section-label {
          font-size: 0.75rem;
          font-weight: 600;
          color: #94a3b8;
        }

        .section-text {
          font-size: 0.82rem;
          color: #cbd5e1;
          line-height: 1.5;
          margin: 0;
        }

        .idea-action-box {
          margin-top: auto;
          background: rgba(251, 146, 60, 0.05);
          border: 1px dashed rgba(251, 146, 60, 0.2);
          border-radius: 10px;
          padding: 0.75rem 1rem;
        }

        .action-badge {
          font-size: 0.65rem;
          font-weight: 750;
          color: #fb923c;
          display: block;
          margin-bottom: 0.2rem;
          letter-spacing: 0.05em;
        }

        .action-text {
          font-size: 0.8rem;
          font-weight: 550;
          color: var(--text-primary);
          line-height: 1.4;
          margin: 0;
        }

        /* Feedback Generator Section */
        .feedback-panel {
          background: linear-gradient(145deg, rgba(255, 255, 255, 0.01) 0%, rgba(167, 139, 250, 0.02) 100%);
          border-color: rgba(167, 139, 250, 0.12);
        }

        .copied-btn {
          box-shadow: 0 0 15px rgba(16, 185, 129, 0.4) !important;
        }

        .feedback-textarea-box {
          background: rgba(0, 0, 0, 0.35);
          border: 1px solid var(--border-color);
          border-radius: 10px;
          padding: 1.25rem;
          max-height: 250px;
          overflow-y: auto;
        }

        .feedback-preview-code {
          font-family: 'Fira Code', 'Courier New', Courier, monospace;
          font-size: 0.8rem;
          color: #a78bfa;
          line-height: 1.6;
          margin: 0;
          white-space: pre-wrap;
          word-break: break-all;
        }

        /* Skeleton Loaders */
        .skeleton-grid {
          display: grid;
          grid-template-columns: repeat(auto-fit, minmax(280px, 1fr));
          gap: 1.5rem;
        }

        .skeleton-card {
          background: rgba(255, 255, 255, 0.01);
          border: 1px solid rgba(255, 255, 255, 0.03);
          border-radius: 14px;
          padding: 1.5rem;
          display: flex;
          flex-direction: column;
          gap: 0.75rem;
        }

        .skeleton-line {
          background: linear-gradient(90deg, rgba(255,255,255,0.03) 25%, rgba(255,255,255,0.08) 50%, rgba(255,255,255,0.03) 75%);
          background-size: 200% 100%;
          animation: loading-pulse 1.5s infinite;
          border-radius: 4px;
        }

        .skeleton-line.title { height: 1.25rem; width: 80%; }
        .skeleton-line.badge { height: 0.8rem; width: 40%; }
        .skeleton-line.text { height: 0.7rem; width: 90%; }
        .skeleton-line.text.long { height: 0.7rem; width: 100%; }

        @keyframes loading-pulse {
          0% { background-position: 200% 0; }
          100% { background-position: -200% 0; }
        }

        .direction-grid {
          display: grid;
          grid-template-columns: 1fr 1.2fr;
          gap: 2rem;
          align-items: start;
        }

        @media (max-width: 900px) {
          .direction-grid {
            grid-template-columns: 1fr;
            gap: 1.5rem;
          }
        }

        /* Roadmap Timeline */
        .roadmap-timeline {
          display: flex;
          flex-direction: column;
          gap: 1.5rem;
          position: relative;
          padding-left: 0.5rem;
          margin-top: 0.5rem;
        }

        .roadmap-step {
          display: flex;
          gap: 1.25rem;
          position: relative;
        }

        .step-number {
          width: 26px;
          height: 26px;
          border-radius: 50%;
          background: var(--accent-gradient);
          color: white;
          font-weight: 700;
          font-size: 0.8rem;
          display: flex;
          align-items: center;
          justify-content: center;
          z-index: 2;
          flex-shrink: 0;
          box-shadow: 0 0 10px rgba(0, 210, 255, 0.3);
        }

        .step-line {
          position: absolute;
          left: 12px;
          top: 26px;
          width: 2px;
          height: calc(100% + 0.5rem);
          background: rgba(255, 255, 255, 0.04);
          z-index: 1;
        }

        .step-body {
          background: rgba(255, 255, 255, 0.02);
          border: 1px solid var(--border-color);
          border-radius: 12px;
          padding: 0.9rem 1.1rem;
          flex: 1;
          transition: border-color 0.3s ease;
        }

        .step-body:hover {
          border-color: rgba(251, 146, 60, 0.2);
        }

        .step-header {
          display: flex;
          align-items: center;
          gap: 0.5rem;
        }

        .step-agent-name {
          font-weight: 650;
          font-size: 0.85rem;
          color: var(--text-primary);
        }

        .step-agent-role {
          font-size: 0.7rem;
          color: var(--text-secondary);
          background: rgba(255, 255, 255, 0.04);
          padding: 0.1rem 0.35rem;
          border-radius: 4px;
        }

        .badge-item {
          font-size: 0.75rem;
          font-weight: 600;
          padding: 0.25rem 0.60rem;
          border-radius: 6px;
        }
        
        .badge-item.teal {
          background: rgba(45, 212, 191, 0.1);
          color: #2dd4bf;
          border: 1px solid rgba(45, 212, 191, 0.2);
        }

        .badge-item.blue {
          background: rgba(96, 165, 250, 0.1);
          color: #60a5fa;
          border: 1px solid rgba(96, 165, 250, 0.2);
        }

        @keyframes spin {
          from { transform: rotate(0deg); }
          to { transform: rotate(360deg); }
        }
        
        .animate-spin {
          animation: spin 1s linear infinite;
        }
      `}</style>
    </div>
  );
}
