'use client';

import React, { useState, useEffect, use } from 'react';
import Link from 'next/link';
import ReactMarkdown from 'react-markdown';
import { ArrowLeft, Coins, Sparkles, Loader2, CheckCircle } from 'lucide-react';

export default function MonetizationPage({ params }) {
  const resolvedParams = use(params);
  const { id } = resolvedParams;
  const [content, setContent] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [isGenerated, setIsGenerated] = useState(false);

  // Check if monetization already exists by doing a check
  useEffect(() => {
    async function checkExisting() {
      setLoading(true);
      try {
        const res = await fetch('/api/monetize', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ sessionId: id })
        });
        if (res.ok) {
          const data = await res.json();
          if (data.content) {
            setContent(data.content);
            setIsGenerated(true);
          }
        }
      } catch (err) {
        console.error("Failed to check existing guide", err);
      } finally {
        setLoading(false);
      }
    }
    checkExisting();
  }, [id]);

  const generateBlueprint = async () => {
    setLoading(true);
    setError('');
    try {
      const res = await fetch('/api/monetize', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ sessionId: id })
      });
      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.error || '수익화 가이드를 생성하지 못했습니다.');
      }
      setContent(data.content);
      setIsGenerated(true);
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="container">
      <header className="header" style={{ marginBottom: '2rem', borderBottom: 'none', paddingBottom: 0 }}>
        <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem', width: '100%' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <Link href={`/sessions/${id}`} style={{ display: 'inline-flex', alignItems: 'center', gap: '0.5rem', color: 'var(--text-primary)' }} className="btn-secondary btn">
              <ArrowLeft size={16} /> 세션 결과물로 돌아가기
            </Link>
          </div>
          <h1 className="title" style={{ fontSize: '2.2rem', display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
            💰 <span className="gradient-text">수익화 분석 블루프린트</span>
          </h1>
          <p style={{ color: 'var(--text-secondary)' }}>
            세션 ID: <strong>{id}</strong> · 수집한 실무 데이터를 바탕으로 AI가 구체적인 1인 수익화 전략을 제시합니다.
          </p>
        </div>
      </header>

      {error && (
        <div className="glass-panel" style={{ padding: '1.5rem', marginBottom: '2rem', borderColor: '#f87171', background: 'rgba(248, 113, 113, 0.05)' }}>
          <p style={{ color: '#f87171', fontWeight: 600 }}>⚠️ 에러 발생</p>
          <p style={{ color: 'var(--text-primary)', marginTop: '0.5rem' }}>{error}</p>
        </div>
      )}

      {loading ? (
        <div className="glass-panel" style={{ padding: '6rem 2rem', textAlign: 'center', display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '1.5rem' }}>
          <Loader2 size={48} className="animate-spin" style={{ color: 'var(--accent-hover)', animation: 'spin 1.5s linear infinite' }} />
          <div>
            <p style={{ fontWeight: 600, fontSize: '1.1rem' }}>로컬 AI가 수익화 전략을 세우는 중입니다...</p>
            <p style={{ color: 'var(--text-secondary)', fontSize: '0.9rem', marginTop: '0.5rem' }}>
              세션에 포함된 문서를 읽고 비즈니스 모델을 구상하고 있습니다 (약 10~30초 소요)
            </p>
          </div>
        </div>
      ) : !isGenerated ? (
        <div className="glass-panel" style={{ padding: '4rem 2rem', textAlign: 'center', display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '1.5rem' }}>
          <div style={{ background: 'rgba(109, 40, 217, 0.1)', padding: '1.5rem', borderRadius: '50%', border: '1px solid rgba(109, 40, 217, 0.2)' }}>
            <Coins size={48} style={{ color: 'var(--accent-hover)' }} />
          </div>
          <div style={{ maxWidth: '600px' }}>
            <h2 style={{ fontSize: '1.5rem', marginBottom: '0.75rem' }}>이 세션에서 수익 창출 기회 발견하기</h2>
            <p style={{ color: 'var(--text-secondary)', lineHeight: 1.6 }}>
              에이전트들이 이번 세션에서 수집한 데이터와 지시 사항들을 종합하여, 
              실제 1인 기업이 수익화할 수 있는 핵심 요점 및 단계별 실행 로드맵을 자동으로 설계합니다.
            </p>
          </div>
          <button onClick={generateBlueprint} className="btn" style={{ padding: '0.9rem 2rem', display: 'inline-flex', alignItems: 'center', gap: '0.75rem', fontSize: '1rem', fontWeight: 600 }}>
            <Sparkles size={18} /> 로컬 AI로 1인 수익화 전략 설계하기
          </button>
        </div>
      ) : (
        <div className="glass-panel" style={{ padding: '2.5rem', background: 'linear-gradient(145deg, rgba(255,255,255,0.01) 0%, rgba(109, 40, 217, 0.03) 100%)', border: '1px solid rgba(109, 40, 217, 0.15)' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', marginBottom: '1.5rem', background: 'rgba(16, 185, 129, 0.1)', padding: '0.5rem 1rem', borderRadius: '8px', width: 'fit-content', border: '1px solid rgba(16, 185, 129, 0.2)' }}>
            <CheckCircle size={16} color="#10b981" />
            <span style={{ fontSize: '0.85rem', color: '#10b981', fontWeight: 600 }}>AI 수익화 설계 완료 (monetization.md 저장됨)</span>
          </div>
          <div className="markdown-content">
            <ReactMarkdown>{content}</ReactMarkdown>
          </div>
          
          <div style={{ marginTop: '3rem', paddingTop: '2rem', borderTop: '1px solid var(--border-color)', display: 'flex', justifyContent: 'center' }}>
            <button onClick={generateBlueprint} className="btn btn-secondary" style={{ display: 'inline-flex', alignItems: 'center', gap: '0.5rem' }}>
              <Sparkles size={16} /> 전략 다시 설계하기 (새로고침)
            </button>
          </div>
        </div>
      )}
      
      {/* CSS Spin Keyframes */}
      <style jsx global>{`
        @keyframes spin {
          from { transform: rotate(0deg); }
          to { transform: rotate(360deg); }
        }
      `}</style>
    </div>
  );
}
