'use client';

import { useState, useEffect } from 'react';
import { 
  Scissors, Video, FileText, Play, Copy, Check, 
  Sparkles, Loader2, RefreshCw, AlertCircle, ArrowLeft, ExternalLink
} from 'lucide-react';
import Link from 'next/link';

export default function LongToShortPage() {
  const [mode, setMode] = useState('video'); // 'video' (trending shorts) or 'text' (script editor)
  const [longText, setLongText] = useState('');
  const [shortsCount, setShortsCount] = useState(3);
  const [loading, setLoading] = useState(false);
  const [shortsList, setShortsList] = useState([]);
  const [copiedId, setCopiedId] = useState(null);
  const [errorMsg, setErrorMsg] = useState('');

  // Viral Shorts states
  const [viralShorts, setViralShorts] = useState([]);
  const [viralLoading, setViralLoading] = useState(false);
  const [extractingId, setExtractingId] = useState(null);
  const [playingId, setPlayingId] = useState(null);

  const fetchViralShorts = async () => {
    setViralLoading(true);
    setErrorMsg('');
    try {
      const response = await fetch('/api/viral-shorts');
      const data = await response.json();
      if (data.success) {
        setViralShorts(data.shorts || []);
      } else {
        setErrorMsg('유튜브 인기 숏폼 목록을 불러오는 도중 오류가 발생했습니다.');
      }
    } catch (err) {
      console.error(err);
      setErrorMsg('유튜브 인기 숏폼 API 호출 중 네트워크 오류가 발생했습니다.');
    } finally {
      setViralLoading(false);
    }
  };

  useEffect(() => {
    fetchViralShorts();
  }, []);

  const handleTextGenerate = async (e) => {
    e.preventDefault();
    if (!longText.trim()) return;

    setLoading(true);
    setErrorMsg('');
    setShortsList([]);

    try {
      const response = await fetch('/api/long-to-short', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ text: longText, count: shortsCount })
      });

      const data = await response.json();

      if (response.ok && data.success) {
        setShortsList(data.shorts);
      } else {
        setErrorMsg(data.error || '대본 변환 도중 오류가 발생했습니다.');
      }
    } catch (err) {
      console.error(err);
      setErrorMsg('네트워크 통신 오류가 발생했습니다.');
    } finally {
      setLoading(false);
    }
  };

  const handleExtractTranscript = async (short) => {
    setExtractingId(short.id);
    setErrorMsg('');
    try {
      const response = await fetch(`/api/analyze-viral-short?url=${encodeURIComponent(short.url || 'https://www.youtube.com/shorts/' + short.id)}`);
      const data = await response.json();
      if (data.success && data.transcript) {
        setLongText(data.transcript);
        setMode('text'); // Switch tab to text mode
        window.scrollTo({ top: 300, behavior: 'smooth' });
      } else {
        setErrorMsg(data.error || '이 영상에서 자막을 추출하는 데 실패했습니다. (자막이 비활성화된 영상일 수 있습니다)');
      }
    } catch (err) {
      console.error(err);
      setErrorMsg('자막 분석 API 호출 중 오류가 발생했습니다.');
    } finally {
      setExtractingId(null);
    }
  };

  const handleCopyScript = (id, scriptText) => {
    navigator.clipboard.writeText(scriptText);
    setCopiedId(id);
    setTimeout(() => setCopiedId(null), 2000);
  };

  const loadExampleText = () => {
    setLongText(`[유튜브 롱폼 대본 예시]
요즘 1인 AI 기업이라는 말이 유행이죠. 많은 사람들이 퇴사하고 AI 툴을 배워서 사업을 시작하고 싶어합니다. 하지만 실질적으로 1인 기업으로 수익을 올리는 사람은 극소수입니다. 
이유가 뭘까요? 가장 큰 원인은 '돈을 벌어다 주는 실체화가 없기 때문'입니다. 보통 사람들은 AI 툴을 10개씩 공부하고 정리하지만, 그 툴들을 연결해서 실제로 무엇을 판매할지 기획하지 않습니다. 
예를 들어, Trend Researcher 에이전트가 소셜 미디어 트렌드를 조사했다면, 비즈니스 에이전트 현빈은 이를 기반으로 한 가격 할인 프로모션을 기획하고, 작가 에이전트는 곧바로 조회수를 모을 숏폼 대본을 써야 합니다. 그리고 개발자 에이전트 코다리는 이 모든 과정을 자동화할 코드를 짜야 하죠. 
이 4가지 단계가 한 세션 안에서 유기적으로 움직일 때 비로소 1인 AI 컴퍼니의 톱니바퀴가 굴러가기 시작합니다. 가만히 공부만 하는 것은 사업이 아닙니다. AI들이 뽑아낸 결과물 중에서 내가 당장 오늘 복사해서 게시할 대본이 있는지 확인하고, 고객의 댓글을 모아 반응을 체크하는 즉각적인 실행만이 매출 500만 원, 1000만 원을 달성하게 만듭니다. 여러분도 공부를 멈추고 에이전트들의 성과를 기반으로 한 사업 아이템 실행에 당장 집중하세요.`);
  };

  const formatViewCount = (views) => {
    if (!views) return '조회수 없음';
    if (views >= 100000000) {
      return `${(views / 100000000).toFixed(1)}억회`;
    }
    if (views >= 10000) {
      return `${(views / 10000).toFixed(0)}만회`;
    }
    return `${views.toLocaleString()}회`;
  };

  return (
    <div className="container" style={{ padding: '2rem', maxWidth: '1200px' }}>
      
      {/* Header */}
      <header className="header" style={{ marginBottom: '2rem', borderBottom: 'none', paddingBottom: 0 }}>
        <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
          <Link href="/" style={{ display: 'inline-flex', alignItems: 'center', gap: '0.5rem', color: 'var(--text-primary)', width: 'fit-content' }} className="btn-secondary btn">
            <ArrowLeft size={16} /> 대시보드로 돌아가기
          </Link>
          <h1 className="title gradient-text" style={{ fontSize: '2.2rem', margin: 0, display: 'flex', alignItems: 'center', gap: '0.6rem' }}>
            <Scissors size={28} color="#00d2ff" style={{ filter: 'drop-shadow(0 0 8px rgba(0,210,255,0.4))' }} />
            <span>🔥 실시간 인기 숏폼 트렌드 분석 & 기획기</span>
          </h1>
          <p style={{ color: 'var(--text-secondary)', margin: 0, fontSize: '0.95rem' }}>
            유튜브에서 가장 핫한 최신 인기 숏폼들을 실시간으로 모니터링하고, 원클릭으로 자막을 추출해 나만의 숏폼 대본으로 재창작(모델링)할 수 있습니다.
          </p>
        </div>
      </header>

      {/* Mode Tabs */}
      <div className="mode-tabs">
        <button 
          className={`mode-tab ${mode === 'video' ? 'active' : ''}`}
          onClick={() => { setMode('video'); setErrorMsg(''); }}
        >
          <Video size={18} />
          <span>🔥 실시간 인기 숏폼 분석 & 모델링</span>
        </button>
        <button 
          className={`mode-tab ${mode === 'text' ? 'active' : ''}`}
          onClick={() => { setMode('text'); setErrorMsg(''); }}
        >
          <FileText size={18} />
          <span>✍️ 대본/텍스트 기반 숏폼 기획</span>
        </button>
      </div>

      {/* Dynamic View rendering based on mode */}
      {mode === 'video' ? (
        // Trending Shorts Feed Dashboard (Full-width grid)
        <div className="trending-shorts-dashboard glass-panel" style={{ padding: '2rem' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.5rem', flexWrap: 'wrap', gap: '1rem' }}>
            <div>
              <h2 style={{ fontSize: '1.3rem', margin: 0, display: 'flex', alignItems: 'center', gap: '0.5rem', color: '#ffffff' }}>
                <Sparkles size={20} color="#fbbf24" style={{ filter: 'drop-shadow(0 0 6px rgba(251,191,36,0.3))' }} />
                <span>유튜브 실시간 급상승 인기 숏폼</span>
              </h2>
              <p style={{ color: 'var(--text-secondary)', margin: '0.25rem 0 0 0', fontSize: '0.82rem' }}>
                현재 조회수가 잘나오는 쇼츠를 재생해보고, 마음에 드는 쇼츠의 [⚡ 대본 추출] 버튼을 눌러보세요.
              </p>
            </div>
            <button 
              onClick={fetchViralShorts} 
              disabled={viralLoading}
              className="btn btn-secondary"
              style={{ display: 'flex', alignItems: 'center', gap: '0.4rem', fontSize: '0.8rem', padding: '0.5rem 1rem' }}
            >
              <RefreshCw size={14} className={viralLoading ? 'animate-spin' : ''} />
              <span>실시간 새로고침</span>
            </button>
          </div>

          {errorMsg && <div className="error-message-box" style={{ marginBottom: '1.5rem' }}><AlertCircle size={14} />{errorMsg}</div>}

          {viralLoading ? (
            <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', padding: '5rem 0', gap: '1rem' }}>
              <Loader2 className="animate-spin" size={40} color="#00d2ff" />
              <p style={{ color: 'var(--text-secondary)', fontSize: '0.9rem' }}>실시간 조회수 높은 숏폼을 검색하고 캐싱하는 중...</p>
            </div>
          ) : viralShorts.length === 0 ? (
            <div className="empty-state">
              <Video size={48} color="rgba(255,255,255,0.05)" />
              <p style={{ color: 'var(--text-secondary)', fontSize: '0.9rem', marginTop: '1rem' }}>불러온 인기 숏폼이 없습니다. 새로고침을 눌러보세요.</p>
            </div>
          ) : (
            <div className="shorts-trending-grid">
              {viralShorts.map((short) => (
                <div key={short.id} className="viral-short-card">
                  
                  {/* Video Thumbnail or Embed Player */}
                  <div className="video-thumbnail-container">
                    {playingId === short.id ? (
                      <iframe 
                        src={`https://www.youtube.com/embed/${short.id}?autoplay=1`} 
                        title={short.title}
                        className="shorts-iframe" 
                        allow="autoplay; encrypted-media; picture-in-picture"
                        allowFullScreen 
                      />
                    ) : (
                      <div className="thumbnail-wrapper" onClick={() => setPlayingId(short.id)}>
                        <img src={short.thumbnail} alt={short.title} className="thumbnail-img" />
                        <div className="play-btn-overlay">
                          <div className="play-icon-circle">
                            <Play size={22} fill="white" style={{ marginLeft: '4px' }} />
                          </div>
                        </div>
                        <span className="duration-tag">{short.duration}s</span>
                      </div>
                    )}
                  </div>

                  {/* Short Details */}
                  <div className="card-info-section">
                    <h3 className="short-title-text" title={short.title}>{short.title}</h3>
                    <div className="short-meta-row">
                      <span className="channel-name">{short.channel}</span>
                      <span className="dot">•</span>
                      <span className="views-count">{formatViewCount(short.viewCount)}</span>
                    </div>
                  </div>

                  {/* Actions */}
                  <div className="card-action-row">
                    <button
                      onClick={() => handleExtractTranscript(short)}
                      disabled={extractingId === short.id}
                      className="btn extract-btn"
                      style={{
                        background: extractingId === short.id ? 'var(--border-color)' : 'var(--accent-gradient)',
                        border: 'none',
                        color: 'white',
                        fontWeight: 650,
                        fontSize: '0.8rem',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        gap: '0.4rem',
                        padding: '0.6rem',
                        borderRadius: '8px',
                        flex: 1.5,
                        cursor: 'pointer'
                      }}
                    >
                      {extractingId === short.id ? <Loader2 className="animate-spin" size={14} /> : <Sparkles size={14} />}
                      <span>{extractingId === short.id ? '대본 추출 중...' : '⚡ 대본 추출하여 기획'}</span>
                    </button>
                    
                    <a 
                      href={short.url || `https://www.youtube.com/shorts/${short.id}`}
                      target="_blank" 
                      rel="noopener noreferrer"
                      className="btn btn-secondary link-btn"
                      style={{
                        padding: '0.6rem',
                        borderRadius: '8px',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        color: 'var(--text-secondary)',
                        border: '1px solid var(--border-color)',
                        flex: 0.5
                      }}
                      title="유튜브에서 직접 보기"
                    >
                      <ExternalLink size={14} />
                    </a>
                  </div>

                </div>
              ))}
            </div>
          )}
        </div>
      ) : (
        // 2-Column Script Generator Workspace
        <div className="long-to-short-grid">
          
          {/* Left Column: Input Text Area */}
          <div className="glass-panel input-panel" style={{ padding: '2rem' }}>
            <form onSubmit={handleTextGenerate} style={{ display: 'flex', flexDirection: 'column', gap: '1.25rem' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <label style={{ fontWeight: 650, fontSize: '1rem', color: 'var(--text-primary)', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                  <FileText size={18} color="#00d2ff" />
                  <span>원고/자막 텍스트 직접 입력</span>
                </label>
                <button 
                  type="button" 
                  onClick={loadExampleText}
                  className="btn-secondary btn"
                  style={{ padding: '0.3rem 0.6rem', fontSize: '0.75rem', borderRadius: '6px' }}
                >
                  예시 원고 로드
                </button>
              </div>

              <textarea
                value={longText}
                onChange={(e) => setLongText(e.target.value)}
                placeholder="여기에 동영상의 전체 자막 텍스트나 긴 원고 글을 붙여넣으세요. 실시간 급상승 숏폼 탭에서 추출된 자막도 여기에 자동으로 들어옵니다..."
                style={{
                  width: '100%',
                  height: '280px',
                  padding: '1rem',
                  background: 'rgba(0, 0, 0, 0.3)',
                  border: '1px solid var(--border-color)',
                  borderRadius: '12px',
                  color: 'var(--text-primary)',
                  fontSize: '0.85rem',
                  lineHeight: '1.6',
                  resize: 'none',
                  outline: 'none',
                }}
              />
              
              {/* Count selector */}
              <div className="options-row">
                <span style={{ fontSize: '0.8rem', color: 'var(--text-secondary)', fontWeight: 600 }}>생성할 숏폼 개수</span>
                <div style={{ display: 'flex', alignItems: 'center', gap: '1rem', flex: 1 }}>
                  <input 
                    type="range" min="2" max="5" value={shortsCount}
                    onChange={(e) => setShortsCount(parseInt(e.target.value))}
                    style={{ flex: 1, accentColor: '#00d2ff' }}
                  />
                  <span style={{ fontWeight: 700, color: '#00d2ff' }}>{shortsCount}개</span>
                </div>
              </div>

              {errorMsg && <div className="error-message-box"><AlertCircle size={14} />{errorMsg}</div>}

              <button 
                type="submit" 
                disabled={loading || !longText.trim()} 
                className="btn generate-submit-btn"
              >
                {loading ? <Loader2 className="animate-spin" size={16} /> : <Sparkles size={16} />}
                <span>{loading ? '기획서 구성 중...' : '⚡ 숏폼 분할 및 대본 생성'}</span>
              </button>
            </form>
          </div>

          {/* Right Column: Previews and drafts */}
          <div className="glass-panel output-panel" style={{ padding: '2rem', display: 'flex', flexDirection: 'column' }}>
            <h2 style={{ fontSize: '1.2rem', marginBottom: '1.25rem', display: 'flex', alignItems: 'center', gap: '0.5rem', borderBottom: '1px solid rgba(255,255,255,0.05)', paddingBottom: '0.75rem', margin: 0 }}>
              <Video size={20} color="var(--accent-secondary)" />
              <span>📱 숏폼 모바일 편집 기획서 ({shortsList.length}개)</span>
            </h2>

            <div className="shorts-scroll-area">
              {shortsList.length === 0 ? (
                <div className="empty-state">
                  <Video size={48} color="rgba(255,255,255,0.05)" />
                  <p style={{ color: 'var(--text-secondary)', fontSize: '0.9rem', marginTop: '1rem', textAlign: 'center' }}>
                    {loading ? 'AI 에이전트가 롱폼 대본을 분석하고 기획하고 있습니다. 잠시만 기다려주세요...' : '왼쪽 입력창에 대본을 입력하고 변환을 클릭해 주세요.'}
                  </p>
                </div>
              ) : (
                <div className="shorts-cards-list">
                  {shortsList.map((shorts) => (
                    <div key={shorts.id} className="shorts-preview-card">
                      <div className="card-top-row">
                        <span className="shorts-badge">SHORTS #{shorts.id}</span>
                        <span className="duration-badge">{shorts.estimatedDuration || '45s'}</span>
                      </div>

                      <h3 className="shorts-card-title">{shorts.title}</h3>

                      <div className="shorts-hook-box">
                        <span className="hook-label">3초 오프닝 훅 (Opening Hook)</span>
                        <p className="hook-text">"{shorts.hook}"</p>
                      </div>

                      <div className="shorts-script-box">
                        <span className="script-label">대본 (Script)</span>
                        <div className="script-content">{shorts.script}</div>
                      </div>

                      <div className="shorts-cues-box">
                        <span className="cues-label">비주얼 연출 지시</span>
                        <p className="cues-text">{shorts.visualCues}</p>
                      </div>

                      {/* Action buttons */}
                      <div style={{ display: 'flex', gap: '0.75rem', marginTop: '0.5rem' }}>
                        <button
                          onClick={() => handleCopyScript(shorts.id, `제목: ${shorts.title}\n훅: ${shorts.hook}\n\n[대본]\n${shorts.script}`)}
                          className={`btn ${copiedId === shorts.id ? 'copied' : ''}`}
                          style={{
                            flex: 1,
                            padding: '0.65rem',
                            fontSize: '0.85rem',
                            fontWeight: 600,
                            borderRadius: '8px',
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'center',
                            gap: '0.4rem',
                            background: copiedId === shorts.id ? 'linear-gradient(135deg, #10b981, #059669)' : 'rgba(255,255,255,0.03)',
                            border: copiedId === shorts.id ? 'none' : '1px solid var(--border-color)',
                            color: 'white',
                            transition: 'all 0.3s ease'
                          }}
                        >
                          {copiedId === shorts.id ? <Check size={14} /> : <Copy size={14} />}
                          <span>{copiedId === shorts.id ? '복사 완료!' : '대본 복사'}</span>
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>

        </div>
      )}

      <style jsx>{`
        .mode-tabs {
          display: flex;
          gap: 1rem;
          margin-bottom: 1.5rem;
        }

        .mode-tab {
          display: flex;
          align-items: center;
          gap: 0.5rem;
          background: rgba(255, 255, 255, 0.02);
          border: 1px solid var(--border-color);
          padding: 0.65rem 1.25rem;
          border-radius: 10px;
          color: var(--text-secondary);
          font-weight: 600;
          font-size: 0.9rem;
          cursor: pointer;
          transition: all 0.3s ease;
        }

        .mode-tab:hover {
          background: rgba(255, 255, 255, 0.05);
          color: var(--text-primary);
        }

        .mode-tab.active {
          background: rgba(0, 210, 255, 0.08);
          border-color: rgba(0, 210, 255, 0.3);
          color: #00d2ff;
        }

        .long-to-short-grid {
          display: grid;
          grid-template-columns: 1fr 1.2fr;
          gap: 2rem;
          height: calc(100vh - 270px);
          min-height: 580px;
        }

        @media (max-width: 900px) {
          .long-to-short-grid {
            grid-template-columns: 1fr;
            height: auto;
          }
          .input-panel, .output-panel {
            height: auto !important;
          }
        }

        .input-panel {
          height: 100%;
        }

        .output-panel {
          height: 100%;
        }

        .options-row {
          background: rgba(255, 255, 255, 0.01);
          border: 1px solid var(--border-color);
          border-radius: 10px;
          padding: 0.75rem 1rem;
          display: flex;
          align-items: center;
          gap: 1rem;
        }

        .generate-submit-btn {
          width: 100%; 
          padding: 1rem; 
          font-weight: 700; 
          border-radius: 10px;
          background: var(--accent-gradient);
          border: none;
          display: flex;
          align-items: center;
          justify-content: center;
          gap: 0.6rem;
          box-shadow: 0 0 15px rgba(0, 210, 255, 0.15);
          color: white;
          cursor: pointer;
        }

        .error-message-box {
          display: flex;
          align-items: center;
          gap: 0.5rem;
          padding: 0.75rem 1rem;
          background: rgba(239, 68, 68, 0.08);
          border: 1px solid rgba(239, 68, 68, 0.15);
          border-radius: 8px;
          color: #ef4444;
          font-size: 0.82rem;
        }

        /* Trending grid and cards */
        .shorts-trending-grid {
          display: grid;
          grid-template-columns: repeat(auto-fill, minmax(250px, 1fr));
          gap: 1.5rem;
          margin-top: 1rem;
        }

        .viral-short-card {
          background: rgba(255, 255, 255, 0.01);
          border: 1px solid var(--border-color);
          border-radius: 12px;
          overflow: hidden;
          display: flex;
          flex-direction: column;
          transition: all 0.3s cubic-bezier(0.16, 1, 0.3, 1);
        }

        .viral-short-card:hover {
          transform: translateY(-4px);
          border-color: rgba(0, 210, 255, 0.25);
          box-shadow: 0 10px 25px rgba(0,0,0,0.4);
          background: rgba(255, 255, 255, 0.02);
        }

        .video-thumbnail-container {
          width: 100%;
          aspect-ratio: 9/16;
          background: #000;
          position: relative;
        }

        .thumbnail-wrapper {
          width: 100%;
          height: 100%;
          position: relative;
          cursor: pointer;
        }

        .thumbnail-img {
          width: 100%;
          height: 100%;
          object-fit: cover;
          transition: transform 0.5s ease;
        }

        .thumbnail-wrapper:hover .thumbnail-img {
          transform: scale(1.05);
        }

        .play-btn-overlay {
          position: absolute;
          top: 0;
          left: 0;
          right: 0;
          bottom: 0;
          background: rgba(0, 0, 0, 0.3);
          display: flex;
          align-items: center;
          justify-content: center;
          transition: background 0.3s ease;
        }

        .thumbnail-wrapper:hover .play-btn-overlay {
          background: rgba(0, 0, 0, 0.15);
        }

        .play-icon-circle {
          width: 50px;
          height: 50px;
          border-radius: 50%;
          background: rgba(0, 210, 255, 0.85);
          display: flex;
          align-items: center;
          justify-content: center;
          box-shadow: 0 0 15px rgba(0, 210, 255, 0.5);
          transition: all 0.3s ease;
        }

        .thumbnail-wrapper:hover .play-icon-circle {
          transform: scale(1.1);
          background: #00d2ff;
        }

        .duration-tag {
          position: absolute;
          bottom: 10px;
          right: 10px;
          background: rgba(0, 0, 0, 0.7);
          color: white;
          font-size: 0.65rem;
          font-weight: 700;
          padding: 0.25rem 0.4rem;
          border-radius: 4px;
        }

        .shorts-iframe {
          width: 100%;
          height: 100%;
          border: none;
        }

        .card-info-section {
          padding: 1rem;
          display: flex;
          flex-direction: column;
          gap: 0.3rem;
          flex-grow: 1;
        }

        .short-title-text {
          font-size: 0.85rem;
          font-weight: 700;
          color: white;
          margin: 0;
          line-height: 1.4;
          display: -webkit-box;
          -webkit-line-clamp: 2;
          -webkit-box-orient: vertical;
          overflow: hidden;
          text-overflow: ellipsis;
          height: 2.4rem;
        }

        .short-meta-row {
          display: flex;
          align-items: center;
          gap: 0.4rem;
          font-size: 0.72rem;
          color: var(--text-secondary);
        }

        .channel-name {
          font-weight: 600;
          overflow: hidden;
          text-overflow: ellipsis;
          white-space: nowrap;
          max-width: 110px;
        }

        .views-count {
          font-weight: 500;
        }

        .card-action-row {
          padding: 0.8rem 1rem 1rem 1rem;
          display: flex;
          gap: 0.5rem;
          border-top: 1px solid rgba(255,255,255,0.03);
        }

        .extract-btn:hover {
          box-shadow: 0 0 10px rgba(0,210,255,0.3);
        }

        .link-btn:hover {
          color: white !important;
          border-color: var(--text-secondary) !important;
        }

        /* Output Shorts list */
        .shorts-scroll-area {
          flex: 1;
          overflow-y: auto;
          margin-top: 1rem;
          padding-right: 0.5rem;
        }

        .empty-state {
          height: 100%;
          display: flex;
          flex-direction: column;
          align-items: center;
          justify-content: center;
          padding: 3rem 1.5rem;
          background: rgba(0, 0, 0, 0.15);
          border-radius: 12px;
          border: 1px dashed var(--border-color);
        }

        .shorts-cards-list {
          display: flex;
          flex-direction: column;
          gap: 1.5rem;
        }

        .shorts-preview-card {
          background: rgba(255, 255, 255, 0.02);
          border: 1px solid var(--border-color);
          border-radius: 14px;
          padding: 1.5rem;
          display: flex;
          flex-direction: column;
          gap: 0.9rem;
          transition: all 0.3s cubic-bezier(0.16, 1, 0.3, 1);
        }

        .shorts-preview-card:hover {
          border-color: rgba(0, 210, 255, 0.2);
          background: rgba(255, 255, 255, 0.03);
          transform: translateY(-2px);
        }

        .card-top-row {
          display: flex;
          align-items: center;
          gap: 0.6rem;
          flex-wrap: wrap;
        }

        .shorts-badge {
          font-size: 0.65rem;
          font-weight: 800;
          color: #00d2ff;
          background: rgba(0, 210, 255, 0.1);
          padding: 0.2rem 0.5rem;
          border-radius: 4px;
          letter-spacing: 0.05em;
        }

        .duration-badge {
          font-size: 0.65rem;
          font-weight: 700;
          color: var(--text-secondary);
          background: rgba(255, 255, 255, 0.04);
          padding: 0.2rem 0.5rem;
          border-radius: 4px;
        }

        .shorts-card-title {
          font-size: 1.1rem;
          font-weight: 700;
          color: #ffffff;
          margin: 0;
        }

        .shorts-hook-box {
          background: rgba(251, 191, 36, 0.04);
          border-left: 3px solid #fbbf24;
          padding: 0.65rem 0.85rem;
          border-radius: 0 6px 6px 0;
        }

        .hook-label {
          font-size: 0.65rem;
          font-weight: 750;
          color: #fbbf24;
          display: block;
          margin-bottom: 0.15rem;
          text-transform: uppercase;
        }

        .hook-text {
          font-size: 0.82rem;
          font-weight: 600;
          color: var(--text-primary);
          margin: 0;
          font-style: italic;
        }

        .shorts-script-box {
          background: rgba(0, 0, 0, 0.2);
          border: 1px solid rgba(255, 255, 255, 0.02);
          border-radius: 8px;
          padding: 0.85rem;
        }

        .script-label {
          font-size: 0.65rem;
          font-weight: 700;
          color: var(--text-secondary);
          display: block;
          margin-bottom: 0.35rem;
          text-transform: uppercase;
        }

        .script-content {
          font-size: 0.8rem;
          color: #cbd5e1;
          line-height: 1.5;
          white-space: pre-wrap;
          max-height: 120px;
          overflow-y: auto;
        }

        .shorts-cues-box {
          background: rgba(255, 255, 255, 0.01);
          border: 1px solid rgba(255, 255, 255, 0.03);
          border-radius: 6px;
          padding: 0.65rem 0.85rem;
        }

        .cues-label {
          font-size: 0.65rem;
          font-weight: 700;
          color: var(--text-secondary);
          display: block;
          margin-bottom: 0.15rem;
        }

        .cues-text {
          font-size: 0.78rem;
          color: var(--text-secondary);
          margin: 0;
          line-height: 1.4;
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
