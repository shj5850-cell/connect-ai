'use client';

import { useState, useEffect, useRef } from 'react';
import Link from 'next/link';
import { 
  ArrowLeft, Play, Loader2, CheckCircle2, AlertCircle, Copy, 
  ExternalLink, Video, ShoppingBag, Sparkles, RefreshCw
} from 'lucide-react';

export default function AutopilotPage() {
  const [statusData, setStatusData] = useState({ status: 'idle', message: '자동화 가동 대기 중', progress: 0 });
  const [loadingStatus, setLoadingStatus] = useState(true);
  const [triggering, setTriggering] = useState(false);
  const [copied, setCopied] = useState(false);
  const [showGuide, setShowGuide] = useState(false);
  const timerRef = useRef(null);

  // New states for Product-Driven Shorts Mode
  const [mode, setMode] = useState('archetype'); // 'archetype' or 'product-driven'
  const [productName, setProductName] = useState('');
  const [productUrl, setProductUrl] = useState('');
  const [coupangLink, setCoupangLink] = useState('');
  const [targetAudience, setTargetAudience] = useState('');
  const [videoStyle, setVideoStyle] = useState('Cinematic');
  const [uploading, setUploading] = useState(false);
  const [uploadResult, setUploadResult] = useState(null);

  const fetchStatus = async () => {
    try {
      const res = await fetch('/api/autopilot');
      if (res.ok) {
        const json = await res.json();
        setStatusData(json);
        
        // Stop polling if completed or error
        if (json.status !== 'running' && timerRef.current) {
          clearInterval(timerRef.current);
          timerRef.current = null;
        }
      }
    } catch (e) {
      console.error('Failed to fetch autopilot status:', e);
    } finally {
      setLoadingStatus(false);
    }
  };

  useEffect(() => {
    fetchStatus();
    
    // Auto-poll if running on load
    if (statusData.status === 'running' && !timerRef.current) {
      timerRef.current = setInterval(fetchStatus, 2000);
    }

    return () => {
      if (timerRef.current) clearInterval(timerRef.current);
    };
  }, [statusData.status]);

  const handleStartAutopilot = async () => {
    if (triggering || statusData.status === 'running') return;
    
    setTriggering(true);
    setUploadResult(null); // Clear previous upload results
    try {
      const body = {};
      if (mode === 'product-driven') {
        if (!productName.trim()) {
          throw new Error('상품명을 입력해 주세요.');
        }
        body.isProductDriven = true;
        body.productName = productName.trim();
        body.productUrl = productUrl.trim();
        body.coupangLink = coupangLink.trim();
        body.targetAudience = targetAudience.trim();
        body.videoStyle = videoStyle;
      }

      const res = await fetch('/api/autopilot', { 
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body)
      });
      
      if (res.ok) {
        // Start polling immediately
        setStatusData(prev => ({ ...prev, status: 'running', progress: 5, message: '자동 운전 시스템 시동 중...' }));
        if (timerRef.current) clearInterval(timerRef.current);
        timerRef.current = setInterval(fetchStatus, 2000);
      } else {
        throw new Error('자동 운전 명령을 전송하지 못했습니다.');
      }
    } catch (e) {
      alert(e.message);
    } finally {
      setTriggering(false);
    }
  };

  const handleApproveAndUpload = async (forceManual = false) => {
    if (uploading) return;

    // Warning popup if coupangLink is missing or has placeholder
    const linkToCheck = statusData.coupang_link || coupangLink;
    if (!linkToCheck || linkToCheck.includes('{COUPANG_LINK}')) {
      const confirmUpload = window.confirm(
        '⚠️ 경고: 쿠팡 파트너스 링크가 입력되지 않았습니다. {COUPANG_LINK} 플레이스홀더 그대로 업로드하시겠습니까?'
      );
      if (!confirmUpload) return;
    }

    setUploading(true);
    try {
      const res = await fetch('/api/autopilot/upload', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          videoPath: statusData.videoPath,
          title: statusData.scriptData?.title ? `${statusData.scriptData.title} #Shorts` : 'Shorts Video',
          description: statusData.scriptData?.youtube_description || statusData.commentText,
          coupangLink: linkToCheck,
          isProductDriven: statusData.upload_mode === 'product-driven'
        })
      });

      const data = await res.json();
      if (res.ok && data.success) {
        setUploadResult(data);
        setStatusData(prev => ({
          ...prev,
          youtubeVideoId: data.youtubeVideoId,
          isMockUpload: false,
          uploadMessage: data.message,
          pinned_comment_status: data.commentStatus
        }));
      } else {
        throw new Error(data.error || '유튜브 업로드에 실패했습니다.');
      }
    } catch (e) {
      alert(e.message);
    } finally {
      setUploading(false);
    }
  };

  const handleCopyLink = (text) => {
    if (!text) return;
    navigator.clipboard.writeText(text);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  // Helper to resolve steps icon/colors
  const getStepProgressColor = () => {
    if (statusData.status === 'completed') return '#10b981';
    if (statusData.status === 'error') return '#ef4444';
    return 'var(--accent-color)';
  };

  return (
    <div className="container" style={{ padding: '2rem', maxWidth: '1000px' }}>
      
      {/* Header */}
      <header style={{ marginBottom: '2.5rem', display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
        <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
          <Link href="/" style={{ display: 'inline-flex', alignItems: 'center', gap: '0.5rem', color: 'var(--text-primary)', width: 'fit-content' }} className="btn-secondary btn">
            <ArrowLeft size={16} /> 대시보드로 돌아가기
          </Link>
          <h1 className="title gradient-text" style={{ fontSize: '2.2rem', margin: 0, display: 'flex', alignItems: 'center', gap: '0.6rem' }}>
            <Sparkles size={30} color="#fb7185" style={{ filter: 'drop-shadow(0 0 8px rgba(251,113,133,0.4))' }} />
            <span>1클릭 비즈니스 완전 자동 운전 (Autopilot)</span>
          </h1>
          <p style={{ color: 'var(--text-secondary)', margin: 0, fontSize: '0.95rem' }}>
            수익화 상품 매칭부터 자막 대본 기획, 컷 이미지 드로잉, 숏폼 편집 인코딩, 유튜브 최종 전송까지 클릭 한 번으로 모든 루프를 자동 완성합니다.
          </p>
        </div>
      </header>

      {/* Autopilot Console Panel */}
      <div className="glass-panel" style={{ padding: '3rem 2rem', textAlign: 'center', display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '2rem', background: 'linear-gradient(145deg, rgba(255,255,255,0.01) 0%, rgba(251, 113, 133, 0.03) 100%)' }}>
        
        {/* Mode Selector Tabs */}
        {statusData.status !== 'running' && (
          <div style={{ display: 'flex', gap: '1rem', width: '100%', justifyContent: 'center', marginBottom: '0.5rem' }}>
            <button 
              onClick={() => setMode('archetype')}
              className={`btn ${mode === 'archetype' ? '' : 'btn-secondary'}`}
              style={{ padding: '0.6rem 1.5rem', fontSize: '0.9rem', borderRadius: '8px', cursor: 'pointer' }}
            >
              기존 자동 매칭 모드 (Content Archetype)
            </button>
            <button 
              onClick={() => setMode('product-driven')}
              className={`btn ${mode === 'product-driven' ? '' : 'btn-secondary'}`}
              style={{ padding: '0.6rem 1.5rem', fontSize: '0.9rem', borderRadius: '8px', cursor: 'pointer' }}
            >
              상품 주도형 쇼츠 모드 (Product-Driven)
            </button>
          </div>
        )}

        {/* Product-Driven mode fields form */}
        {statusData.status !== 'running' && mode === 'product-driven' && (
          <div style={{ width: '100%', maxWidth: '600px', textAlign: 'left', display: 'flex', flexDirection: 'column', gap: '1rem', background: 'rgba(0,0,0,0.2)', padding: '1.5rem', borderRadius: '12px', border: '1px solid var(--border-color)' }}>
            <h3 style={{ fontSize: '0.95rem', color: 'white', margin: 0, display: 'flex', alignItems: 'center', gap: '0.4rem', fontWeight: 'bold' }}>
              <Sparkles size={16} color="#fb7185" /> 상품 홍보 설정
            </h3>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '0.25rem' }}>
              <label style={{ fontSize: '0.75rem', color: 'var(--text-secondary)' }}>상품명 <span style={{ color: '#ef4444' }}>* 필수</span></label>
              <input 
                type="text"
                placeholder="예: 정관장 홍삼정 에브리타임"
                value={productName}
                onChange={(e) => setProductName(e.target.value)}
                style={{ padding: '0.6rem 0.8rem', background: 'rgba(0,0,0,0.4)', border: '1px solid var(--border-color)', borderRadius: '6px', color: '#fff', fontSize: '0.85rem', outline: 'none' }}
              />
            </div>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem' }}>
              <div style={{ display: 'flex', flexDirection: 'column', gap: '0.25rem' }}>
                <label style={{ fontSize: '0.75rem', color: 'var(--text-secondary)' }}>상품 URL (선택)</label>
                <input 
                  type="text"
                  placeholder="https://..."
                  value={productUrl}
                  onChange={(e) => setProductUrl(e.target.value)}
                  style={{ padding: '0.6rem 0.8rem', background: 'rgba(0,0,0,0.4)', border: '1px solid var(--border-color)', borderRadius: '6px', color: '#fff', fontSize: '0.85rem', outline: 'none' }}
                />
              </div>
              <div style={{ display: 'flex', flexDirection: 'column', gap: '0.25rem' }}>
                <label style={{ fontSize: '0.75rem', color: 'var(--text-secondary)' }}>쿠팡 파트너스 링크 (선택)</label>
                <input 
                  type="text"
                  placeholder="https://link.coupang.com/..."
                  value={coupangLink}
                  onChange={(e) => setCoupangLink(e.target.value)}
                  style={{ padding: '0.6rem 0.8rem', background: 'rgba(0,0,0,0.4)', border: '1px solid var(--border-color)', borderRadius: '6px', color: '#fff', fontSize: '0.85rem', outline: 'none' }}
                />
              </div>
            </div>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem' }}>
              <div style={{ display: 'flex', flexDirection: 'column', gap: '0.25rem' }}>
                <label style={{ fontSize: '0.75rem', color: 'var(--text-secondary)' }}>타겟 고객 (선택)</label>
                <input 
                  type="text"
                  placeholder="예: 30대 바쁜 직장인"
                  value={targetAudience}
                  onChange={(e) => setTargetAudience(e.target.value)}
                  style={{ padding: '0.6rem 0.8rem', background: 'rgba(0,0,0,0.4)', border: '1px solid var(--border-color)', borderRadius: '6px', color: '#fff', fontSize: '0.85rem', outline: 'none' }}
                />
              </div>
              <div style={{ display: 'flex', flexDirection: 'column', gap: '0.25rem' }}>
                <label style={{ fontSize: '0.75rem', color: 'var(--text-secondary)' }}>영상 스타일 (선택)</label>
                <select 
                  value={videoStyle}
                  onChange={(e) => setVideoStyle(e.target.value)}
                  style={{ padding: '0.6rem 0.8rem', background: 'rgba(0,0,0,0.4)', border: '1px solid var(--border-color)', borderRadius: '6px', color: '#fff', fontSize: '0.85rem', outline: 'none', cursor: 'pointer' }}
                >
                  <option value="Cinematic">Cinematic (시네마틱 영화풍)</option>
                  <option value="Photorealistic">Photorealistic (실제 광고 사진풍)</option>
                  <option value="Luxury Commercial">Luxury Commercial (고급 커머셜 광고풍)</option>
                  <option value="Anime">Anime (생생한 애니메이션풍)</option>
                  <option value="Retro">Retro (레트로 필름풍)</option>
                  <option value="Documentary">Documentary (다큐멘터리 서사풍)</option>
                </select>
              </div>
            </div>
          </div>
        )}

        {/* Status Graphic Visualizer */}
        <div style={{ position: 'relative', width: '120px', height: '120px', display: 'flex', alignItems: 'center', justifyItems: 'center', justifyContent: 'center' }}>
          {statusData.status === 'running' ? (
            <div style={{ position: 'absolute', width: '100%', height: '100%', borderRadius: '50%', border: '4px solid rgba(255,255,255,0.05)', borderTopColor: 'var(--accent-color)', animation: 'spin 1.5s linear infinite' }} />
          ) : statusData.status === 'completed' ? (
            <div style={{ width: '80px', height: '80px', borderRadius: '50%', background: 'rgba(16,185,129,0.12)', border: '2px solid #10b981', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#10b981' }}>
              <CheckCircle2 size={40} />
            </div>
          ) : statusData.status === 'error' ? (
            <div style={{ width: '80px', height: '80px', borderRadius: '50%', background: 'rgba(239,68,68,0.12)', border: '2px solid #ef4444', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#ef4444' }}>
              <AlertCircle size={40} />
            </div>
          ) : (
            <div style={{ width: '80px', height: '80px', borderRadius: '50%', background: 'rgba(255,255,255,0.03)', border: '2px solid rgba(255,255,255,0.1)', display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'var(--text-secondary)' }}>
              <Play size={30} style={{ marginLeft: '4px' }} />
            </div>
          )}
          
          {statusData.status === 'running' && (
            <span style={{ fontSize: '1.2rem', fontWeight: 'bold', color: 'white' }}>
              {statusData.progress}%
            </span>
          )}
        </div>

        {/* Progress Text Description */}
        <div style={{ maxWidth: '600px' }}>
          <h2 style={{ fontSize: '1.4rem', color: 'white', margin: '0 0 0.5rem 0' }}>
            {statusData.status === 'running' ? '완전 자동 조종 장치가 가동 중입니다' :
             statusData.status === 'completed' ? '🎉 쇼츠 비즈니스 자동화 완료!' :
             statusData.status === 'error' ? '❌ 자동 운전 중 오류가 발생했습니다' :
             '준비 완료: 1클릭 자동 파일럿'}
          </h2>
          <p style={{ color: 'var(--text-secondary)', fontSize: '0.95rem', lineHeight: '1.6', margin: 0 }}>
            {statusData.message}
          </p>
        </div>

        {/* Real Progress Bar */}
        {(statusData.status === 'running' || statusData.status === 'completed') && (
          <div style={{ width: '100%', maxWidth: '600px', height: '8px', background: 'rgba(255,255,255,0.05)', borderRadius: '4px', overflow: 'hidden' }}>
            <div style={{ 
              width: `${statusData.progress}%`, 
              height: '100%', 
              background: `linear-gradient(90deg, var(--accent-secondary) 0%, ${getStepProgressColor()} 100%)`, 
              transition: 'width 0.5s ease-out' 
            }} />
          </div>
        )}

        {/* Action Triggers */}
        {statusData.status !== 'running' && (
          <div style={{ display: 'flex', gap: '1rem' }}>
            <button 
              onClick={handleStartAutopilot}
              disabled={triggering}
              className="btn"
              style={{ padding: '0.8rem 2.5rem', fontWeight: 'bold', display: 'flex', alignItems: 'center', gap: '0.6rem', fontSize: '1rem', background: 'linear-gradient(135deg, #a78bfa 0%, #fb7185 100%)', boxShadow: '0 0 20px rgba(251,113,133,0.3)', cursor: 'pointer' }}
            >
              {triggering ? <Loader2 className="animate-spin" size={18} /> : <Play size={18} />}
              {mode === 'product-driven' ? '상품 홍보 쇼츠 생성' : '1클릭 자동 운전 개시'}
            </button>
            
            {statusData.status !== 'idle' && (
              <button 
                onClick={() => { setStatusData({ status: 'idle', message: '자동화 가동 대기 중', progress: 0 }); setUploadResult(null); }}
                className="btn-secondary btn"
                style={{ padding: '0.8rem 1.5rem', display: 'flex', alignItems: 'center', gap: '0.5rem', cursor: 'pointer' }}
              >
                <RefreshCw size={16} /> 콘솔 초기화
              </button>
            )}
          </div>
        )}

      </div>

      {/* Completed Autopilot Outputs Card */}
      {statusData.status === 'completed' && (
        <div style={{ display: 'grid', gridTemplateColumns: 'minmax(0, 1.2fr) 1fr', gap: '2rem', marginTop: '2.5rem' }}>
          
          {/* Video Player Column */}
          <div className="glass-panel" style={{ padding: '1.5rem', display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '1rem' }}>
            <h3 style={{ fontSize: '1rem', margin: 0, color: 'white', alignSelf: 'flex-start' }}>🎬 완성된 시네마틱 숏폼 영상</h3>
            {statusData.videoUrl ? (
              <video src={statusData.videoUrl} controls style={{ width: '100%', maxWidth: '300px', borderRadius: '16px', border: '6px solid #1c1917', background: '#000', boxShadow: '0 15px 30px rgba(0,0,0,0.5)' }} />
            ) : (
              <div style={{ height: '300px', display: 'flex', alignItems: 'center', color: 'var(--text-secondary)' }}>비디오 경로를 확인할 수 없습니다.</div>
            )}
          </div>

          {/* Marketing & YouTube Status Column */}
          <div style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>
            
            {/* If general Autopilot mode */}
            {statusData.upload_mode !== 'product-driven' && (
              <>
                {/* YouTube status */}
                <div className="glass-panel" style={{ padding: '1.5rem', display: 'flex', flexDirection: 'column', gap: '0.75rem', borderLeft: '4px solid #f87171' }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', color: '#f87171', fontWeight: 'bold', fontSize: '0.9rem' }}>
                    <Video size={18} /> 유튜브 쇼츠 배포 상태
                  </div>
                  <div style={{ fontSize: '0.9rem', color: 'white', fontWeight: 500 }}>
                    {statusData.uploadMessage}
                  </div>
                  {statusData.youtubeVideoId && statusData.youtubeVideoId !== 'MOCK_VIDEO_ID' && (
                    <a 
                      href={`https://studio.youtube.com/`} 
                      target="_blank" 
                      rel="noreferrer"
                      style={{ display: 'inline-flex', alignItems: 'center', gap: '0.25rem', fontSize: '0.75rem', color: '#38bdf8', textDecoration: 'none' }}
                    >
                      YouTube 스튜디오에서 비디오 확인하기 <ExternalLink size={12} />
                    </a>
                  )}
                </div>

                {/* Shopping link copy box */}
                <div className="glass-panel" style={{ padding: '1.5rem', display: 'flex', flexDirection: 'column', gap: '0.75rem', borderLeft: '4px solid #fbbf24' }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', color: '#fbbf24', fontWeight: 'bold', fontSize: '0.9rem' }}>
                    <ShoppingBag size={18} /> 고정 댓글 복사용 쇼핑 링크
                  </div>
                  <div style={{ color: 'var(--text-secondary)', fontSize: '0.75rem' }}>
                    아래 문구를 복사하여 생성된 유튜브 쇼츠 영상의 첫 번째 댓글로 등록하고 고정해 주세요.
                  </div>
                  
                  <div style={{ position: 'relative', display: 'flex', width: '100%', marginTop: '0.25rem' }}>
                    <textarea 
                      readOnly
                      rows={3}
                      value={statusData.commentText || ''}
                      style={{ width: '100%', padding: '0.75rem', paddingRight: '2.5rem', background: 'rgba(0,0,0,0.3)', border: '1px solid var(--border-color)', borderRadius: '6px', color: '#fff', fontSize: '0.8rem', resize: 'none', outline: 'none' }}
                    />
                    <button
                      onClick={() => handleCopyLink(statusData.commentText)}
                      style={{ position: 'absolute', right: '8px', top: '8px', background: 'rgba(255,255,255,0.05)', border: '1px solid var(--border-color)', borderRadius: '4px', padding: '0.3rem', color: 'white', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center' }}
                      title="클립보드 복사"
                    >
                      {copied ? <CheckCircle2 size={14} color="#10b981" /> : <Copy size={14} />}
                    </button>
                  </div>
                  {copied && <span style={{ fontSize: '0.7rem', color: '#10b981', alignSelf: 'flex-end' }}>클립보드에 복사 완료!</span>}
                </div>
              </>
            )}

            {/* If Product-Driven Mode */}
            {statusData.upload_mode === 'product-driven' && (
              <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem', textAlign: 'left' }}>
                
                {/* 1. Score and Compliance summary card */}
                <div className="glass-panel" style={{ padding: '1.5rem', display: 'flex', flexDirection: 'column', gap: '1rem', borderLeft: '4px solid #a78bfa' }}>
                  <h4 style={{ color: 'white', fontSize: '0.95rem', margin: 0, fontWeight: 'bold', display: 'flex', alignItems: 'center', gap: '0.4rem' }}>
                    <Sparkles size={16} color="#fb7185" /> 채널 보호 품질 평가판단 (Quality Board)
                  </h4>
                  
                  {/* Scores grid */}
                  <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem', marginTop: '0.25rem' }}>
                    <div style={{ background: 'rgba(0,0,0,0.2)', padding: '0.75rem', borderRadius: '6px', border: '1px solid var(--border-color)' }}>
                      <span style={{ fontSize: '0.75rem', color: 'var(--text-secondary)' }}>품질 점수 (Quality Score)</span>
                      <div style={{ fontSize: '1.4rem', fontWeight: 'bold', color: statusData.quality_score >= 75 ? '#10b981' : '#f87171', marginTop: '0.25rem' }}>
                        {statusData.quality_score}점 <span style={{ fontSize: '0.75rem', fontWeight: 'normal', color: 'var(--text-secondary)' }}>/ 최소 75점</span>
                      </div>
                    </div>

                    <div style={{ background: 'rgba(0,0,0,0.2)', padding: '0.75rem', borderRadius: '6px', border: '1px solid var(--border-color)' }}>
                      <span style={{ fontSize: '0.75rem', color: 'var(--text-secondary)' }}>광고 냄새 점수 (Ad Score)</span>
                      <div style={{ fontSize: '1.4rem', fontWeight: 'bold', color: statusData.ad_score <= 35 ? '#10b981' : statusData.ad_score <= 50 ? '#fbbf24' : '#f87171', marginTop: '0.25rem' }}>
                        {statusData.ad_score}점 
                        <span style={{ fontSize: '0.75rem', fontWeight: 'normal', display: 'block', color: 'var(--text-secondary)', marginTop: '0.1rem' }}>
                          {statusData.ad_score <= 35 ? '🟢 안전' : statusData.ad_score <= 50 ? '🟡 경고: 광고 느낌 있음' : '🔴 위험: 재발급 추천'}
                        </span>
                      </div>
                    </div>
                  </div>

                  {/* Similarity check */}
                  <div style={{ background: 'rgba(0,0,0,0.2)', padding: '0.75rem', borderRadius: '6px', border: '1px solid var(--border-color)', fontSize: '0.8rem' }}>
                    <span style={{ color: 'var(--text-secondary)' }}>도입부 유사도 (Similarity Score):</span>{' '}
                    <strong style={{ color: statusData.similarity_score <= 60 ? '#10b981' : '#f87171' }}>
                      {statusData.similarity_score || 0}% (허용 한계: 60% 이하)
                    </strong>
                  </div>

                  {/* Cut-by-cut compliance checklist */}
                  <div style={{ marginTop: '0.5rem' }}>
                    <span style={{ fontSize: '0.75rem', color: 'var(--text-secondary)', display: 'block', marginBottom: '0.5rem', fontWeight: 'bold' }}>
                      상품 노출 가이드라인 준수 여부 (Cut Check)
                    </span>
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '0.4rem', fontSize: '0.8rem' }}>
                      {statusData.compliance?.cutChecks?.map((chk, idx) => (
                        <div key={idx} style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', color: 'white' }}>
                          <span style={{ 
                            width: '18px', 
                            height: '18px', 
                            borderRadius: '50%', 
                            display: 'inline-flex', 
                            alignItems: 'center', 
                            justifyContent: 'center', 
                            fontSize: '0.65rem',
                            fontWeight: 'bold',
                            background: chk.passed ? 'rgba(16,185,129,0.12)' : 'rgba(239,68,68,0.12)', 
                            border: `1px solid ${chk.passed ? '#10b981' : '#ef4444'}`,
                            color: chk.passed ? '#10b981' : '#ef4444' 
                          }}>
                            {chk.passed ? '✓' : '✗'}
                          </span>
                          <span><strong>{idx+1}컷</strong> ({idx < 3 ? '스토리 빌드업' : '제품 공개'}): {chk.message}</span>
                        </div>
                      ))}
                    </div>
                  </div>
                </div>

                {/* 2. YouTube upload preview and button */}
                {statusData.youtubeVideoId === 'PENDING_APPROVAL' ? (
                  <div className="glass-panel" style={{ padding: '1.5rem', display: 'flex', flexDirection: 'column', gap: '1rem', borderLeft: '4px solid #fb7185' }}>
                    <h4 style={{ color: 'white', fontSize: '0.95rem', margin: 0, fontWeight: 'bold' }}>
                      📢 유튜브 업로드 정보 미리보기 및 최종 승인
                    </h4>
                    
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem', fontSize: '0.8rem' }}>
                      <div>
                        <strong style={{ color: 'var(--text-secondary)' }}>영상 제목:</strong>
                        <div style={{ padding: '0.4rem', background: 'rgba(0,0,0,0.3)', borderRadius: '4px', color: 'white', marginTop: '0.2rem' }}>
                          {statusData.scriptData?.title} #Shorts
                        </div>
                      </div>
                      <div>
                        <strong style={{ color: 'var(--text-secondary)' }}>영상 설명:</strong>
                        <pre style={{ padding: '0.5rem', background: 'rgba(0,0,0,0.3)', borderRadius: '4px', color: 'white', marginTop: '0.2rem', whiteSpace: 'pre-wrap', fontFamily: 'inherit', margin: 0 }}>
                          {statusData.scriptData?.youtube_description}
                        </pre>
                      </div>
                      <div>
                        <strong style={{ color: 'var(--text-secondary)' }}>고정댓글 (자동 게시 예정):</strong>
                        <pre style={{ padding: '0.5rem', background: 'rgba(0,0,0,0.3)', borderRadius: '4px', color: '#fbbf24', marginTop: '0.2rem', whiteSpace: 'pre-wrap', fontFamily: 'inherit', margin: 0 }}>
                          {statusData.commentText}
                        </pre>
                      </div>
                    </div>

                    {/* Check if compliance meets automatic upload requirement */}
                    {(() => {
                      const isQualityOk = statusData.quality_score >= 75;
                      const isAdOk = statusData.ad_score <= 50;
                      const isSimOk = (statusData.similarity_score || 0) <= 60;
                      const isComplianceOk = statusData.compliance?.passed;
                      const allPassed = isQualityOk && isAdOk && isSimOk && isComplianceOk;

                      return (
                        <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem', marginTop: '0.5rem' }}>
                          {!allPassed && (
                            <div style={{ background: 'rgba(239,68,68,0.08)', border: '1px solid rgba(239,68,68,0.2)', padding: '0.75rem', borderRadius: '6px', color: '#ef4444', fontSize: '0.75rem' }}>
                              ⚠️ <strong>자동 업로드 조건 미충족 경고:</strong>
                              <ul style={{ marginLeft: '1rem', marginTop: '0.25rem' }}>
                                {!isQualityOk && <li>품질 점수가 최소 기준(75점) 미만입니다.</li>}
                                {!isAdOk && <li>광고 냄새 점수가 허용한계(50점)를 초과했습니다.</li>}
                                {!isSimOk && <li>도입부 유사도가 기준(60%)을 초과했습니다.</li>}
                                {!isComplianceOk && <li>1-3컷 상품 노출 우회 가이드라인을 위반했습니다.</li>}
                              </ul>
                              수동 승인 버튼을 통해 검수 제외하고 강제 업로드할 수 있습니다.
                            </div>
                          )}
                          
                          <button
                            onClick={() => handleApproveAndUpload(!allPassed)}
                            disabled={uploading}
                            className="btn"
                            style={{ 
                              width: '100%', 
                              padding: '0.8rem', 
                              fontWeight: 'bold', 
                              fontSize: '0.9rem', 
                              display: 'flex', 
                              alignItems: 'center', 
                              justifyContent: 'center', 
                              gap: '0.5rem',
                              background: allPassed ? 'linear-gradient(135deg, #10b981 0%, #059669 100%)' : 'linear-gradient(135deg, #f59e0b 0%, #d97706 100%)',
                              boxShadow: allPassed ? '0 0 15px rgba(16,185,129,0.3)' : '0 0 15px rgba(245,158,11,0.3)',
                              cursor: 'pointer'
                            }}
                          >
                            {uploading ? (
                              <>
                                <Loader2 className="animate-spin" size={16} /> 유튜브 배포 중...
                              </>
                            ) : (
                              <>
                                <Video size={16} /> {allPassed ? '승인 및 유튜브 업로드' : '수동 승인 업로드'}
                              </>
                            )}
                          </button>
                        </div>
                      );
                    })()}
                  </div>
                ) : (
                  // YouTube Upload Status (After Uploading)
                  <div className="glass-panel" style={{ padding: '1.5rem', display: 'flex', flexDirection: 'column', gap: '0.75rem', borderLeft: '4px solid #10b981' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', color: '#10b981', fontWeight: 'bold', fontSize: '0.9rem' }}>
                      <CheckCircle2 size={18} /> 유튜브 쇼츠 게시 완료
                    </div>
                    <div style={{ fontSize: '0.9rem', color: 'white', fontWeight: 500 }}>
                      {statusData.uploadMessage}
                    </div>
                    <div style={{ fontSize: '0.8rem', color: 'var(--text-secondary)', display: 'flex', flexDirection: 'column', gap: '0.25rem' }}>
                      <div>
                        고정댓글 상태:{' '}
                        <strong style={{ color: statusData.pinned_comment_status === 'success' ? '#10b981' : '#f87171' }}>
                          {statusData.pinned_comment_status === 'success' ? '✓ 등록 및 게시 완료' : '✗ 게시 실패 (수동 등록 요망)'}
                        </strong>
                      </div>
                    </div>
                    {statusData.youtubeVideoId && statusData.youtubeVideoId !== 'MOCK_VIDEO_ID' && (
                      <a 
                        href={`https://studio.youtube.com/`} 
                        target="_blank" 
                        rel="noreferrer"
                        style={{ display: 'inline-flex', alignItems: 'center', gap: '0.25rem', fontSize: '0.75rem', color: '#38bdf8', textDecoration: 'none', marginTop: '0.5rem' }}
                      >
                        YouTube 스튜디오에서 비디오 확인하기 <ExternalLink size={12} />
                      </a>
                    )}
                  </div>
                )}
              </div>
            )}

          </div>

        </div>
      )}

      {/* Visual Guide Accordion */}
      <div className="glass-panel" style={{ marginTop: '2.5rem', padding: '1.5rem', textAlign: 'left' }}>
        <button 
          onClick={() => setShowGuide(!showGuide)}
          style={{ 
            width: '100%', 
            background: 'none', 
            border: 'none', 
            color: 'white', 
            display: 'flex', 
            justifyContent: 'space-between', 
            alignItems: 'center', 
            cursor: 'pointer',
            padding: 0,
            fontSize: '1.1rem',
            fontWeight: 'bold'
          }}
        >
          <span style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
            <Sparkles size={18} color="#fb7185" />
            🎨 [맹칠컴퍼니] 비주얼 퀄리티 향상 & API 연동 가이드
          </span>
          <span style={{ fontSize: '0.8rem', color: 'var(--text-secondary)' }}>
            {showGuide ? '접기 ▲' : '펼치기 ▼'}
          </span>
        </button>
        
        {showGuide && (
          <div style={{ marginTop: '1.5rem', borderTop: '1px solid rgba(255,255,255,0.1)', paddingTop: '1.5rem', color: 'var(--text-secondary)', fontSize: '0.9rem', lineHeight: '1.7' }}>
            <h4 style={{ color: 'white', marginBottom: '0.5rem' }}>1. 1분 만에 고화질 스톡 API 키 발급 및 등록하기 (강력 권장)</h4>
            <p style={{ marginBottom: '1rem' }}>
              기본 엔진은 키가 필요 없으나 키워드와 맞지 않는 이미지를 가져올 때가 많습니다. Pexels API를 연동하면 100% 주제에 맞는 9:16 고화질 세로형 이미지를 자동으로 매칭합니다.
            </p>
            <div style={{ background: 'rgba(0,0,0,0.3)', padding: '1rem', borderRadius: '8px', border: '1px solid rgba(255,255,255,0.05)', marginBottom: '1.5rem' }}>
              <strong>🔑 Pexels API 발급 방법:</strong>
              <ol style={{ marginLeft: '1.5rem', marginTop: '0.5rem' }}>
                <li><a href="https://www.pexels.com/api/" target="_blank" rel="noreferrer" style={{ color: '#38bdf8' }}>Pexels API 사이트</a>에서 무료 회원가입을 합니다.</li>
                <li>API 메뉴에서 <strong>"Your API Key"</strong> 탭을 클릭해 무료 키를 발급받아 복사합니다.</li>
                <li>프로젝트 폴더의 <code>viewer-app/.env.local</code> 파일 맨 밑에 <code>PEXELS_API_KEY=복사한_키</code>를 입력하고 서버를 재시작합니다.</li>
              </ol>
            </div>

            <h4 style={{ color: 'white', marginBottom: '0.5rem' }}>2. Flux AI 이미지 생성 골든 프롬프트 공식</h4>
            <p style={{ marginBottom: '1rem' }}>
              자동 이미지 생성기의 퀄리티를 극대화하거나 보관함에서 수동으로 이미지를 재생성할 때 사용하는 템플릿입니다.
            </p>
            <blockquote style={{ borderLeft: '4px solid #fb7185', paddingLeft: '1rem', margin: '0 0 1.5rem 0', fontStyle: 'italic', background: 'rgba(251,113,133,0.02)', padding: '0.5rem 1rem' }}>
              "Professional [style] photography, [detailed subject], [composition], [lighting], [color mood], vertical 9:16 framing, highly aesthetic, commercial-grade, 8k, no text"
            </blockquote>

            <h4 style={{ color: 'white', marginBottom: '0.5rem' }}>3. 이상한 손가락, 기괴한 뒤틀림 방지 팁</h4>
            <p style={{ margin: 0 }}>
              AI 생성 시 손가락이 어색하게 표현되거나 불필요한 글자가 박히는 것을 막기 위해 프롬프트 끝에 <code>no distorted anatomy, no weird fingers, no text, no watermark</code> 문구를 항상 명시해 주십시오. (현재 자동화 엔진은 본 가이드라인에 맞추어 보정 룰이 기본 탑재되어 있습니다.)
            </p>
          </div>
        )}
      </div>

      {/* Global CSS spinner rule */}
      <style jsx global>{`
        @keyframes spin {
          from { transform: rotate(0deg); }
          to { transform: rotate(360deg); }
        }
      `}</style>

    </div>
  );
}
