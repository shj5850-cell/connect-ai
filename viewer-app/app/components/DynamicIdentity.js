'use client';

import { useState, useEffect } from 'react';
import { Compass, Lightbulb, Target, Sparkles, Loader2 } from 'lucide-react';

export default function DynamicIdentity() {
  const [identityData, setIdentityData] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let active = true;
    setLoading(true);

    fetch('/api/company-identity')
      .then(res => res.json())
      .then(data => {
        if (active && data.success) {
          setIdentityData({
            identity: data.identity,
            focus: data.focus,
            suggestion: data.suggestion
          });
          setLoading(false);
        }
      })
      .catch(err => {
        console.error('Failed to fetch dynamic company identity', err);
        if (active) setLoading(false);
      });

    return () => {
      active = false;
    };
  }, []);

  if (loading) {
    return (
      <section style={{ marginBottom: '3rem' }}>
        <h2 style={{ fontSize: '1.2rem', marginBottom: '1rem', display: 'flex', alignItems: 'center', gap: '0.5rem', color: 'var(--text-color)' }}>
          <Compass size={24} color="#00d2ff" className="animate-pulse" /> 🏢 실시간 기업 정체성 & 방향성 (Live Identity)
        </h2>
        <div className="glass-panel" style={{ padding: '2rem', minHeight: '180px', display: 'flex', flexDirection: 'column', justifyContent: 'center', alignItems: 'center', gap: '1rem' }}>
          <Loader2 size={24} className="animate-spin" color="var(--accent-secondary)" />
          <span style={{ fontSize: '0.9rem', color: 'var(--text-secondary)' }}>실시간 에이전트 작업물 기반 기업 정체성 분석 중...</span>
        </div>
      </section>
    );
  }

  const { identity, focus, suggestion } = identityData || {
    identity: "AI 트렌드 연구 및 소셜 콘텐츠 자동화 수익 모델을 설계하는 가상 에이전트 협업 기업",
    focus: [],
    suggestion: ""
  };

  return (
    <section style={{ marginBottom: '3rem' }}>
      <h2 style={{ fontSize: '1.2rem', marginBottom: '1rem', display: 'flex', alignItems: 'center', gap: '0.5rem', color: 'var(--text-color)' }}>
        <Compass size={24} color="#00d2ff" style={{ filter: 'drop-shadow(0 0 8px rgba(0, 210, 255, 0.4))' }} /> 🏢 실시간 기업 정체성 & 방향성 (Live Identity)
      </h2>
      
      <div className="glass-panel identity-panel" style={{ padding: '2rem' }}>
        
        {/* Brand Identity Declaration */}
        <div className="brand-statement-box">
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', marginBottom: '0.5rem' }}>
            <Sparkles size={16} color="#fbbf24" />
            <span style={{ fontSize: '0.75rem', fontWeight: 700, color: '#fbbf24', letterSpacing: '0.05em' }}>CURRENT CORPORATE IDENTITY</span>
          </div>
          <p className="brand-statement-text">
            "{identity}"
          </p>
        </div>

        <div className="identity-content-grid">
          {/* Left: Core Focus Points */}
          <div className="focus-section">
            <h3 style={{ fontSize: '0.95rem', fontWeight: 650, color: '#60a5fa', display: 'flex', alignItems: 'center', gap: '0.4rem', marginBottom: '1rem' }}>
              <Target size={16} /> 실시간 집중 비즈니스 포커스
            </h3>
            <ul className="focus-list">
              {focus.map((item, index) => (
                <li key={index} className="focus-item">
                  <div className="focus-dot"></div>
                  <span className="focus-text">{item}</span>
                </li>
              ))}
            </ul>
          </div>

          {/* Right: Key Decision Recommendation for CEO */}
          <div className="ceo-suggestion-section">
            <div className="suggestion-card">
              <h3 style={{ fontSize: '0.95rem', fontWeight: 700, color: '#fb923c', display: 'flex', alignItems: 'center', gap: '0.4rem', marginBottom: '0.75rem' }}>
                <Lightbulb size={18} color="#fb923c" /> 사장님을 위한 실시간 제안
              </h3>
              <p className="suggestion-text">
                {suggestion}
              </p>
            </div>
          </div>
        </div>

      </div>

      <style jsx>{`
        .identity-panel {
          background: linear-gradient(135deg, rgba(0, 210, 255, 0.04) 0%, rgba(109, 40, 217, 0.02) 100%);
          border-color: rgba(0, 210, 255, 0.12);
        }

        .brand-statement-box {
          background: rgba(0, 0, 0, 0.25);
          border: 1px solid rgba(255, 255, 255, 0.03);
          border-radius: 12px;
          padding: 1.25rem 1.5rem;
          margin-bottom: 1.75rem;
          box-shadow: inset 0 0 15px rgba(0, 0, 0, 0.2);
        }

        .brand-statement-text {
          font-size: 1.15rem;
          font-weight: 700;
          line-height: 1.5;
          color: #ffffff;
          font-style: italic;
          text-align: center;
          background: linear-gradient(90deg, #ffffff 0%, #a78bfa 100%);
          -webkit-background-clip: text;
          -webkit-text-fill-color: transparent;
          background-clip: text;
        }

        .identity-content-grid {
          display: grid;
          grid-template-columns: 1.2fr 1fr;
          gap: 2rem;
          align-items: start;
        }

        @media (max-width: 800px) {
          .identity-content-grid {
            grid-template-columns: 1fr;
            gap: 1.5rem;
          }
        }

        .focus-section {
          display: flex;
          flex-direction: column;
        }

        .focus-list {
          list-style: none;
          padding: 0;
          margin: 0;
          display: flex;
          flex-direction: column;
          gap: 0.75rem;
        }

        .focus-item {
          display: flex;
          align-items: flex-start;
          gap: 0.6rem;
        }

        .focus-dot {
          width: 6px;
          height: 6px;
          border-radius: 50%;
          background: #60a5fa;
          margin-top: 0.45rem;
          flex-shrink: 0;
          box-shadow: 0 0 6px #60a5fa;
        }

        .focus-text {
          font-size: 0.85rem;
          color: #cbd5e1;
          line-height: 1.4;
        }

        .ceo-suggestion-section {
          height: 100%;
        }

        .suggestion-card {
          background: rgba(251, 146, 60, 0.05);
          border: 1px solid rgba(251, 146, 60, 0.15);
          border-radius: 12px;
          padding: 1.25rem;
          height: 100%;
          box-shadow: 0 4px 15px rgba(251, 146, 60, 0.02);
        }

        .suggestion-text {
          font-size: 0.85rem;
          color: #e2e8f0;
          line-height: 1.6;
          margin: 0;
        }

        @keyframes pulse {
          0%, 100% { opacity: 0.6; }
          50% { opacity: 1; }
        }

        .animate-pulse {
          animation: pulse 2s cubic-bezier(0.4, 0, 0.6, 1) infinite;
        }

        @keyframes spin {
          from { transform: rotate(0deg); }
          to { transform: rotate(360deg); }
        }

        .animate-spin {
          animation: spin 1s linear infinite;
        }
      `}</style>
    </section>
  );
}
