'use client';

import { useState } from 'react';
import { Send, Check, AlertCircle, Loader2 } from 'lucide-react';

export default function SendToCodexButton({ sessionId }) {
  const [status, setStatus] = useState('idle'); // idle, loading, success, error
  const [errorMsg, setErrorMsg] = useState('');

  const handleSend = async () => {
    if (status === 'loading') return;
    
    setStatus('loading');
    setErrorMsg('');

    try {
      const response = await fetch('/api/send-to-codex', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ sessionId }),
      });

      const data = await response.json();

      if (response.ok && data.success) {
        setStatus('success');
        // 3초 후 다시 원래 상태로 복원
        setTimeout(() => {
          setStatus('idle');
        }, 3000);
      } else {
        setStatus('error');
        setErrorMsg(data.error || '전송 도중 오류가 발생했습니다.');
      }
    } catch (error) {
      console.error(error);
      setStatus('error');
      setErrorMsg('네트워크 통신 오류가 발생했습니다.');
    }
  };

  // Status-specific configuration
  let buttonText = '코덱스로 전송';
  let buttonStyle = {
    background: 'var(--accent-gradient)',
    border: 'none',
    color: '#ffffff',
  };
  let Icon = Send;

  if (status === 'loading') {
    buttonText = '전송 중...';
    buttonStyle = {
      background: 'rgba(255, 255, 255, 0.05)',
      border: '1px solid var(--border-color)',
      color: 'var(--text-secondary)',
      cursor: 'not-allowed',
    };
    Icon = Loader2;
  } else if (status === 'success') {
    buttonText = '전송 성공';
    buttonStyle = {
      background: 'linear-gradient(135deg, #10b981, #059669)',
      border: 'none',
      color: '#ffffff',
      boxShadow: '0 0 15px rgba(16, 185, 129, 0.25)',
    };
    Icon = Check;
  } else if (status === 'error') {
    buttonText = '전송 실패';
    buttonStyle = {
      background: 'linear-gradient(135deg, #ef4444, #dc2626)',
      border: 'none',
      color: '#ffffff',
      boxShadow: '0 0 15px rgba(239, 68, 68, 0.25)',
    };
    Icon = AlertCircle;
  }

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem', alignItems: 'flex-end' }}>
      <button
        onClick={handleSend}
        disabled={status === 'loading'}
        className="btn"
        style={{
          ...buttonStyle,
          display: 'inline-flex',
          alignItems: 'center',
          gap: '0.6rem',
          padding: '0.6rem 1.25rem',
          borderRadius: '10px',
          fontWeight: '600',
          fontSize: '0.9rem',
          transition: 'all 0.3s cubic-bezier(0.16, 1, 0.3, 1)',
        }}
      >
        <Icon size={16} className={status === 'loading' ? 'animate-spin' : ''} style={{
          animation: status === 'loading' ? 'spin 1s linear infinite' : 'none'
        }} />
        {buttonText}
      </button>

      {/* Error message detail */}
      {status === 'error' && (
        <span style={{ 
          fontSize: '0.8rem', 
          color: '#ef4444', 
          background: 'rgba(239, 68, 68, 0.08)', 
          padding: '0.3rem 0.75rem', 
          borderRadius: '6px',
          border: '1px solid rgba(239, 68, 68, 0.2)',
          maxWidth: '300px',
          textAlign: 'right',
          wordBreak: 'break-all'
        }}>
          {errorMsg}
        </span>
      )}

      {/* Success notification popup styling trick as simple message */}
      {status === 'success' && (
        <span style={{ 
          fontSize: '0.8rem', 
          color: '#10b981', 
          background: 'rgba(16, 185, 129, 0.08)', 
          padding: '0.3rem 0.75rem', 
          borderRadius: '6px',
          border: '1px solid rgba(16, 185, 129, 0.2)',
          textAlign: 'right'
        }}>
          세션 데이터가 JSON으로 변환되어 전송되었습니다.
        </span>
      )}

      <style jsx global>{`
        @keyframes spin {
          from {
            transform: rotate(0deg);
          }
          to {
            transform: rotate(360deg);
          }
        }
      `}</style>
    </div>
  );
}
