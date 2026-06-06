'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import { 
  ArrowLeft, MessageSquare, ThumbsUp, Check, Loader2, Sparkles, 
  RefreshCw, CheckCircle2, AlertCircle, ExternalLink, HelpCircle
} from 'lucide-react';

export default function YouTubeCommentsPage() {
  const [comments, setComments] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [liveMode, setLiveMode] = useState(false); // Default to false so they see mock data quickly
  const [refreshKey, setRefreshKey] = useState(0);

  // States for individual comment replies
  const [replyTexts, setReplyTexts] = useState({}); // { commentId: text }
  const [submitting, setSubmitting] = useState({}); // { commentId: boolean }
  const [successMsgs, setSuccessMsgs] = useState({}); // { commentId: string }
  const [errorMsgs, setErrorMsgs] = useState({}); // { commentId: string }

  useEffect(() => {
    setLoading(true);
    setError('');
    fetch(`/api/youtube/comments?live=${liveMode}`)
      .then(res => {
        if (!res.ok) throw new Error('API 서버에서 댓글 목록을 가져오지 못했습니다.');
        return res.json();
      })
      .then(json => {
        if (json.success) {
          setComments(json.comments || []);
          // Initialize reply text fields with AI suggestions
          const initialTexts = {};
          json.comments.forEach(c => {
            initialTexts[c.id] = c.aiSuggestion || '';
          });
          setReplyTexts(initialTexts);
        } else {
          throw new Error(json.error || '댓글을 불러오는 중 서버 에러가 발생했습니다.');
        }
        setLoading(false);
      })
      .catch(err => {
        console.error(err);
        setError(err.message);
        setLoading(false);
      });
  }, [liveMode, refreshKey]);

  const handleReplyChange = (commentId, val) => {
    setReplyTexts(prev => ({ ...prev, [commentId]: val }));
  };

  const handleApplyAiSuggestion = (commentId, suggestion) => {
    handleReplyChange(commentId, suggestion);
  };

  const handleSendReply = async (commentId) => {
    const text = replyTexts[commentId];
    if (!text || !text.trim()) return;

    setSubmitting(prev => ({ ...prev, [commentId]: true }));
    setErrorMsgs(prev => ({ ...prev, [commentId]: '' }));
    setSuccessMsgs(prev => ({ ...prev, [commentId]: '' }));

    try {
      const res = await fetch('/api/youtube/comments', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ commentId, replyText: text })
      });

      const data = await res.json();
      if (res.ok && data.success) {
        setSuccessMsgs(prev => ({ ...prev, [commentId]: '답글이 성공적으로 YouTube에 게시되었습니다!' }));
        // Clear reply text
        handleReplyChange(commentId, '');
      } else {
        throw new Error(data.error || '답글 게시 중 오류가 발생했습니다.');
      }
    } catch (err) {
      console.error(err);
      setErrorMsgs(prev => ({ ...prev, [commentId]: err.message }));
    } finally {
      setSubmitting(prev => ({ ...prev, [commentId]: false }));
    }
  };

  return (
    <div className="container" style={{ padding: '2rem', maxWidth: '1200px' }}>
      
      {/* Header */}
      <header style={{ marginBottom: '2rem', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
          <Link href="/" style={{ display: 'inline-flex', alignItems: 'center', gap: '0.5rem', color: 'var(--text-primary)', width: 'fit-content' }} className="btn-secondary btn">
            <ArrowLeft size={16} /> 대시보드로 돌아가기
          </Link>
          <h1 className="title gradient-text" style={{ fontSize: '2.2rem', margin: 0, display: 'flex', alignItems: 'center', gap: '0.6rem' }}>
            <MessageSquare size={30} color="#a78bfa" style={{ filter: 'drop-shadow(0 0 8px rgba(167,139,250,0.4))' }} />
            <span>YouTube 댓글 관리 센터</span>
          </h1>
          <p style={{ color: 'var(--text-secondary)', margin: 0, fontSize: '0.95rem' }}>
            비서 에이전트(영숙)가 작성한 맞춤형 AI 답글 초안을 검토 및 수정하여 실시간으로 게시합니다.
          </p>
        </div>

        {/* Live mode toggle & Refresh */}
        <div style={{ display: 'flex', alignItems: 'center', gap: '1rem' }}>
          <div className="glass-panel" style={{ padding: '0.5rem 1rem', display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
            <span style={{ fontSize: '0.85rem', fontWeight: 600, color: liveMode ? '#10b981' : 'var(--text-secondary)' }}>
              {liveMode ? '🟢 실시간 연동 중' : '🧪 데모 시뮬레이션'}
            </span>
            <label className="switch-container" style={{ display: 'inline-block', position: 'relative', width: '40px', height: '20px' }}>
              <input 
                type="checkbox" 
                checked={liveMode}
                onChange={(e) => setLiveMode(e.target.checked)}
                style={{ opacity: 0, width: 0, height: 0 }}
              />
              <span className={`slider ${liveMode ? 'active' : ''}`} />
            </label>
          </div>
          <button onClick={() => setRefreshKey(prev => prev + 1)} className="btn-secondary btn" style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
            <RefreshCw size={16} /> 새로고침
          </button>
        </div>
      </header>

      {/* Warning banner for demo */}
      {!liveMode && (
        <div className="glass-panel" style={{ 
          padding: '1.25rem', 
          borderLeft: '4px solid #10b981', 
          background: 'rgba(16,185,129,0.05)', 
          marginBottom: '2rem',
          display: 'flex',
          alignItems: 'center',
          gap: '1rem'
        }}>
          <HelpCircle size={24} color="#10b981" style={{ flexShrink: 0 }} />
          <div>
            <div style={{ fontWeight: 'bold', color: 'white', marginBottom: '0.2rem' }}>💡 데모 시뮬레이션 모드 작동 중</div>
            <div style={{ fontSize: '0.85rem', color: 'var(--text-secondary)' }}>
              가짜 계정 및 가상의 댓글 데이터입니다. 우측 상단의 토글 스위치를 켜면 실제 유튜브 계정 API 연동을 통해 내 채널에 등록된 실시간 댓글을 가져올 수 있습니다. (답글 전송 시 실제 유튜브에 등록됩니다.)
            </div>
          </div>
        </div>
      )}

      {error && (
        <div className="error-message-box" style={{ marginBottom: '2rem', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
          <AlertCircle size={16} />
          <span>오류: {error}</span>
        </div>
      )}

      {/* Comments List */}
      {loading ? (
        <div style={{ padding: '4rem 0', textAlign: 'center' }}>
          <Loader2 className="animate-spin" size={32} color="var(--accent-color)" style={{ margin: '0 auto 1rem auto' }} />
          <p style={{ color: 'var(--text-secondary)' }}>시청자들의 댓글과 AI 답변 후보를 준비하고 있습니다...</p>
        </div>
      ) : comments.length === 0 ? (
        <div className="glass-panel" style={{ padding: '4rem', textAlign: 'center', color: 'var(--text-secondary)' }}>
          수집된 최근 댓글이 없습니다.
        </div>
      ) : (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>
          {comments.map((comment) => (
            <div key={comment.id} className="glass-panel" style={{ padding: '2rem', background: 'linear-gradient(145deg, rgba(255,255,255,0.02) 0%, rgba(167, 139, 250, 0.02) 100%)' }}>
              <div style={{ display: 'grid', gridTemplateColumns: 'minmax(0, 1fr) 380px', gap: '2rem' }}>
                
                {/* Left Side: Comment Detail */}
                <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
                  {/* User Profile Bar */}
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
                      <div style={{ 
                        width: '36px', 
                        height: '36px', 
                        borderRadius: '50%', 
                        background: 'var(--accent-gradient)', 
                        display: 'flex', 
                        alignItems: 'center', 
                        justifyContent: 'center',
                        fontWeight: 'bold',
                        color: 'white',
                        fontSize: '0.85rem'
                      }}>
                        {comment.author.substring(0, 1).toUpperCase()}
                      </div>
                      <div>
                        <div style={{ fontWeight: 600, color: 'white', fontSize: '0.95rem' }}>{comment.author}</div>
                        <div style={{ fontSize: '0.75rem', color: 'var(--text-secondary)' }}>
                          {new Date(comment.publishedAt).toLocaleString('ko-KR')}
                        </div>
                      </div>
                    </div>
                    {comment.videoId && (
                      <a 
                        href={`https://youtu.be/${comment.videoId}`} 
                        target="_blank" 
                        rel="noreferrer"
                        style={{ display: 'inline-flex', alignItems: 'center', gap: '0.25rem', fontSize: '0.75rem', color: '#38bdf8', textDecoration: 'none' }}
                      >
                        영상 보기 <ExternalLink size={12} />
                      </a>
                    )}
                  </div>

                  {/* Comment Body */}
                  <div style={{ 
                    background: 'rgba(0,0,0,0.2)', 
                    padding: '1rem 1.25rem', 
                    borderRadius: '8px', 
                    color: 'white',
                    fontSize: '0.95rem',
                    lineHeight: '1.6',
                    border: '1px solid rgba(255,255,255,0.03)'
                  }}>
                    {comment.text}
                  </div>

                  {/* Likes Info */}
                  <div style={{ display: 'flex', alignItems: 'center', gap: '0.35rem', fontSize: '0.8rem', color: 'var(--text-secondary)' }}>
                    <ThumbsUp size={12} /> 좋아요 {comment.likes}개
                  </div>
                </div>

                {/* Right Side: AI Reply Suggestion & Send Console */}
                <div style={{ 
                  borderLeft: '1px solid rgba(255,255,255,0.08)', 
                  paddingLeft: '2rem',
                  display: 'flex',
                  flexDirection: 'column',
                  gap: '1rem'
                }}>
                  {/* AI Suggestion Alert */}
                  <div style={{ 
                    background: 'rgba(167, 139, 250, 0.08)', 
                    border: '1px solid rgba(167, 139, 250, 0.2)', 
                    padding: '0.75rem 1rem', 
                    borderRadius: '8px',
                    display: 'flex',
                    flexDirection: 'column',
                    gap: '0.5rem'
                  }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '0.4rem', color: '#c084fc', fontSize: '0.8rem', fontWeight: 'bold' }}>
                      <Sparkles size={14} /> AI 비서 영숙의 답글 추천
                    </div>
                    <p style={{ fontSize: '0.85rem', color: 'white', margin: 0, fontStyle: 'italic' }}>
                      "{comment.aiSuggestion}"
                    </p>
                    <button 
                      onClick={() => handleApplyAiSuggestion(comment.id, comment.aiSuggestion)}
                      className="btn-secondary btn"
                      style={{ padding: '0.3rem 0.5rem', fontSize: '0.75rem', alignSelf: 'flex-end', display: 'flex', alignItems: 'center', gap: '0.2rem' }}
                    >
                      이 답변 적용하기
                    </button>
                  </div>

                  {/* Custom reply input */}
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
                    <label style={{ fontSize: '0.8rem', color: 'var(--text-secondary)', fontWeight: 500 }}>
                      답글 내용 작성
                    </label>
                    <textarea 
                      rows={3}
                      value={replyTexts[comment.id] || ''}
                      onChange={(e) => handleReplyChange(comment.id, e.target.value)}
                      placeholder="답글 내용을 입력하세요..."
                      style={{ 
                        width: '100%', 
                        padding: '0.75rem', 
                        background: 'rgba(0,0,0,0.3)', 
                        border: '1px solid rgba(255,255,255,0.15)', 
                        borderRadius: '6px',
                        color: 'white',
                        fontSize: '0.85rem',
                        resize: 'none'
                      }}
                    />
                  </div>

                  {/* Status messaging */}
                  {successMsgs[comment.id] && (
                    <div style={{ fontSize: '0.8rem', color: '#10b981', background: 'rgba(16,185,129,0.08)', padding: '0.5rem', borderRadius: '4px', border: '1px solid rgba(16,185,129,0.2)', display: 'flex', alignItems: 'center', gap: '0.25rem' }}>
                      <CheckCircle2 size={14} />
                      {successMsgs[comment.id]}
                    </div>
                  )}

                  {errorMsgs[comment.id] && (
                    <div style={{ fontSize: '0.8rem', color: '#ef4444', background: 'rgba(239,68,68,0.08)', padding: '0.5rem', borderRadius: '4px', border: '1px solid rgba(239,68,68,0.2)', display: 'flex', alignItems: 'center', gap: '0.25rem' }}>
                      <AlertCircle size={14} />
                      {errorMsgs[comment.id]}
                    </div>
                  )}

                  {/* Send Button */}
                  <button 
                    onClick={() => handleSendReply(comment.id)}
                    disabled={submitting[comment.id] || !replyTexts[comment.id]?.trim()}
                    className="btn" 
                    style={{ 
                      width: '100%', 
                      display: 'flex', 
                      alignItems: 'center', 
                      justifyContent: 'center', 
                      gap: '0.5rem', 
                      padding: '0.6rem 0' 
                    }}
                  >
                    {submitting[comment.id] ? (
                      <>
                        <Loader2 className="animate-spin" size={16} /> 전송 중...
                      </>
                    ) : (
                      <>
                        <Check size={16} /> 답글 게시 승인
                      </>
                    )}
                  </button>

                </div>

              </div>
            </div>
          ))}
        </div>
      )}

      {/* CSS Styles for Switch component */}
      <style jsx global>{`
        .switch-container input:checked + .slider {
          background-color: #10b981;
        }
        .switch-container input:checked + .slider:before {
          transform: translateX(20px);
        }
        .slider {
          position: absolute;
          cursor: pointer;
          top: 0;
          left: 0;
          right: 0;
          bottom: 0;
          background-color: rgba(255,255,255,0.15);
          transition: .4s;
          border-radius: 20px;
        }
        .slider:before {
          position: absolute;
          content: "";
          height: 14px;
          width: 14px;
          left: 3px;
          bottom: 3px;
          background-color: white;
          transition: .4s;
          border-radius: 50%;
        }
        .slider.active {
          background-color: #10b981;
        }
        .slider.active:before {
          transform: translateX(20px);
        }
      `}</style>
    </div>
  );
}
