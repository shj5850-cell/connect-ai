'use client';

import { useState, useEffect, useRef } from 'react';
import Link from 'next/link';
import { Play, Loader2, Terminal, AlertCircle, CheckCircle2, RefreshCw, ExternalLink } from 'lucide-react';

export default function AgentConsole() {
  const [status, setStatus] = useState('idle'); // 'idle', 'running', 'completed', 'error'
  const [message, setMessage] = useState('대기 중');
  const [logs, setLogs] = useState('');
  const [selectedModel, setSelectedModel] = useState('qwen2.5-coder:1.5b');
  const [session, setSession] = useState(null);
  const [loading, setLoading] = useState(false);
  
  const logEndRef = useRef(null);
  const timerRef = useRef(null);

  const fetchStatus = async () => {
    try {
      const res = await fetch('/api/company/trigger-cycle');
      if (res.ok) {
        const json = await res.json();
        setStatus(json.status || 'idle');
        setMessage(json.message || '');
        setLogs(json.logs || '');
        setSession(json.session || null);

        // Stop polling if completed or error
        if (json.status !== 'running' && timerRef.current) {
          clearInterval(timerRef.current);
          timerRef.current = null;
        }
      }
    } catch (e) {
      console.error('Failed to fetch cycle status:', e);
    }
  };

  useEffect(() => {
    fetchStatus();
    
    // Auto-poll if running
    if (status === 'running') {
      if (!timerRef.current) {
        timerRef.current = setInterval(fetchStatus, 2000);
      }
    }

    return () => {
      if (timerRef.current) clearInterval(timerRef.current);
    };
  }, [status]);

  useEffect(() => {
    // Auto-scroll logs to bottom
    if (logEndRef.current) {
      logEndRef.current.scrollIntoView({ behavior: 'smooth' });
    }
  }, [logs]);

  const handleStartCycle = async () => {
    if (loading || status === 'running') return;
    
    setLoading(true);
    try {
      const res = await fetch('/api/company/trigger-cycle', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ model: selectedModel })
      });
      
      const json = await res.json();
      if (res.ok && json.success) {
        setStatus('running');
        setMessage('자율 사이클 실행을 초기화하는 중...');
        setLogs('자율 사이클 초기화 중...\n');
        
        // Start polling immediately
        if (timerRef.current) clearInterval(timerRef.current);
        timerRef.current = setInterval(fetchStatus, 1500);
      } else {
        throw new Error(json.error || '자율 사이클을 시작하지 못했습니다.');
      }
    } catch (e) {
      alert(e.message);
    } finally {
      setLoading(false);
    }
  };

  const handleReset = async () => {
    // Write an idle state back
    try {
      await fetch('/api/company/trigger-cycle', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'reset' }) // This endpoint will just reset if we implement it, or we just clear status local-side
      });
      setStatus('idle');
      setMessage('대기 중');
      setLogs('');
    } catch (e) {
      setStatus('idle');
      setMessage('대기 중');
      setLogs('');
    }
  };

  return (
    <section style={{ marginBottom: '3rem' }}>
      <h2 style={{ fontSize: '1.5rem', marginBottom: '1rem', display: 'flex', alignItems: 'center', gap: '0.5rem', color: 'var(--text-color)' }}>
        <Terminal size={24} color="#10b981" style={{ filter: 'drop-shadow(0 0 8px rgba(16,185,129,0.3))' }} />
        <span>에이전트 자율 사이클 가동 콘솔 (Interactive Control Center)</span>
      </h2>

      <div className="glass-panel" style={{ padding: '2rem', display: 'flex', flexDirection: 'column', gap: '1.5rem', background: 'linear-gradient(145deg, rgba(255,255,255,0.01) 0%, rgba(16, 185, 129, 0.02) 100%)' }}>
        
        {/* Controls row */}
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '1rem' }}>
          
          <div style={{ display: 'flex', gap: '1rem', alignItems: 'center' }}>
            <label style={{ fontSize: '0.9rem', color: 'var(--text-secondary)' }}>사용 모델 선택:</label>
            <select
              value={selectedModel}
              onChange={(e) => setSelectedModel(e.target.value)}
              disabled={status === 'running'}
              style={{
                padding: '0.5rem 1rem',
                background: 'rgba(0,0,0,0.4)',
                border: '1px solid var(--border-color)',
                borderRadius: '6px',
                color: '#fff',
                fontSize: '0.85rem',
                outline: 'none',
                cursor: status === 'running' ? 'not-allowed' : 'pointer'
              }}
            >
              <option value="qwen2.5-coder:1.5b">qwen2.5-coder:1.5b (경량형 - 900MB)</option>
              <option value="qwen2.5-coder:3b">qwen2.5-coder:3b (추천 - 1.9GB)</option>
              <option value="myungchul-coder:latest">myungchul-coder:latest (1.9GB)</option>
            </select>
          </div>

          <div style={{ display: 'flex', gap: '0.75rem' }}>
            {status !== 'running' ? (
              <button
                onClick={handleStartCycle}
                disabled={loading}
                className="btn"
                style={{
                  background: 'linear-gradient(135deg, #10b981 0%, #059669 100%)',
                  fontWeight: 'bold',
                  display: 'flex',
                  alignItems: 'center',
                  gap: '0.5rem',
                  boxShadow: '0 0 15px rgba(16,185,129,0.3)'
                }}
              >
                {loading ? <Loader2 size={16} className="animate-spin" /> : <Play size={16} />}
                <span>자율 사이클 즉시 가동</span>
              </button>
            ) : (
              <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', color: '#10b981', background: 'rgba(16,185,129,0.1)', padding: '0.5rem 1rem', borderRadius: '8px', border: '1px solid rgba(16,185,129,0.2)' }}>
                <Loader2 size={16} className="animate-spin" />
                <span style={{ fontSize: '0.85rem', fontWeight: 'bold' }}>에이전트 협업 작동 중...</span>
              </div>
            )}

            {status !== 'idle' && status !== 'running' && (
              <div style={{ display: 'flex', gap: '0.75rem' }}>
                {status === 'completed' && session && (
                  <Link
                    href={`/sessions/${session}?tab=documents`}
                    className="btn"
                    style={{
                      background: 'linear-gradient(135deg, #3b82f6 0%, #1d4ed8 100%)',
                      fontWeight: 'bold',
                      display: 'flex',
                      alignItems: 'center',
                      gap: '0.4rem',
                      boxShadow: '0 0 15px rgba(59,130,246,0.3)',
                      textDecoration: 'none'
                    }}
                  >
                    <ExternalLink size={16} />
                    <span>결과물 보기</span>
                  </Link>
                )}
                <button
                  onClick={handleReset}
                  className="btn btn-secondary"
                  style={{ display: 'flex', alignItems: 'center', gap: '0.4rem' }}
                >
                  <RefreshCw size={14} />
                  <span>콘솔 초기화</span>
                </button>
              </div>
            )}
          </div>

        </div>

        {/* Status indicator bar */}
        <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', background: 'rgba(0,0,0,0.2)', padding: '0.75rem 1rem', borderRadius: '8px', border: '1px solid var(--border-color)', fontSize: '0.85rem' }}>
          {status === 'running' ? (
            <span style={{ display: 'inline-block', width: '8px', height: '8px', borderRadius: '50%', background: '#3b82f6', boxShadow: '0 0 8px #3b82f6', animation: 'pulse-ring 1.5s infinite' }}></span>
          ) : status === 'completed' ? (
            <CheckCircle2 size={16} color="#10b981" />
          ) : status === 'error' ? (
            <AlertCircle size={16} color="#ef4444" />
          ) : (
            <span style={{ display: 'inline-block', width: '8px', height: '8px', borderRadius: '50%', background: 'var(--text-secondary)' }}></span>
          )}
          <span style={{ color: 'var(--text-secondary)' }}>상태:</span>
          <strong style={{ color: status === 'completed' ? '#10b981' : status === 'error' ? '#ef4444' : status === 'running' ? '#3b82f6' : 'white' }}>
            {message}
          </strong>
        </div>

        {/* Live log terminal view */}
        <div style={{ position: 'relative', display: 'flex', flexDirection: 'column', width: '100%' }}>
          <div style={{ background: '#090d16', border: '1px solid rgba(255,255,255,0.06)', borderRadius: '12px', padding: '1.25rem', height: '320px', overflowY: 'auto', fontFamily: 'Courier New, Courier, monospace', fontSize: '0.85rem', color: '#10b981', lineHeight: '1.5', boxShadow: 'inset 0 0 20px rgba(0,0,0,0.8)' }}>
            
            {logs ? (
              <pre style={{ margin: 0, whiteSpace: 'pre-wrap', wordBreak: 'break-all' }}>
                {logs}
              </pre>
            ) : (
              <div style={{ display: 'flex', height: '100%', alignItems: 'center', justifyContent: 'center', color: 'var(--text-secondary)', fontFamily: 'inherit' }}>
                [자율 사이클 실행 대기 중... 위의 버튼을 눌러 에이전트들을 기동하세요]
              </div>
            )}
            
            <div ref={logEndRef} />
          </div>
        </div>

      </div>
    </section>
  );
}
