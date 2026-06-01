'use client';

import { useState, useEffect, useRef } from 'react';
import { 
  Scissors, Video, FileText, Play, Copy, Check, 
  Sparkles, Loader2, RefreshCw, AlertCircle, ArrowLeft, Download, Terminal
} from 'lucide-react';
import Link from 'next/link';

export default function LongToShortPage() {
  const [mode, setMode] = useState('video'); // Default to video to showcase the new feature!
  const [longText, setLongText] = useState('');
  const [videoUrl, setVideoUrl] = useState('');
  const [shortsCount, setShortsCount] = useState(3);
  const [loading, setLoading] = useState(false);
  const [shortsList, setShortsList] = useState([]);
  const [copiedId, setCopiedId] = useState(null);
  const [errorMsg, setErrorMsg] = useState('');
  
  // Real-time video cutting logs states
  const [jobId, setJobId] = useState('');
  const [progressLogs, setProgressLogs] = useState('');
  const [pollingActive, setPollingActive] = useState(false);
  const consoleEndRef = useRef(null);

  // Auto scroll console logs to the bottom
  useEffect(() => {
    if (consoleEndRef.current) {
      consoleEndRef.current.scrollIntoView({ behavior: 'smooth' });
    }
  }, [progressLogs]);

  // Polling for video cutting logs and status
  useEffect(() => {
    if (!pollingActive || !jobId) return;

    let active = true;
    const interval = setInterval(async () => {
      try {
        const response = await fetch(`/api/video-shorts?jobId=${jobId}`);
        const data = await response.json();

        if (active && data.success) {
          setProgressLogs(data.progress || '작업 대기 중...');
          
          if (data.completed) {
            clearInterval(interval);
            setPollingActive(false);
            setLoading(false);
            
            if (data.isSuccess && data.shorts && data.shorts.length > 0) {
              setShortsList(data.shorts);
            } else {
              setErrorMsg('영상 숏폼 분할 및 편집 과정 중 실패했습니다. 콘솔 로그를 확인하세요.');
            }
          }
        }
      } catch (err) {
        console.error('Polling error:', err);
      }
    }, 1500);

    return () => {
      active = false;
      clearInterval(interval);
    };
  }, [pollingActive, jobId]);

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

  const handleVideoGenerate = async (e) => {
    e.preventDefault();
    if (!videoUrl.trim()) return;

    setLoading(true);
    setErrorMsg('');
    setShortsList([]);
    setJobId('');
    setProgressLogs('[INIT] 동영상 변환 대기열에 진입 중...\n');
    setPollingActive(false);

    try {
      const response = await fetch('/api/video-shorts', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ url: videoUrl, count: shortsCount })
      });

      const data = await response.json();

      if (response.ok && data.success) {
        setJobId(data.jobId);
        if (data.cached) {
          // Cached results load immediately without polling
          setProgressLogs('[SUCCESS] 기존 분석 완료 데이터 캐시를 성공적으로 로드했습니다.\n');
          setShortsList(data.shorts);
          setLoading(false);
        } else {
          // Start polling dynamic logs
          setPollingActive(true);
        }
      } else {
        setErrorMsg(data.error || '작업 시작 도중 오류가 발생했습니다.');
        setLoading(false);
      }
    } catch (err) {
      console.error(err);
      setErrorMsg('비디오 분석 요청에 실패했습니다.');
      setLoading(false);
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
            <span>롱폼 ➔ 숏폼 비디오 크리에이터 (Long to Shorts)</span>
          </h1>
          <p style={{ color: 'var(--text-secondary)', margin: 0, fontSize: '0.95rem' }}>
            롱폼 영상 링크를 넣거나 글을 입력하면, AI가 재미있는 구간을 선별하여 모바일 세로형 9:16 비디오로 자동 크롭 편집 및 자막 스크립트를 즉시 생성합니다.
          </p>
        </div>
      </header>

      {/* Mode Tabs */}
      <div className="mode-tabs">
        <button 
          className={`mode-tab ${mode === 'video' ? 'active' : ''}`}
          onClick={() => { setMode('video'); setShortsList([]); setErrorMsg(''); }}
        >
          <Video size={18} />
          <span>🎥 유튜브 영상 자동 자르기 & 편집</span>
        </button>
        <button 
          className={`mode-tab ${mode === 'text' ? 'active' : ''}`}
          onClick={() => { setMode('text'); setShortsList([]); setErrorMsg(''); }}
        >
          <FileText size={18} />
          <span>✍️ 대본/텍스트 기반 숏폼 기획</span>
        </button>
      </div>

      {/* Main Workspace Grid */}
      <div className="long-to-short-grid">
        
        {/* Left Column: Inputs */}
        <div className="glass-panel input-panel" style={{ padding: '2rem' }}>
          {mode === 'text' ? (
            // Text Input Form
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
                placeholder="여기에 동영상의 전체 자막 텍스트나 긴 원고 글을 붙여넣으세요..."
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
                <span>{loading ? '분석 중...' : '⚡ 숏폼 분할 및 대본 생성'}</span>
              </button>
            </form>
          ) : (
            // YouTube Link Input Form
            <form onSubmit={handleVideoGenerate} style={{ display: 'flex', flexDirection: 'column', gap: '1.25rem' }}>
              <label style={{ fontWeight: 650, fontSize: '1rem', color: 'var(--text-primary)', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                <Video size={18} color="#00d2ff" />
                <span>유튜브 동영상 링크 (URL) 입력</span>
              </label>

              <input 
                type="url"
                value={videoUrl}
                onChange={(e) => setVideoUrl(e.target.value)}
                placeholder="예: https://www.youtube.com/watch?v=XXXXXX"
                style={{
                  width: '100%',
                  padding: '1rem',
                  background: 'rgba(0, 0, 0, 0.3)',
                  border: '1px solid var(--border-color)',
                  borderRadius: '10px',
                  color: 'white',
                  fontSize: '0.9rem'
                }}
              />

              <div className="options-row">
                <span style={{ fontSize: '0.8rem', color: 'var(--text-secondary)', fontWeight: 600 }}>선출할 숏폼 영상 개수</span>
                <div style={{ display: 'flex', alignItems: 'center', gap: '1rem', flex: 1 }}>
                  <input 
                    type="range" min="1" max="4" value={shortsCount}
                    onChange={(e) => setShortsCount(parseInt(e.target.value))}
                    style={{ flex: 1, accentColor: '#00d2ff' }}
                  />
                  <span style={{ fontWeight: 700, color: '#00d2ff' }}>{shortsCount}개</span>
                </div>
              </div>

              {errorMsg && <div className="error-message-box"><AlertCircle size={14} />{errorMsg}</div>}

              <button 
                type="submit" 
                disabled={loading || !videoUrl.trim()} 
                className="btn generate-submit-btn"
              >
                {loading ? <Loader2 className="animate-spin" size={16} /> : <Play size={16} />}
                <span>{loading ? '비디오 다운로드 및 렌더링 중...' : '⚡ 비디오 분석 및 자동 컷팅 편집 시작'}</span>
              </button>

              {/* Progress Console Logs */}
              {loading && (
                <div className="terminal-box">
                  <div className="terminal-header">
                    <Terminal size={14} color="#34d399" />
                    <span>실시간 숏폼 편집기 콘솔 로그 (Live Logs)</span>
                  </div>
                  <div className="terminal-logs">
                    {progressLogs}
                    <div ref={consoleEndRef} />
                  </div>
                </div>
              )}
            </form>
          )}
        </div>

        {/* Right Column: Previews and Video player */}
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
                  {loading ? 'AI 에이전트가 롱폼 비디오를 변환하고 있습니다. 좌측 콘솔창에서 실시간 작업 진행 과정을 확인하세요.' : '왼쪽 입력창에서 작업을 시작해 주세요.'}
                </p>
              </div>
            ) : (
              <div className="shorts-cards-list">
                {shortsList.map((shorts) => (
                  <div key={shorts.id} className="shorts-preview-card">
                    <div className="card-top-row">
                      <span className="shorts-badge">SHORTS #{shorts.id}</span>
                      <span className="duration-badge">{shorts.estimatedDuration || '45s'}</span>
                      {shorts.start && <span className="time-badge">{shorts.start} ➔ {shorts.end}</span>}
                    </div>

                    <h3 className="shorts-card-title">{shorts.title}</h3>

                    {/* Dynamic Video Player rendering if videoUrl exists */}
                    {shorts.videoUrl && (
                      <div className="shorts-video-wrapper">
                        <video 
                          src={shorts.videoUrl} 
                          controls 
                          playsInline
                          className="shorts-video-player"
                        />
                      </div>
                    )}

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
                        onClick={() => handleCopyFeedback(shorts.id, `제목: ${shorts.title}\n훅: ${shorts.hook}\n\n[대본]\n${shorts.script}`)}
                        className={`btn ${copiedId === shorts.id ? 'copied' : ''}`}
                        style={{
                          flex: 1.2,
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

                      {shorts.videoUrl && (
                        <a 
                          href={shorts.videoUrl} 
                          download={`shorts_${shorts.id}.mp4`}
                          className="btn btn-secondary"
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
                            background: 'rgba(0, 210, 255, 0.08)',
                            border: '1px solid rgba(0, 210, 255, 0.2)',
                            color: '#00d2ff'
                          }}
                        >
                          <Download size={14} />
                          <span>다운로드</span>
                        </a>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>

      </div>

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
          fontWeight: 700; 
          borderRadius: 10px;
          background: var(--accent-gradient);
          border: none;
          display: flex;
          align-items: center;
          justify-content: center;
          gap: 0.6rem;
          box-shadow: 0 0 15px rgba(0, 210, 255, 0.15);
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

        /* Terminal Console Logs */
        .terminal-box {
          background: #06080c;
          border: 1px solid rgba(52, 211, 153, 0.2);
          border-radius: 10px;
          overflow: hidden;
          margin-top: 1rem;
          box-shadow: 0 8px 24px rgba(0,0,0,0.5);
        }

        .terminal-header {
          background: #0f131a;
          padding: 0.5rem 1rem;
          display: flex;
          align-items: center;
          gap: 0.5rem;
          border-bottom: 1px solid rgba(255,255,255,0.03);
          font-size: 0.75rem;
          color: #34d399;
          font-family: monospace;
        }

        .terminal-logs {
          padding: 1rem;
          font-family: 'Fira Code', 'Courier New', Courier, monospace;
          font-size: 0.78rem;
          color: #34d399;
          line-height: 1.5;
          margin: 0;
          height: 180px;
          overflow-y: auto;
          white-space: pre-wrap;
          word-break: break-all;
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

        .time-badge {
          font-size: 0.65rem;
          font-weight: 700;
          color: #fb923c;
          background: rgba(251, 146, 60, 0.08);
          padding: 0.2rem 0.5rem;
          border-radius: 4px;
          font-family: monospace;
        }

        .shorts-card-title {
          font-size: 1.1rem;
          font-weight: 700;
          color: #ffffff;
          margin: 0;
        }

        /* Video Player Wrapper */
        .shorts-video-wrapper {
          width: 100%;
          max-width: 250px;
          aspect-ratio: 9/16;
          border-radius: 12px;
          overflow: hidden;
          align-self: center;
          border: 1px solid rgba(255,255,255,0.06);
          box-shadow: 0 10px 30px rgba(0,0,0,0.5);
          background: #000;
        }

        .shorts-video-player {
          width: 100%;
          height: 100%;
          object-fit: cover;
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
