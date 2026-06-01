'use client';

import { useState } from 'react';
import { 
  Bot, FileText, Lightbulb, CheckSquare, Target, 
  Sparkles, ArrowRight, Zap, ChevronRight, HelpCircle
} from 'lucide-react';

function getAgentIcon(agentName) {
  switch (agentName.toLowerCase()) {
    case 'secretary':
    case '영숙':
      return <Bot size={20} color="#a78bfa" />;
    case 'youtube':
    case '레오':
      return <Bot size={20} color="#f87171" />;
    case 'writer':
      return <Bot size={20} color="#f472b6" />;
    case 'designer':
      return <Bot size={20} color="#34d399" />;
    case 'instagram':
      return <Bot size={20} color="#fb7185" />;
    case 'business':
    case '현빈':
      return <Bot size={20} color="#fbbf24" />;
    case 'developer':
    case '코다리':
      return <Bot size={20} color="#60a5fa" />;
    case 'researcher':
      return <Bot size={20} color="#2dd4bf" />;
    default:
      return <Bot size={20} color="#94a3b8" />;
  }
}

function getAgentColorClass(agentName) {
  switch (agentName.toLowerCase()) {
    case 'secretary':
    case '영숙':
      return 'purple';
    case 'youtube':
    case '레오':
      return 'red';
    case 'writer':
      return 'pink';
    case 'designer':
      return 'green';
    case 'instagram':
      return 'rose';
    case 'business':
    case '현빈':
      return 'amber';
    case 'developer':
    case '코다리':
      return 'blue';
    case 'researcher':
      return 'teal';
    default:
      return 'gray';
  }
}

function getAgentKoreanName(agentName) {
  const mapping = {
    secretary: '영숙 (비서)',
    youtube: '레오 (유튜브)',
    writer: '콘텐츠 작가',
    designer: 'UI/UX 디자이너',
    instagram: '인스타그램 빌더',
    business: '현빈 (전략가)',
    developer: '코다리 (개발자)',
    researcher: '시장 분석가'
  };
  return mapping[agentName.toLowerCase()] || agentName;
}

export default function Mindmap({ mindmapData }) {
  const { sessionId, globalGoal, agents } = mindmapData;
  const [selectedAgent, setSelectedAgent] = useState(agents[0]?.agent || null);

  const activeAgentData = agents.find(a => a.agent === selectedAgent) || agents[0];

  return (
    <div className="mindmap-container">
      {/* Introduction Banner explaining the "Why" */}
      <div className="mindmap-banner">
        <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
          <Sparkles size={20} className="pulse-icon" color="#fbbf24" />
          <div style={{ fontWeight: 600, fontSize: '1.1rem' }}>
            에이전트 결과물 정체성 & 후속 행동 마인드맵
          </div>
        </div>
        <p style={{ fontSize: '0.85rem', color: 'var(--text-secondary)', marginTop: '0.25rem' }}>
          에이전트들이 생성한 핵심 성과와 사장님이 이를 바탕으로 실행해야 할 다음 행동(Next Action)을 한눈에 시각화합니다.
        </p>
      </div>

      <div className="mindmap-layout">
        
        {/* 1. Root / Center Node: Global Goal */}
        <div className="mindmap-column root-col">
          <div className="mindmap-node root-node">
            <div className="node-badge">GLOBAL GOAL</div>
            <div className="node-icon-wrapper">
              <Target size={24} color="#f43f5e" />
            </div>
            <div className="node-content">
              <div className="node-title">세션 {sessionId}</div>
              <div className="node-desc">{globalGoal}</div>
            </div>
            <div className="connection-line-right"></div>
          </div>
        </div>

        {/* 2. Middle Node: Agent Selector (Hub) */}
        <div className="mindmap-column agents-col">
          <div className="agents-connector-y"></div>
          {agents.map((agentItem) => {
            const isSelected = selectedAgent === agentItem.agent;
            const colorClass = getAgentColorClass(agentItem.agent);
            
            return (
              <div 
                key={agentItem.agent} 
                className={`mindmap-node agent-node ${colorClass} ${isSelected ? 'selected' : ''}`}
                onClick={() => setSelectedAgent(agentItem.agent)}
                style={{ cursor: 'pointer' }}
              >
                <div className="agent-node-left">
                  <span className={`status-indicator ${isSelected ? 'active' : ''}`}></span>
                  <div className="agent-avatar">
                    {getAgentIcon(agentItem.agent)}
                  </div>
                  <div>
                    <div className="agent-title">{getAgentKoreanName(agentItem.agent)}</div>
                    <div className="agent-subtitle">{agentItem.role || '협력 에이전트'}</div>
                  </div>
                </div>
                <ChevronRight size={16} className="chevron" />
                {isSelected && <div className="connection-line-right-active"></div>}
              </div>
            );
          })}
        </div>

        {/* 3. Right Node: Selected Agent Detail Map (Deliverables, Insights, Actions) */}
        <div className="mindmap-column details-col">
          {activeAgentData ? (
            <div className="details-wrapper">
              
              {/* Deliverables Section */}
              <div className="detail-branch deliverables-branch">
                <div className="branch-header">
                  <div className="branch-icon-bg green">
                    <FileText size={16} color="#34d399" />
                  </div>
                  <span>📦 실질적인 산출물 (Deliverables)</span>
                </div>
                <div className="branch-content">
                  {activeAgentData.deliverables.map((item, idx) => (
                    <div key={idx} className="branch-node green-node">
                      <div className="node-bullet"></div>
                      <div className="node-text">{item}</div>
                    </div>
                  ))}
                </div>
              </div>

              {/* Insights Section */}
              <div className="detail-branch insights-branch">
                <div className="branch-header">
                  <div className="branch-icon-bg blue">
                    <Lightbulb size={16} color="#60a5fa" />
                  </div>
                  <span>💡 핵심 분석 & 인사이트 (Insights)</span>
                </div>
                <div className="branch-content">
                  {activeAgentData.insights.map((item, idx) => (
                    <div key={idx} className="branch-node blue-node">
                      <div className="node-bullet"></div>
                      <div className="node-text">{item}</div>
                    </div>
                  ))}
                </div>
              </div>

              {/* Next Action Section (What the user should do with this) */}
              <div className="detail-branch action-branch">
                <div className="branch-header neon-glow-action">
                  <div className="branch-icon-bg orange animate-pulse">
                    <CheckSquare size={16} color="#fb923c" />
                  </div>
                  <span style={{ color: '#fb923c', fontWeight: 'bold' }}>🎯 내가 해야 할 다음 행동 (Next Actions)</span>
                </div>
                <div className="branch-content">
                  {activeAgentData.nextActions.map((item, idx) => (
                    <div key={idx} className="branch-node orange-node highlighted">
                      <Zap size={14} color="#fb923c" style={{ marginRight: '8px', flexShrink: 0 }} />
                      <div className="node-text" style={{ fontWeight: 500 }}>{item}</div>
                    </div>
                  ))}
                </div>
              </div>

            </div>
          ) : (
            <div className="glass-panel" style={{ padding: '2rem', textAlign: 'center', color: 'var(--text-secondary)' }}>
              왼쪽에서 에이전트를 선택하여 성과 분석 마인드맵을 확인하세요.
            </div>
          )}
        </div>

      </div>

      <style jsx>{`
        .mindmap-container {
          margin-bottom: 3rem;
          display: flex;
          flex-direction: column;
          gap: 1.5rem;
        }

        .mindmap-banner {
          background: linear-gradient(135deg, rgba(109, 40, 217, 0.08) 0%, rgba(0, 210, 255, 0.05) 100%);
          border: 1px solid rgba(255, 255, 255, 0.06);
          border-radius: 14px;
          padding: 1.25rem;
          box-shadow: inset 0 0 20px rgba(255, 255, 255, 0.02);
        }

        .pulse-icon {
          animation: pulse-glow 2s infinite ease-in-out;
        }

        @keyframes pulse-glow {
          0%, 100% { opacity: 0.8; transform: scale(1); }
          50% { opacity: 1; transform: scale(1.1); }
        }

        .mindmap-layout {
          display: grid;
          grid-template-columns: 280px 240px 1fr;
          gap: 2rem;
          align-items: start;
          position: relative;
        }

        @media (max-width: 1000px) {
          .mindmap-layout {
            grid-template-columns: 1fr;
            gap: 1.5rem;
          }
          .connection-line-right, .connection-line-right-active, .agents-connector-y {
            display: none !important;
          }
        }

        .mindmap-column {
          display: flex;
          flex-direction: column;
          gap: 1.25rem;
          position: relative;
        }

        /* Root Node Styling */
        .root-col {
          justify-content: center;
          height: 100%;
        }

        .root-node {
          background: linear-gradient(145deg, rgba(255, 255, 255, 0.03) 0%, rgba(244, 63, 94, 0.05) 100%);
          border: 1px solid rgba(244, 63, 94, 0.2);
          box-shadow: 0 0 20px rgba(244, 63, 94, 0.08);
          border-radius: 16px;
          padding: 1.5rem;
          position: relative;
        }

        .node-badge {
          position: absolute;
          top: -10px;
          left: 1rem;
          background: #f43f5e;
          color: white;
          font-size: 0.65rem;
          font-weight: 700;
          padding: 0.15rem 0.5rem;
          border-radius: 4px;
          letter-spacing: 0.05em;
        }

        .node-icon-wrapper {
          background: rgba(244, 63, 94, 0.1);
          border-radius: 50%;
          width: 44px;
          height: 44px;
          display: flex;
          align-items: center;
          justify-content: center;
          margin-bottom: 0.75rem;
        }

        .node-title {
          font-weight: 700;
          font-size: 1.1rem;
          margin-bottom: 0.35rem;
          color: var(--text-primary);
        }

        .node-desc {
          font-size: 0.8rem;
          color: var(--text-secondary);
          line-height: 1.4;
        }

        .connection-line-right {
          position: absolute;
          right: -2rem;
          top: 50%;
          width: 2rem;
          height: 2px;
          background: rgba(255, 255, 255, 0.08);
          z-index: 1;
        }

        /* Agents Selector Hub */
        .agents-col {
          border-left: 2px solid rgba(255, 255, 255, 0.04);
          padding-left: 1rem;
        }

        .agent-node {
          background: rgba(255, 255, 255, 0.02);
          border: 1px solid rgba(255, 255, 255, 0.04);
          border-radius: 12px;
          padding: 0.9rem 1rem;
          display: flex;
          align-items: center;
          justify-content: space-between;
          position: relative;
          transition: all 0.3s cubic-bezier(0.16, 1, 0.3, 1);
        }

        .agent-node-left {
          display: flex;
          align-items: center;
          gap: 0.75rem;
        }

        .status-indicator {
          width: 6px;
          height: 6px;
          background: rgba(255, 255, 255, 0.1);
          border-radius: 50%;
        }

        .status-indicator.active {
          background: #34d399;
          box-shadow: 0 0 8px #34d399;
        }

        .agent-avatar {
          background: rgba(255, 255, 255, 0.04);
          border-radius: 8px;
          width: 32px;
          height: 32px;
          display: flex;
          align-items: center;
          justify-content: center;
        }

        .agent-title {
          font-weight: 600;
          font-size: 0.85rem;
          color: var(--text-primary);
        }

        .agent-subtitle {
          font-size: 0.7rem;
          color: var(--text-secondary);
        }

        .agent-node .chevron {
          color: var(--text-secondary);
          opacity: 0.4;
          transition: transform 0.2s ease;
        }

        /* Hover & Selected states */
        .agent-node:hover {
          background: rgba(255, 255, 255, 0.04);
          transform: translateX(4px);
        }

        .agent-node.selected {
          background: rgba(255, 255, 255, 0.05);
          box-shadow: inset 0 0 15px rgba(255, 255, 255, 0.02);
        }

        .agent-node.selected .chevron {
          transform: rotate(90deg) scale(1.1);
          opacity: 1;
        }

        /* Node Border Color Accents */
        .agent-node.purple.selected { border-color: rgba(167, 139, 250, 0.4); }
        .agent-node.red.selected { border-color: rgba(248, 113, 113, 0.4); }
        .agent-node.pink.selected { border-color: rgba(244, 114, 182, 0.4); }
        .agent-node.green.selected { border-color: rgba(52, 211, 153, 0.4); }
        .agent-node.rose.selected { border-color: rgba(251, 113, 133, 0.4); }
        .agent-node.amber.selected { border-color: rgba(251, 191, 36, 0.4); }
        .agent-node.blue.selected { border-color: rgba(96, 165, 250, 0.4); }
        .agent-node.teal.selected { border-color: rgba(45, 212, 191, 0.4); }

        .connection-line-right-active {
          position: absolute;
          right: -2rem;
          top: 50%;
          width: 2rem;
          height: 2px;
          background: linear-gradient(90deg, rgba(255,255,255,0.1) 0%, rgba(251, 146, 60, 0.3) 100%);
          z-index: 1;
        }

        /* Detail Map Columns */
        .details-wrapper {
          display: flex;
          flex-direction: column;
          gap: 1.5rem;
          width: 100%;
        }

        .detail-branch {
          background: rgba(255, 255, 255, 0.01);
          border: 1px solid var(--border-color);
          border-radius: 12px;
          padding: 1.25rem;
          display: flex;
          flex-direction: column;
          gap: 0.75rem;
        }

        .branch-header {
          display: flex;
          align-items: center;
          gap: 0.5rem;
          font-size: 0.9rem;
          font-weight: 600;
          color: var(--text-primary);
          border-bottom: 1px solid rgba(255, 255, 255, 0.03);
          padding-bottom: 0.5rem;
        }

        .branch-icon-bg {
          width: 26px;
          height: 26px;
          border-radius: 6px;
          display: flex;
          align-items: center;
          justify-content: center;
        }

        .branch-icon-bg.green { background: rgba(52, 211, 153, 0.1); }
        .branch-icon-bg.blue { background: rgba(96, 165, 250, 0.1); }
        .branch-icon-bg.orange { background: rgba(251, 146, 60, 0.1); }

        .branch-content {
          display: flex;
          flex-direction: column;
          gap: 0.6rem;
        }

        .branch-node {
          background: rgba(255, 255, 255, 0.02);
          border: 1px solid rgba(255, 255, 255, 0.03);
          border-radius: 8px;
          padding: 0.65rem 0.85rem;
          display: flex;
          align-items: center;
          gap: 0.5rem;
        }

        .node-bullet {
          width: 6px;
          height: 6px;
          border-radius: 50%;
          flex-shrink: 0;
        }

        .green-node .node-bullet { background: #34d399; }
        .blue-node .node-bullet { background: #60a5fa; }
        
        .node-text {
          font-size: 0.85rem;
          color: #e2e8f0;
          line-height: 1.4;
        }

        /* Next Action Highlight Node */
        .orange-node.highlighted {
          background: linear-gradient(135deg, rgba(251, 146, 60, 0.06) 0%, rgba(249, 115, 22, 0.02) 100%);
          border: 1px solid rgba(251, 146, 60, 0.2);
          box-shadow: 0 4px 12px rgba(251, 146, 60, 0.04);
        }

        .neon-glow-action {
          border-color: rgba(251, 146, 60, 0.1) !important;
        }
      `}</style>
    </div>
  );
}
