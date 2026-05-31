'use client';

import React, { useState, useEffect } from 'react';
import { Play, Terminal, Code2, CheckCircle2 } from 'lucide-react';
import ReactMarkdown from 'react-markdown';

export default function SandboxPage() {
  const [input, setInput] = useState('');
  const [logs, setLogs] = useState([{ type: 'system', text: '샌드박스 시뮬레이터가 준비되었습니다. 좌측에서 에이전트 결과물을 확인하고 우측에서 테스트해 보세요.' }]);
  const [isSimulating, setIsSimulating] = useState(false);

  const handleSimulate = (e) => {
    e.preventDefault();
    if (!input.trim()) return;
    
    setLogs(prev => [...prev, { type: 'user', text: input }]);
    setInput('');
    setIsSimulating(true);

    // 가상의 시뮬레이션 지연
    setTimeout(() => {
      setLogs(prev => [...prev, { 
        type: 'agent', 
        text: '에이전트 모델 테스트 결과: 성공적으로 응답을 생성했습니다.\n- 예상 ROI: 15%\n- 분석 결과: 타겟 유저 반응 양호'
      }]);
      setIsSimulating(false);
    }, 1500);
  };

  return (
    <div className="container" style={{ padding: '2rem' }}>
      <h1 className="title gradient-text" style={{ marginBottom: '2rem' }}>테스트 공간 (Sandbox)</h1>
      
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '2rem', height: 'calc(100vh - 200px)' }}>
        
        {/* Left Column: Output Selection */}
        <div className="glass-panel" style={{ padding: '2rem', display: 'flex', flexDirection: 'column' }}>
          <h2 style={{ fontSize: '1.2rem', marginBottom: '1rem', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
            <Code2 size={20} color="var(--accent-color)" /> 최근 산출물 목록
          </h2>
          <div style={{ flex: 1, overflowY: 'auto', background: 'rgba(0,0,0,0.2)', padding: '1rem', borderRadius: '8px' }}>
            <p style={{ color: 'var(--text-secondary)', marginBottom: '1rem' }}>에이전트들이 생성한 최신 비즈니스 모델 및 스크립트를 선택하여 테스트하세요.</p>
            
            <div style={{ padding: '1rem', background: 'rgba(255,255,255,0.05)', borderRadius: '8px', marginBottom: '1rem', borderLeft: '4px solid var(--accent-color)', cursor: 'pointer' }}>
              <h4 style={{ color: 'white', marginBottom: '0.5rem' }}>Business 전략 스크립트 v1.2</h4>
              <p style={{ fontSize: '0.85rem', color: 'var(--text-secondary)' }}>타겟 분석 및 수익화 시나리오</p>
            </div>
            
            <div style={{ padding: '1rem', background: 'rgba(255,255,255,0.05)', borderRadius: '8px', marginBottom: '1rem', cursor: 'pointer' }}>
              <h4 style={{ color: 'white', marginBottom: '0.5rem' }}>Developer API 프롬프트</h4>
              <p style={{ fontSize: '0.85rem', color: 'var(--text-secondary)' }}>자동화 봇 시스템 연동 규격</p>
            </div>
          </div>
        </div>

        {/* Right Column: Simulator */}
        <div className="glass-panel" style={{ padding: '2rem', display: 'flex', flexDirection: 'column', background: 'linear-gradient(145deg, rgba(255,255,255,0.02) 0%, rgba(138, 43, 226, 0.05) 100%)' }}>
          <h2 style={{ fontSize: '1.2rem', marginBottom: '1rem', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
            <Terminal size={20} color="var(--accent-secondary)" /> 모의 시뮬레이터
          </h2>
          
          <div style={{ flex: 1, overflowY: 'auto', background: 'rgba(0,0,0,0.4)', padding: '1rem', borderRadius: '8px', marginBottom: '1rem', display: 'flex', flexDirection: 'column', gap: '1rem' }}>
            {logs.map((log, idx) => (
              <div key={idx} style={{ 
                alignSelf: log.type === 'user' ? 'flex-end' : 'flex-start',
                background: log.type === 'user' ? 'var(--accent-color)' : (log.type === 'agent' ? 'rgba(255,255,255,0.1)' : 'transparent'),
                color: log.type === 'system' ? 'var(--text-secondary)' : 'white',
                padding: '0.8rem 1.2rem',
                borderRadius: '8px',
                maxWidth: '80%',
                fontSize: '0.9rem',
                border: log.type === 'agent' ? '1px solid rgba(255,255,255,0.1)' : 'none'
              }}>
                <ReactMarkdown>{log.text}</ReactMarkdown>
              </div>
            ))}
            {isSimulating && (
              <div style={{ alignSelf: 'flex-start', color: 'var(--accent-secondary)', fontSize: '0.9rem' }}>
                <span className="blinking-cursor">시뮬레이션 분석 중...</span>
              </div>
            )}
          </div>

          <form onSubmit={handleSimulate} style={{ display: 'flex', gap: '1rem' }}>
            <input 
              type="text" 
              value={input}
              onChange={(e) => setInput(e.target.value)}
              placeholder="테스트할 데이터나 상황을 입력하세요..." 
              style={{ 
                flex: 1, 
                padding: '1rem', 
                background: 'rgba(0,0,0,0.3)', 
                border: '1px solid rgba(255,255,255,0.2)', 
                borderRadius: '8px',
                color: 'white'
              }} 
            />
            <button type="submit" disabled={isSimulating} className="btn" style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', padding: '0 1.5rem' }}>
              <Play size={18} /> 테스트 실행
            </button>
          </form>
        </div>

      </div>
    </div>
  );
}
