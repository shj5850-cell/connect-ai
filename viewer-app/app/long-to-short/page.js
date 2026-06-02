'use client';

import { useState, useEffect } from 'react';
import { 
  Scissors, Video, FileText, Play, Copy, Check, 
  Sparkles, Loader2, RefreshCw, AlertCircle, ArrowLeft, ExternalLink,
  ShoppingBag, Key, HelpCircle
} from 'lucide-react';
import Link from 'next/link';

const YoutubeIcon = ({ size = 16, color = "currentColor", ...props }) => (
  <svg 
    xmlns="http://www.w3.org/2000/svg" 
    width={size} 
    height={size} 
    viewBox="0 0 24 24" 
    fill="none" 
    stroke={color} 
    strokeWidth="2" 
    strokeLinecap="round" 
    strokeLinejoin="round" 
    {...props}
  >
    <path d="M22.54 6.42a2.78 2.78 0 0 0-1.94-2C18.88 4 12 4 12 4s-6.88 0-8.6.46a2.78 2.78 0 0 0-1.94 2A29 29 0 0 0 1 11.75a29 29 0 0 0 .46 5.33A2.78 2.78 0 0 0 3.4 19c1.72.46 8.6.46 8.6.46s6.88 0 8.6-.46a2.78 2.78 0 0 0 1.94-2 29 29 0 0 0 .46-5.25 29 29 0 0 0-.46-5.33z" />
    <polygon points="9.75 15.02 15.5 11.75 9.75 8.48 9.75 15.02" fill="currentColor" />
  </svg>
);

export default function LongToShortPage() {
  const [mode, setMode] = useState('video'); // 'video', 'coupang'
  const [longText, setLongText] = useState('');
  const [shortsCount, setShortsCount] = useState(3);
  const [loading, setLoading] = useState(false);
  const [shortsList, setShortsList] = useState([]);
  const [copiedId, setCopiedId] = useState(null);
  const [errorMsg, setErrorMsg] = useState('');

  // Custom Script Generation states
  const [customScript, setCustomScript] = useState('');
  const [bgmType, setBgmType] = useState('정보형');
  const [hookOption, setHookOption] = useState({ enabled: false, mode: 'auto', text: '' });

  // Viral Shorts states
  const [viralShorts, setViralShorts] = useState([]);
  const [viralLoading, setViralLoading] = useState(false);
  const [extractingId, setExtractingId] = useState(null);
  const [playingId, setPlayingId] = useState(null);

  // AI Stock Shorts states
  const [keyword, setKeyword] = useState('');
  const [voice, setVoice] = useState('female');
  const [affiliateLink, setAffiliateLink] = useState('');
  const [imageSourceMode, setImageSourceMode] = useState('stock_only');
  const [directImageUrl, setDirectImageUrl] = useState('');
  const [localImageBase64, setLocalImageBase64] = useState('');
  const [localImageFileName, setLocalImageFileName] = useState('');
  const [coupangLoading, setCoupangLoading] = useState(false);
  const [coupangResult, setCoupangResult] = useState(null);
  const [activeResultTab, setActiveResultTab] = useState('video');
  const [videoRendering, setVideoRendering] = useState(false);
  const [renderedVideoUrl, setRenderedVideoUrl] = useState('');
  const [ytUploadLoading, setYtUploadLoading] = useState(false);
  const [ytUploadedUrl, setYtUploadedUrl] = useState('');
  
  // API Keys states for Pexels and Pixabay
  const [pexelsApiKey, setPexelsApiKey] = useState('');
  const [pixabayApiKey, setPixabayApiKey] = useState('');
  const [templateStyle, setTemplateStyle] = useState('classic');
  const [coupangUrl, setCoupangUrl] = useState('');
  const [coupangTone, setCoupangTone] = useState('trusted');
  const [coupangProductTitle, setCoupangProductTitle] = useState('');

  useEffect(() => {
    if (typeof window !== 'undefined') {
      const savedPexels = localStorage.getItem('pexels_api_key');
      const savedPixabay = localStorage.getItem('pixabay_api_key');
      if (savedPexels) setPexelsApiKey(savedPexels);
      if (savedPixabay) setPixabayApiKey(savedPixabay);
    }
  }, []);

  const handlePexelsKeyChange = (val) => {
    setPexelsApiKey(val);
    localStorage.setItem('pexels_api_key', val);
  };

  const handlePixabayKeyChange = (val) => {
    setPixabayApiKey(val);
    localStorage.setItem('pixabay_api_key', val);
  };
  const [ytAuth, setYtAuth] = useState({ authenticated: false, clientId: '', clientSecret: '', hasRefreshToken: false });
  const [showYtConfig, setShowYtConfig] = useState(false);
  const [ytClientId, setYtClientId] = useState('');
  const [ytClientSecret, setYtClientSecret] = useState('');

  const fetchViralShorts = async (refresh = false) => {
    setViralLoading(true);
    setErrorMsg('');
    try {
      const response = await fetch(`/api/viral-shorts${refresh ? '?refresh=true' : ''}`);
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

  const checkYtAuth = async () => {
    try {
      const res = await fetch('/api/upload-youtube');
      const data = await res.json();
      if (data.success) {
        setYtAuth(data);
        if (data.clientId) {
          setYtClientId(data.clientId);
        }
      }
    } catch (e) {
      console.error('Error checking YouTube auth status:', e);
    }
  };

  useEffect(() => {
    fetchViralShorts(false);
    checkYtAuth();
  }, []);

  useEffect(() => {
    const handleAuthMessage = (event) => {
      if (event.data?.type === 'YOUTUBE_AUTH_SUCCESS') {
        checkYtAuth();
        setErrorMsg('');
        alert('🎉 유튜브 계정 연동이 완료되었습니다!');
      }
    };
    window.addEventListener('message', handleAuthMessage);
    return () => window.removeEventListener('message', handleAuthMessage);
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

  const handleExtractCoupangShorts = async (e) => {
    e.preventDefault();
    if (!coupangProductTitle.trim()) {
      setErrorMsg('제작할 상품명 또는 핵심 키워드를 입력해 주세요.');
      return;
    }

    setCoupangLoading(true);
    setErrorMsg('');
    setCoupangResult(null);
    setRenderedVideoUrl('');

    const requestUrl = coupangUrl.trim() || 'https://www.coupang.com';

    try {
      const response = await fetch('/api/coupang-shorts', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          url: requestUrl,
          affiliateLink: affiliateLink,
          tone: coupangTone,
          manualTitle: coupangProductTitle
        })
      });

      const data = await response.json();

      if (response.ok && data.success) {
        setCustomScript(data.shorts.script);
        setKeyword(data.product.title);
        setCoupangResult(data);
      } else {
        setErrorMsg(data.error || '쿠팡 상품 정보 크롤링 및 대본 생성에 실패했습니다.');
      }
    } catch (err) {
      console.error(err);
      setErrorMsg('쿠팡 API 호출 중 네트워크 오류가 발생했습니다.');
    } finally {
      setCoupangLoading(false);
    }
  };

  const handleCoupangGenerate = async (e) => {
    e.preventDefault();
    if (!customScript.trim()) {
      setErrorMsg('제작할 쇼츠 대본 문장을 직접 입력해 주세요.');
      return;
    }

    setCoupangLoading(true);
    setErrorMsg('');
    setCoupangResult(null);
    setRenderedVideoUrl('');
    setYtUploadedUrl('');

    const derivedKeyword = keyword.trim() || customScript.trim().split('\n')[0].slice(0, 15) || '맞춤형 쇼츠';

    try {
      const response = await fetch('/api/generate-shorts', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ 
          sentencesText: customScript,
          bgmType,
          hookOption,
          keyword: derivedKeyword, 
          voice, 
          affiliateLink,
          imageSourceMode,
          directImageUrl,
          localImageBase64,
          localImageFileName,
          pexelsApiKey,
          pixabayApiKey,
          templateStyle
        })
      });

      const data = await response.json();

      if (response.ok && data.success) {
        let displayImage = 'https://images.unsplash.com/photo-1618005182384-a83a8bd57fbe?w=500';
        if (imageSourceMode === 'direct' && localImageBase64) {
          displayImage = localImageBase64;
        } else if (data.assets && data.assets.length > 0) {
          const firstImg = data.assets.find(a => a.type === 'image');
          if (firstImg) displayImage = firstImg.url;
        }

        const modeLabels = {
          stock_only: '감성 스톡 B-Roll만',
          direct: '대표 이미지 직접 지정',
          stock_naver: '실물 매칭 + 스톡 B-Roll',
          naver_only: '네이버 실물 이미지 검색'
        };
        const modeLabel = modeLabels[imageSourceMode] || 'AI 매칭';

        setCoupangResult({
          product: {
            title: derivedKeyword,
            image: displayImage,
            price: modeLabel,
            affiliateLink: affiliateLink || '#'
          },
          shorts: {
            title: data.title,
            hook: data.script ? (data.script.split('.')[0] || '쇼츠 자동 제작 완료') : '쇼츠 자동 제작 완료',
            script: data.script,
            visualCues: `매칭 방식: ${modeLabel}\n스톡 키워드: ${data.searchKeywords ? data.searchKeywords.join(', ') : ''}`,
            estimatedDuration: `${data.scenes ? data.scenes.length * 2 : 30}s`
          },
          analysis: data.analysis,
          strategy: data.strategy,
          titles: data.titles,
          ttsScript: data.ttsScript,
          bgmRecommendation: data.bgmRecommendation,
          uploadDescription: data.uploadDescription,
          hashtags: data.hashtags,
          expectedReaction: data.expectedReaction,
          retentionPoints: data.retentionPoints,
          scenes: data.scenes,
          productAnalysis: data.productAnalysis,
          assets: data.assets
        });
        setRenderedVideoUrl(data.videoUrl);
      } else {
        setErrorMsg(data.error || '쇼츠 기획 및 비디오 렌더링에 실패했습니다.');
      }
    } catch (err) {
      console.error(err);
      setErrorMsg('네트워크 통신 오류가 발생했습니다.');
    } finally {
      setCoupangLoading(false);
    }
  };

  const handleGenerateVideo = async () => {
    if (!coupangResult || !coupangResult.shorts) return;

    setVideoRendering(true);
    setErrorMsg('');
    setRenderedVideoUrl('');

    try {
      const response = await fetch('/api/generate-video', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          script: coupangResult.shorts.script,
          image: coupangResult.product.image,
          title: coupangResult.shorts.title,
          templateStyle
        })
      });

      const data = await response.json();

      if (response.ok && data.success) {
        setRenderedVideoUrl(data.videoUrl);
      } else {
        setErrorMsg(data.error || '비디오 렌더링에 실패했습니다. Python 스크립트 로그를 확인해 주세요.');
      }
    } catch (err) {
      console.error(err);
      setErrorMsg('비디오 생성 중 네트워크 통신 오류가 발생했습니다.');
    } finally {
      setVideoRendering(false);
    }
  };

  const handleYoutubeUpload = async () => {
    if (!renderedVideoUrl || !coupangResult) return;

    setYtUploadLoading(true);
    setErrorMsg('');
    setYtUploadedUrl('');

    try {
      // Build description with affiliate link
      const productPriceStr = coupangResult.product.price ? `\n🏷️ 가격: ${coupangResult.product.price}` : '';
      const buyLinkStr = coupangResult.product.affiliateLink ? `\n🛒 최저가 구매 링크: ${coupangResult.product.affiliateLink}` : '';
      const description = `${coupangResult.shorts.title}\n\n${coupangResult.shorts.script.slice(0, 500)}\n\n---${productPriceStr}${buyLinkStr}\n\n#쿠팡파트너스 #추천템 #내돈내산 #쇼츠 #자동화`;

      const response = await fetch('/api/upload-youtube', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          action: 'upload',
          videoUrl: renderedVideoUrl,
          title: coupangResult.shorts.title,
          description: description
        })
      });

      const data = await response.json();

      if (response.ok && data.success) {
        setYtUploadedUrl(data.videoUrl);
      } else {
        setErrorMsg(data.error || '유튜브 업로드 중 오류가 발생했습니다.');
      }
    } catch (err) {
      console.error(err);
      setErrorMsg('유튜브 업로드 API 호출 중 네트워크 오류가 발생했습니다.');
    } finally {
      setYtUploadLoading(false);
    }
  };

  const handleSaveYtCredentials = async (e) => {
    e.preventDefault();
    if (!ytClientId.trim() || !ytClientSecret.trim()) return;

    setErrorMsg('');
    try {
      const response = await fetch('/api/upload-youtube', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          action: 'save_credentials',
          clientId: ytClientId,
          clientSecret: ytClientSecret
        })
      });

      const data = await response.json();

      if (response.ok && data.success && data.redirectUrl) {
        // Open authorization screen in popup
        const width = 600;
        const height = 700;
        const left = window.screenX + (window.outerWidth - width) / 2;
        const top = window.screenY + (window.outerHeight - height) / 2;
        window.open(
          data.redirectUrl,
          'youtube_auth',
          `width=${width},height=${height},left=${left},top=${top},status=no,resizable=yes`
        );
      } else {
        setErrorMsg(data.error || '인증 URL 생성에 실패했습니다.');
      }
    } catch (err) {
      console.error(err);
      setErrorMsg('인증 요청 중 네트워크 오류가 발생했습니다.');
    }
  };

  const handleExtractTranscript = async (short) => {
    setExtractingId(short.id);
    setErrorMsg('');
    try {
      const response = await fetch(`/api/analyze-viral-short?url=${encodeURIComponent(short.url || 'https://www.youtube.com/shorts/' + short.id)}`);
      const data = await response.json();
      if (data.success && data.transcript) {
        setCustomScript(data.transcript);
        setMode('coupang'); // Switch tab to custom script generator mode
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
            유튜브 인기 숏폼 분석뿐만 아니라, 쿠팡 파트너스 링크만 넣으면 영상 렌더링부터 유튜브 업로드까지 자동으로 구현하는 올인원 워크플로우를 제공합니다.
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
          <span>🔥 실시간 인기 숏폼 트렌드</span>
        </button>
        <button 
          className={`mode-tab ${mode === 'coupang' ? 'active' : ''}`}
          onClick={() => { setMode('coupang'); setErrorMsg(''); }}
          style={{ position: 'relative' }}
        >
          <Sparkles size={18} color="#fbbf24" />
          <span>✍️ 맞춤형 쇼츠 자동 제작기</span>
          <span style={{
            position: 'absolute',
            top: '-8px',
            right: '-10px',
            background: 'linear-gradient(135deg, #fbbf24, #f59e0b)',
            color: '#000000',
            fontSize: '0.65rem',
            padding: '1px 5px',
            borderRadius: '20px',
            fontWeight: 800,
            boxShadow: '0 0 8px rgba(251,191,36,0.5)'
          }}>NEW</span>
        </button>
      </div>

      {errorMsg && <div className="error-message-box" style={{ marginBottom: '1.5rem' }}><AlertCircle size={14} />{errorMsg}</div>}

      {/* Dynamic View rendering based on mode */}
      {mode === 'video' && (
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
              onClick={() => fetchViralShorts(true)} 
              disabled={viralLoading}
              className="btn btn-secondary"
              style={{ display: 'flex', alignItems: 'center', gap: '0.4rem', fontSize: '0.8rem', padding: '0.5rem 1rem' }}
            >
              <RefreshCw size={14} className={viralLoading ? 'animate-spin' : ''} />
              <span>실시간 새로고침</span>
            </button>
          </div>

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
      )}

      {mode === 'text' && (
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

      {mode === 'coupang' && (
        <div className="long-to-short-grid">
          
          {/* Left Column: Keyword Input and Actions */}
          <div className="glass-panel input-panel" style={{ padding: '2rem', display: 'flex', flexDirection: 'column', gap: '1.5rem', overflowY: 'auto' }}>
            
            {/* [1단계] 쿠팡 링크로 대본 기획 */}
            <form onSubmit={handleExtractCoupangShorts} style={{ display: 'flex', flexDirection: 'column', gap: '1rem', borderBottom: '1px solid rgba(255,255,255,0.08)', paddingBottom: '1.5rem' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <label style={{ fontWeight: 700, fontSize: '0.95rem', color: '#fbbf24', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                  <Sparkles size={18} color="#fbbf24" />
                  <span>🛒 1단계: 쿠팡 파트너스 링크 기획</span>
                </label>
              </div>

              <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
                <span className="input-title-label" style={{ color: 'white', fontWeight: 600 }}>제작할 상품명 / 검색어 입력 (필수)</span>
                <input
                  type="text"
                  value={coupangProductTitle}
                  onChange={(e) => setCoupangProductTitle(e.target.value)}
                  placeholder="예: 곰곰 대패삼겹살 1kg"
                  className="coupang-input-field"
                  style={{ fontSize: '0.85rem', padding: '0.6rem 0.8rem', border: '1px solid rgba(251,191,36,0.3)' }}
                  required
                />
                <span style={{ fontSize: '0.7rem', color: 'var(--text-secondary)' }}>
                  * 쿠팡의 봇 감지 방화벽을 우회하기 위해 정확한 상품명을 적어주세요. AI가 구글 검색으로 실시간 정보를 가져옵니다.
                </span>
              </div>
              
              <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
                <span className="input-title-label">쿠팡 상품 URL (선택)</span>
                <input
                  type="url"
                  value={coupangUrl}
                  onChange={(e) => setCoupangUrl(e.target.value)}
                  placeholder="예: https://www.coupang.com/vp/products/..."
                  className="coupang-input-field"
                  style={{ fontSize: '0.85rem', padding: '0.6rem 0.8rem' }}
                />
                <span style={{ fontSize: '0.7rem', color: 'var(--text-secondary)' }}>
                  * 쿠팡 상품 링크를 함께 넣으면 추가 크롤링을 시도합니다 (차단 시 건너뜀).
                </span>
              </div>

              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0.75rem' }}>
                <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
                  <span className="input-title-label">대본 톤앤매너 설정</span>
                  <select
                    value={coupangTone}
                    onChange={(e) => setCoupangTone(e.target.value)}
                    className="coupang-select-field"
                    style={{ fontSize: '0.8rem', padding: '0.5rem' }}
                  >
                    <option value="trusted">🧐 신뢰감 넘치는 톤 (전문 리뷰어)</option>
                    <option value="funny">😆 유머러스하고 위트있는 톤</option>
                    <option value="bold">🔥 자극적이고 솔직 장단점 톤</option>
                  </select>
                </div>

                <div style={{ display: 'flex', alignItems: 'flex-end' }}>
                  <button 
                    type="submit" 
                    disabled={coupangLoading || !coupangProductTitle.trim()} 
                    className="btn"
                    style={{
                      width: '100%',
                      background: 'rgba(251, 191, 36, 0.1)',
                      border: '1px solid rgba(251, 191, 36, 0.4)',
                      color: '#fbbf24',
                      fontWeight: 'bold',
                      padding: '0.65rem',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      gap: '0.4rem',
                      borderRadius: '8px',
                      cursor: 'pointer',
                      fontSize: '0.82rem',
                      height: '42px'
                    }}
                  >
                    {coupangLoading ? <Loader2 className="animate-spin" size={14} /> : <Sparkles size={14} />}
                    <span>{coupangLoading ? '대본 기획 중...' : '🔍 AI 쇼츠 대본 추출'}</span>
                  </button>
                </div>
              </div>
            </form>

            {/* [2단계] 대본 최종 편집 & 영상 제작 */}
            <form onSubmit={handleCoupangGenerate} style={{ display: 'flex', flexDirection: 'column', gap: '1.2rem', marginTop: '0.5rem' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <label style={{ fontWeight: 700, fontSize: '0.95rem', color: 'white', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                  <span>🎬 2단계: 대본 최종 검토 및 영상 제작</span>
                </label>
              </div>

              <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
                <span className="input-title-label">쇼츠 대본 문장 편집 (한 줄에 한 장면)</span>
                <textarea
                  value={customScript}
                  onChange={(e) => setCustomScript(e.target.value)}
                  placeholder="쿠팡 링크를 통해 추출하거나 직접 쇼츠 대본을 입력해 주세요.&#13;예시:&#13;삼겹살은 왜 맛있을까?&#13;고기가 익어가며 마이야르 반응이 발생한다.&#13;이 반응이 고소한 향을 만든다.&#13;그래서 우리는 더 맛있다고 느낀다."
                  className="coupang-input-field"
                  style={{ height: '180px', padding: '0.75rem', fontSize: '0.85rem', lineHeight: '1.5', resize: 'none' }}
                  required
                />
                <span style={{ fontSize: '0.7rem', color: 'var(--text-secondary)' }}>
                  * 각 문장마다 개별적으로 검색어 생성, 미디어 매칭, TTS(음성) 및 자막이 생성됩니다.
                </span>
              </div>

              <div style={{
                background: 'rgba(255, 255, 255, 0.01)',
                border: '1px solid var(--border-color)',
                borderRadius: '8px',
                padding: '0.85rem',
                display: 'flex',
                flexDirection: 'column',
                gap: '0.5rem'
              }}>
                <label style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', cursor: 'pointer', fontSize: '0.8rem', fontWeight: 'bold', color: 'white' }}>
                  <input
                    type="checkbox"
                    checked={hookOption.enabled}
                    onChange={(e) => setHookOption({ ...hookOption, enabled: e.target.checked })}
                    style={{ width: '15px', height: '15px', accentColor: '#fbbf24' }}
                  />
                  <span>첫 부분에 후킹(Hook) 추가하기</span>
                </label>
                
                {hookOption.enabled && (
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '0.65rem', marginTop: '0.25rem', borderTop: '1px solid rgba(255,255,255,0.05)', paddingTop: '0.5rem' }}>
                    <div style={{ display: 'flex', gap: '1rem', fontSize: '0.75rem' }}>
                      <label style={{ display: 'flex', alignItems: 'center', gap: '0.25rem', cursor: 'pointer' }}>
                        <input
                          type="radio"
                          name="hookMode"
                          checked={hookOption.mode === 'auto'}
                          onChange={() => setHookOption({ ...hookOption, mode: 'auto' })}
                          style={{ accentColor: '#fbbf24' }}
                        />
                        <span>AI 자동 생성</span>
                      </label>
                      <label style={{ display: 'flex', alignItems: 'center', gap: '0.25rem', cursor: 'pointer' }}>
                        <input
                          type="radio"
                          name="hookMode"
                          checked={hookOption.mode === 'manual'}
                          onChange={() => setHookOption({ ...hookOption, mode: 'manual' })}
                          style={{ accentColor: '#fbbf24' }}
                        />
                        <span>직접 입력</span>
                      </label>
                    </div>

                    {hookOption.mode === 'manual' && (
                      <input
                        type="text"
                        value={hookOption.text}
                        onChange={(e) => setHookOption({ ...hookOption, text: e.target.value })}
                        placeholder="예: 아직도 삼겹살을 대충 굽고 계신가요?"
                        className="coupang-input-field"
                        style={{ fontSize: '0.78rem', padding: '0.4rem 0.6rem' }}
                        required
                      />
                    )}
                  </div>
                )}
              </div>

              <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
                <span className="input-title-label">배경음악 추천 유형</span>
                <select
                  value={bgmType}
                  onChange={(e) => setBgmType(e.target.value)}
                  className="coupang-select-field"
                >
                  <option value="정보형">📚 정보형 (차분하고 설명적인 톤)</option>
                  <option value="감성형">🌱 감성형 (부드럽고 따뜻한 톤)</option>
                  <option value="동기부여형">🔥 동기부여형 (힘차고 에너제틱한 톤)</option>
                  <option value="리뷰형">⭐️ 리뷰형 (경쾌하고 직관적인 톤)</option>
                  <option value="음식형">🍖 음식형 (군침 도는 리듬감 있는 톤)</option>
                </select>
              </div>

              <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
                <span className="input-title-label">영상 제목 / 키워드 (선택)</span>
                <input
                  type="text"
                  value={keyword}
                  onChange={(e) => setKeyword(e.target.value)}
                  placeholder="예: 삼겹살이 맛있는 이유 (미입력 시 첫 문장 기준 자동 생성)"
                  className="coupang-input-field"
                />
              </div>

              <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
                <span className="input-title-label">수익화 단축 링크 (선택)</span>
                <input
                  type="text"
                  value={affiliateLink}
                  onChange={(e) => setAffiliateLink(e.target.value)}
                  placeholder="유튜브 쇼츠 설명란에 들어갈 제휴/홍보 링크"
                  className="coupang-input-field"
                />
              </div>

              <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
                <span className="input-title-label">성우 목소리 선택 (Neural TTS)</span>
                <select 
                  value={voice} 
                  onChange={(e) => setVoice(e.target.value)}
                  className="coupang-select-field"
                >
                  <option value="female">🧐  여성 성우 (선희 - 차분하고 신뢰형)</option>
                  <option value="male">👨‍💼 남성 성우 (인준 - 명확하고 설득력있음)</option>
                </select>
              </div>

              <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
                <span className="input-title-label">🎨 쇼츠 비주얼 템플릿 선택</span>
                <select 
                  value={templateStyle} 
                  onChange={(e) => setTemplateStyle(e.target.value)}
                  className="coupang-select-field"
                  style={{
                    background: 'rgba(251,191,36,0.05)',
                    border: '1px solid rgba(251,191,36,0.3)',
                    color: '#fbbf24',
                    fontWeight: 'bold'
                  }}
                >
                  <option value="classic" style={{ color: 'white', background: '#121212' }}>🎬 클래식 바이럴 (반투명 캡슐 자막 + 기본)</option>
                  <option value="vibrant" style={{ color: 'white', background: '#121212' }}>🔥 Vibrant 네온 (보라-핑크 글로우 테두리 + 피치 오렌지 자막)</option>
                  <option value="greenline" style={{ color: 'white', background: '#121212' }}>⚡ GreenLine 테크 (형광 네온 그린 상하선 + 형광 그린 자막)</option>
                  <option value="minimal" style={{ color: 'white', background: '#121212' }}>🥚 Minimal 액자 (얇은 20% 투명 흰색 액자 + 깔끔 자막)</option>
                </select>
              </div>

              {/* 스톡 비디오 API 연동 설정 */}
              <div style={{
                background: 'rgba(255, 255, 255, 0.01)',
                border: '1px solid var(--border-color)',
                borderRadius: '8px',
                padding: '0.85rem',
                display: 'flex',
                flexDirection: 'column',
                gap: '0.65rem'
              }}>
                <span style={{ fontSize: '0.78rem', fontWeight: 700, color: 'white', display: 'flex', alignItems: 'center', gap: '0.3rem' }}>
                  <Key size={13} color="#fbbf24" />
                  <span>스톡 비디오 API 연동 (선택사항)</span>
                </span>
                <p style={{ fontSize: '0.68rem', color: 'var(--text-secondary)', margin: 0, lineHeight: 1.4 }}>
                  Pexels/Pixabay API 키가 입력되면 고품질의 B-roll 비디오 클립을 수집하며, 미입력 시 Unsplash 스톡 이미지로 대체됩니다.
                </p>
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0.5rem' }}>
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '0.25rem' }}>
                    <span style={{ fontSize: '0.68rem', color: 'var(--text-secondary)' }}>Pexels API Key</span>
                    <input 
                      type="password"
                      value={pexelsApiKey}
                      onChange={(e) => handlePexelsKeyChange(e.target.value)}
                      placeholder="Pexels Key"
                      className="coupang-input-field"
                      style={{ fontSize: '0.72rem', padding: '0.4rem 0.6rem' }}
                    />
                  </div>
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '0.25rem' }}>
                    <span style={{ fontSize: '0.68rem', color: 'var(--text-secondary)' }}>Pixabay API Key</span>
                    <input 
                      type="password"
                      value={pixabayApiKey}
                      onChange={(e) => handlePixabayKeyChange(e.target.value)}
                      placeholder="Pixabay Key"
                      className="coupang-input-field"
                      style={{ fontSize: '0.72rem', padding: '0.4rem 0.6rem' }}
                    />
                  </div>
                </div>
              </div>

              <button 
                type="submit" 
                disabled={coupangLoading || !customScript.trim()} 
                className="btn generate-submit-btn-coupang"
                style={{
                  background: 'linear-gradient(135deg, #fbbf24, #f59e0b)',
                  color: 'black',
                  fontWeight: 'bold'
                }}
              >
                {coupangLoading ? <Loader2 className="animate-spin" size={16} /> : <Sparkles size={16} />}
                <span>{coupangLoading ? '장면 분석 및 비디오 합성 중 (약 30초)...' : '⚡ 쇼츠 영상 자동 제작하기 (30초 이내)'}</span>
              </button>
            </form>

            {/* Video preview section */}
            {renderedVideoUrl && (
              <div className="media-creation-section" style={{ borderTop: '1px solid rgba(255,255,255,0.05)', paddingTop: '1.5rem' }}>
                <h3 className="sub-section-title">🎬 제작 완료된 쇼츠 동영상</h3>
                <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem', alignItems: 'center', marginTop: '1rem' }}>
                  <div className="video-player-container">
                    <video src={renderedVideoUrl} controls className="rendered-video-player" style={{ borderRadius: '8px', border: '1px solid rgba(255,255,255,0.1)' }} />
                  </div>
                  <span style={{ fontSize: '0.75rem', color: '#10b981', display: 'flex', alignItems: 'center', gap: '0.3rem', fontWeight: 600 }}>
                    <Check size={14} /> 영상 렌더링 완료 (/public/shorts에 저장됨)
                  </span>
                </div>
              </div>
            )}

            {/* YouTube account status & credentials configuration block */}
            {coupangResult && renderedVideoUrl && (
              <div className="youtube-upload-section">
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.75rem' }}>
                  <h3 className="sub-section-title" style={{ margin: 0 }}>🚀 유튜브 쇼츠 바로 게시</h3>
                  <button 
                    onClick={() => setShowYtConfig(!showYtConfig)} 
                    className="btn-link"
                    style={{ fontSize: '0.75rem', color: '#fbbf24', display: 'flex', alignItems: 'center', gap: '0.2rem', cursor: 'pointer', background: 'none', border: 'none' }}
                  >
                    <Key size={12} />
                    <span>{showYtConfig ? '연동 패널 숨기기' : 'API 키/인증 정보 수정'}</span>
                  </button>
                </div>

                {/* Show OAuth registration if not authenticated or toggled */}
                {(showYtConfig || !ytAuth.authenticated) && (
                  <form onSubmit={handleSaveYtCredentials} className="yt-credentials-box">
                    <div style={{ display: 'flex', alignItems: 'flex-start', gap: '0.4rem', color: '#f59e0b', fontSize: '0.75rem', marginBottom: '0.5rem', background: 'rgba(245,158,11,0.05)', padding: '0.6rem', borderRadius: '6px' }}>
                      <HelpCircle size={14} style={{ marginTop: '2px', flexShrink: 0 }} />
                      <span>Google API 콘솔에서 OAuth 클라이언트 ID를 발급받은 후 등록하고 구글 계정을 연동해 주세요. (Redirect URI: http://localhost:3000/api/upload-youtube/callback)</span>
                    </div>

                    <div style={{ display: 'flex', flexDirection: 'column', gap: '0.4rem' }}>
                      <span style={{ fontSize: '0.75rem', color: 'var(--text-secondary)' }}>Google OAuth Client ID</span>
                      <input 
                        type="text" 
                        value={ytClientId}
                        onChange={(e) => setYtClientId(e.target.value)}
                        className="coupang-input-field" 
                        style={{ fontSize: '0.75rem', padding: '0.4rem 0.6rem' }}
                        placeholder="773040580705-xxxxxxx.apps.googleusercontent.com"
                        required
                      />
                    </div>
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '0.4rem', marginTop: '0.5rem' }}>
                      <span style={{ fontSize: '0.75rem', color: 'var(--text-secondary)' }}>Google OAuth Client Secret</span>
                      <input 
                        type="password" 
                        value={ytClientSecret}
                        onChange={(e) => setYtClientSecret(e.target.value)}
                        className="coupang-input-field" 
                        style={{ fontSize: '0.75rem', padding: '0.4rem 0.6rem' }}
                        placeholder={ytAuth.authenticated ? '••••••••' : 'OAuth 클라이언트 비밀번호'}
                        required={!ytAuth.authenticated}
                      />
                    </div>
                    <button 
                      type="submit" 
                      className="btn yt-connect-btn"
                    >
                      <Key size={14} />
                      <span>Google 계정 연동 및 로그인</span>
                    </button>
                  </form>
                )}

                {ytAuth.authenticated ? (
                  <div style={{ marginTop: '0.75rem' }}>
                    {ytUploadedUrl ? (
                      <div className="yt-success-box">
                        <span className="success-txt">✓ 쇼츠 자동 업로드 성공!</span>
                        <a href={ytUploadedUrl} target="_blank" rel="noopener noreferrer" className="btn btn-primary yt-visit-btn">
                          유튜브에서 쇼츠 보기 <ExternalLink size={14} />
                        </a>
                      </div>
                    ) : (
                      <button
                        onClick={handleYoutubeUpload}
                        disabled={ytUploadLoading}
                        className="btn yt-upload-run-btn"
                      >
                        {ytUploadLoading ? <Loader2 className="animate-spin" size={16} /> : <YoutubeIcon size={16} />}
                        <span>{ytUploadLoading ? '동영상 바이너리 전송 및 발행 중...' : '유튜브 쇼츠로 즉시 업로드 (설명란에 파트너스 링크 삽입)'}</span>
                      </button>
                    )}
                  </div>
                ) : (
                  <div style={{ textAlign: 'center', padding: '1rem', border: '1px dashed var(--border-color)', borderRadius: '10px', background: 'rgba(255,255,255,0.01)', color: 'var(--text-secondary)', fontSize: '0.8rem', marginTop: '0.5rem' }}>
                    ⚠️ 유튜브 업로드를 위해 위의 패널에서 Google 계정 연동을 먼저 진행해 주세요.
                  </div>
                )}
              </div>
            )}
          </div>

          {/* Right Column: Previews and drafts */}
          <div className="glass-panel output-panel" style={{ padding: '2rem', display: 'flex', flexDirection: 'column' }}>
            <h2 style={{ fontSize: '1.2rem', marginBottom: '1.25rem', display: 'flex', alignItems: 'center', gap: '0.5rem', borderBottom: '1px solid rgba(255,255,255,0.05)', paddingBottom: '0.75rem', margin: 0 }}>
              <Video size={20} color="var(--accent-secondary)" />
              <span>🛍️ AI 스톡 쇼츠 기획 정보</span>
            </h2>

            <div className="shorts-scroll-area">
              {!coupangResult ? (
                <div className="empty-state">
                  <Sparkles size={48} color="rgba(255,255,255,0.05)" />
                  <p style={{ color: 'var(--text-secondary)', fontSize: '0.9rem', marginTop: '1rem', textAlign: 'center' }}>
                    {coupangLoading ? 'Gemini 1.5 Flash와 Python 비디오 렌더러가 이미지 수집, 고음질 목소리 생성 및 영상 제작을 함께 진행하고 있습니다. 잠시만 기다려주세요...' : '왼쪽 입력창에 제작할 키워드를 입력하고 [쇼츠 영상 자동 제작하기]를 클릭해 주세요.'}
                  </p>
                </div>
              ) : (
                <div className="shorts-cards-list">
                  
                  {/* Scraped Product Metadata Info Card */}
                  <div className="product-scraped-info-card" style={{ display: 'flex', alignItems: 'center', gap: '1rem', background: 'rgba(255,255,255,0.02)', border: '1px solid var(--border-color)', borderRadius: '12px', padding: '1rem', marginBottom: '1.2rem' }}>
                    <img src={coupangResult.product.image} alt={coupangResult.product.title} className="product-scraped-img" style={{ width: '80px', height: '80px', objectFit: 'cover', borderRadius: '8px', border: '1px solid rgba(255,255,255,0.05)' }} />
                    <div className="product-scraped-details" style={{ flex: 1 }}>
                      <h4 className="product-scraped-title" style={{ margin: '0 0 0.35rem 0', fontSize: '0.9rem', color: 'var(--text-primary)' }}>{coupangResult.product.title}</h4>
                      <div className="product-scraped-price-row" style={{ display: 'flex', gap: '0.5rem', alignItems: 'center' }}>
                        <span className="product-scraped-price-label" style={{ fontSize: '0.72rem', color: 'var(--text-secondary)' }}>매칭 모드:</span>
                        <span className="product-scraped-price-val" style={{ fontSize: '0.75rem', color: '#fbbf24', fontWeight: 800 }}>{coupangResult.product.price}</span>
                      </div>
                    </div>
                  </div>

                  {/* Tabs navigation */}
                  <div className="result-tabs" style={{ display: 'flex', gap: '0.3rem', marginBottom: '1.2rem', borderBottom: '1px solid rgba(255,255,255,0.05)', paddingBottom: '0.5rem', flexWrap: 'wrap' }}>
                    <button 
                      type="button"
                      onClick={() => setActiveResultTab('productAnalysis')} 
                      className={`result-tab-btn ${activeResultTab === 'productAnalysis' ? 'active' : ''}`}
                      style={{
                        background: activeResultTab === 'productAnalysis' ? 'rgba(251,191,36,0.1)' : 'none',
                        border: 'none',
                        color: activeResultTab === 'productAnalysis' ? '#fbbf24' : 'var(--text-secondary)',
                        fontSize: '0.72rem',
                        fontWeight: 700,
                        padding: '0.4rem 0.65rem',
                        borderRadius: '6px',
                        cursor: 'pointer',
                        transition: 'all 0.2s'
                      }}
                    >🛍️ 상품 분석 AI</button>
                    <button 
                      type="button"
                      onClick={() => setActiveResultTab('video')} 
                      className={`result-tab-btn ${activeResultTab === 'video' ? 'active' : ''}`}
                      style={{
                        background: activeResultTab === 'video' ? 'rgba(251,191,36,0.1)' : 'none',
                        border: 'none',
                        color: activeResultTab === 'video' ? '#fbbf24' : 'var(--text-secondary)',
                        fontSize: '0.72rem',
                        fontWeight: 700,
                        padding: '0.4rem 0.65rem',
                        borderRadius: '6px',
                        cursor: 'pointer',
                        transition: 'all 0.2s'
                      }}
                    >🎬 대본 & 연출</button>
                    <button 
                      type="button"
                      onClick={() => setActiveResultTab('analysis')} 
                      className={`result-tab-btn ${activeResultTab === 'analysis' ? 'active' : ''}`}
                      style={{
                        background: activeResultTab === 'analysis' ? 'rgba(251,191,36,0.1)' : 'none',
                        border: 'none',
                        color: activeResultTab === 'analysis' ? '#fbbf24' : 'var(--text-secondary)',
                        fontSize: '0.72rem',
                        fontWeight: 700,
                        padding: '0.4rem 0.65rem',
                        borderRadius: '6px',
                        cursor: 'pointer',
                        transition: 'all 0.2s'
                      }}
                    >📊 바이럴 패턴 분석</button>
                    <button 
                      type="button"
                      onClick={() => setActiveResultTab('scenes')} 
                      className={`result-tab-btn ${activeResultTab === 'scenes' ? 'active' : ''}`}
                      style={{
                        background: activeResultTab === 'scenes' ? 'rgba(251,191,36,0.1)' : 'none',
                        border: 'none',
                        color: activeResultTab === 'scenes' ? '#fbbf24' : 'var(--text-secondary)',
                        fontSize: '0.72rem',
                        fontWeight: 700,
                        padding: '0.4rem 0.65rem',
                        borderRadius: '6px',
                        cursor: 'pointer',
                        transition: 'all 0.2s'
                      }}
                    >✂️ 장면별 지시서</button>
                    <button 
                      type="button"
                      onClick={() => setActiveResultTab('upload')} 
                      className={`result-tab-btn ${activeResultTab === 'upload' ? 'active' : ''}`}
                      style={{
                        background: activeResultTab === 'upload' ? 'rgba(251,191,36,0.1)' : 'none',
                        border: 'none',
                        color: activeResultTab === 'upload' ? '#fbbf24' : 'var(--text-secondary)',
                        fontSize: '0.72rem',
                        fontWeight: 700,
                        padding: '0.4rem 0.65rem',
                        borderRadius: '6px',
                        cursor: 'pointer',
                        transition: 'all 0.2s'
                      }}
                    >📝 업로드 최적화</button>
                  </div>

                  {activeResultTab === 'video' && (
                    <div className="shorts-preview-card">
                      <div className="card-top-row">
                        <span className="shorts-badge" style={{ background: 'rgba(251,191,36,0.15)', color: '#fbbf24' }}>COUPANG SHORTS</span>
                        <span className="duration-badge">{coupangResult.shorts.estimatedDuration || '45s'}</span>
                      </div>

                      <h3 className="shorts-card-title">{coupangResult.shorts.title}</h3>

                      <div className="shorts-hook-box">
                        <span className="hook-label">3초 오프닝 훅 (Opening Hook)</span>
                        <p className="hook-text">"{coupangResult.shorts.hook}"</p>
                      </div>

                      <div className="shorts-script-box">
                        <span className="script-label">나레이션 대본 (Script)</span>
                        <div className="script-content" style={{ maxHeight: '180px' }}>{coupangResult.shorts.script}</div>
                      </div>

                      <div className="shorts-cues-box">
                        <span className="cues-label">비주얼 연출 지시</span>
                        <p className="cues-text">{coupangResult.shorts.visualCues}</p>
                      </div>

                      {/* Action buttons */}
                      <div style={{ display: 'flex', gap: '0.75rem', marginTop: '0.5rem' }}>
                        <button
                          onClick={() => handleCopyScript('coupang_copy', `제목: ${coupangResult.shorts.title}\n훅: ${coupangResult.shorts.hook}\n\n[대본]\n${coupangResult.shorts.script}`)}
                          className={`btn ${copiedId === 'coupang_copy' ? 'copied' : ''}`}
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
                            background: copiedId === 'coupang_copy' ? 'linear-gradient(135deg, #10b981, #059669)' : 'rgba(255,255,255,0.03)',
                            border: copiedId === 'coupang_copy' ? 'none' : '1px solid var(--border-color)',
                            color: 'white',
                            transition: 'all 0.3s ease'
                          }}
                        >
                          {copiedId === 'coupang_copy' ? <Check size={14} /> : <Copy size={14} />}
                          <span>{copiedId === 'coupang_copy' ? '복사 완료!' : '대본 복사'}</span>
                        </button>
                      </div>
                    </div>
                  )}

                  {activeResultTab === 'analysis' && (
                    <div className="analysis-panel" style={{ background: 'rgba(0, 0, 0, 0.2)', border: '1px solid var(--border-color)', padding: '1.2rem', borderRadius: '12px', color: 'var(--text-primary)' }}>
                      <h3 style={{ fontSize: '1rem', color: '#fbbf24', marginTop: 0, marginBottom: '1rem', borderBottom: '1px solid rgba(255,255,255,0.05)', paddingBottom: '0.4rem' }}>📊 바이럴 패턴 분석 & 전략</h3>
                      {coupangResult.analysis ? (
                        <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem', fontSize: '0.82rem' }}>
                          <div><strong>Hook 패턴:</strong> <span style={{ color: 'var(--text-secondary)' }}>{coupangResult.analysis.hookPattern}</span></div>
                          <div><strong>평균 길이:</strong> <span style={{ color: 'var(--text-secondary)' }}>{coupangResult.analysis.avgDuration}</span></div>
                          <div><strong>장면 전환 속도:</strong> <span style={{ color: 'var(--text-secondary)' }}>{coupangResult.analysis.transitionSpeed}</span></div>
                          <div><strong>자막 스타일:</strong> <span style={{ color: 'var(--text-secondary)' }}>{coupangResult.analysis.captionStyle}</span></div>
                          <div><strong>보이스 톤:</strong> <span style={{ color: 'var(--text-secondary)' }}>{coupangResult.analysis.voiceTone}</span></div>
                          <div><strong>BGM 유형:</strong> <span style={{ color: 'var(--text-secondary)' }}>{coupangResult.analysis.bgmType}</span></div>
                          <div><strong>시청 지속률 요인:</strong> <span style={{ color: 'var(--text-secondary)' }}>{coupangResult.analysis.retentionTriggers}</span></div>
                          <div><strong>댓글 유도 요소:</strong> <span style={{ color: 'var(--text-secondary)' }}>{coupangResult.analysis.commentTriggers}</span></div>
                          <div><strong>공유/좋아요 유도:</strong> <span style={{ color: 'var(--text-secondary)' }}>{coupangResult.analysis.likeShareTriggers}</span></div>
                          <div><strong>알고리즘 최적화 전개:</strong> <span style={{ color: 'var(--text-secondary)' }}>{coupangResult.analysis.algorithmStrategy}</span></div>
                          <div style={{ marginTop: '0.5rem', padding: '0.8rem', background: 'rgba(251,191,36,0.05)', border: '1px solid rgba(251,191,36,0.2)', borderRadius: '8px' }}>
                            <strong style={{ color: '#fbbf24' }}>🎯 핵심 제작 전략:</strong>
                            <p style={{ margin: '0.4rem 0 0 0', lineHeight: 1.5, color: 'var(--text-secondary)' }}>{coupangResult.strategy}</p>
                          </div>
                        </div>
                      ) : (
                        <p style={{ color: 'var(--text-secondary)', fontSize: '0.8rem' }}>바이럴 패턴 분석 데이터가 존재하지 않습니다.</p>
                      )}
                    </div>
                  )}

                  {activeResultTab === 'productAnalysis' && (
                    <div className="analysis-panel" style={{ background: 'rgba(0, 0, 0, 0.2)', border: '1px solid var(--border-color)', padding: '1.2rem', borderRadius: '12px', color: 'var(--text-primary)' }}>
                      <h3 style={{ fontSize: '1rem', color: '#fbbf24', marginTop: 0, marginBottom: '1rem', borderBottom: '1px solid rgba(255,255,255,0.05)', paddingBottom: '0.4rem' }}>🛍️ AI 상품 마케팅 분석</h3>
                      {coupangResult.productAnalysis ? (
                        <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem', fontSize: '0.82rem' }}>
                          <div style={{ padding: '0.8rem', background: 'rgba(255,255,255,0.02)', border: '1px solid var(--border-color)', borderRadius: '8px' }}>
                            <strong style={{ color: '#fbbf24', display: 'block', marginBottom: '0.35rem' }}>🎯 핵심 USP (소구점)</strong>
                            <p style={{ margin: 0, color: 'var(--text-secondary)', lineHeight: 1.5 }}>{coupangResult.productAnalysis.usp}</p>
                          </div>
                          <div style={{ padding: '0.8rem', background: 'rgba(255,255,255,0.02)', border: '1px solid var(--border-color)', borderRadius: '8px' }}>
                            <strong style={{ color: '#fbbf24', display: 'block', marginBottom: '0.35rem' }}>👥 주 타겟 오디언스 페르소나</strong>
                            <p style={{ margin: 0, color: 'var(--text-secondary)', lineHeight: 1.5 }}>{coupangResult.productAnalysis.targetAudience}</p>
                          </div>
                          <div style={{ padding: '0.8rem', background: 'rgba(255,255,255,0.02)', border: '1px solid var(--border-color)', borderRadius: '8px' }}>
                            <strong style={{ color: '#fbbf24', display: 'block', marginBottom: '0.35rem' }}>⚠️ 타겟 고객 페인 포인트</strong>
                            <p style={{ margin: 0, color: 'var(--text-secondary)', lineHeight: 1.5 }}>{coupangResult.productAnalysis.painPoints}</p>
                          </div>
                          <div style={{ padding: '0.8rem', background: 'rgba(251,191,36,0.05)', border: '1px solid rgba(251,191,36,0.2)', borderRadius: '8px' }}>
                            <strong style={{ color: '#fbbf24', display: 'block', marginBottom: '0.4rem' }}>🚨 추천 후킹 메시지 앵글</strong>
                            <ul style={{ margin: 0, paddingLeft: '1.2rem', color: 'var(--text-secondary)', lineHeight: 1.6 }}>
                              {coupangResult.productAnalysis.hookPoints?.map((hp, index) => (
                                <li key={index}>{hp}</li>
                              ))}
                            </ul>
                          </div>
                        </div>
                      ) : (
                        <p style={{ color: 'var(--text-secondary)', fontSize: '0.8rem' }}>상품 분석 데이터가 존재하지 않습니다. AI 제작을 시도해 보세요.</p>
                      )}
                    </div>
                  )}

                  {activeResultTab === 'scenes' && (
                    <div className="scenes-timeline-panel" style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
                      <h3 style={{ fontSize: '1rem', color: '#fbbf24', margin: 0, borderBottom: '1px solid rgba(255,255,255,0.05)', paddingBottom: '0.4rem' }}>🎬 장면별 상세 연출안 ({coupangResult.scenes?.length || 0}개 장면)</h3>
                      <div className="scenes-scroll-list" style={{ maxHeight: '420px', overflowY: 'auto', display: 'flex', flexDirection: 'column', gap: '0.8rem', paddingRight: '0.2rem' }}>
                        {coupangResult.scenes && coupangResult.scenes.length > 0 ? (
                          coupangResult.scenes.map((scene, idx) => {
                            const sceneAssets = coupangResult.assets?.filter(a => a.scene_idx === idx) || [];
                            return (
                              <div key={idx} style={{ background: 'rgba(255,255,255,0.02)', border: '1px solid var(--border-color)', borderRadius: '8px', padding: '0.85rem' }}>
                                <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '0.4rem', borderBottom: '1px solid rgba(255,255,255,0.03)', paddingBottom: '0.2rem' }}>
                                  <span style={{ fontSize: '0.75rem', fontWeight: 800, color: '#fbbf24' }}>장면 #{scene.sceneNumber || (idx + 1)}</span>
                                  <span style={{ fontSize: '0.7rem', color: 'rgba(255,255,255,0.4)' }}>키워드: {scene.imageKeyword}</span>
                                </div>
                                <div style={{ fontSize: '0.78rem', marginBottom: '0.3rem' }}>
                                  <strong style={{ color: 'var(--text-primary)' }}>소스:</strong> <span style={{ color: 'var(--text-secondary)' }}>{scene.visualSource}</span>
                                </div>
                                <div style={{ fontSize: '0.78rem', marginBottom: '0.3rem' }}>
                                  <strong style={{ color: 'var(--text-primary)' }}>편집 지시:</strong> <span style={{ color: 'var(--text-secondary)' }}>{scene.editingInstruction}</span>
                                </div>
                                
                                {/* 배치된 B-roll 자원 목록 표시 */}
                                {sceneAssets.length > 0 && (
                                  <div style={{ fontSize: '0.75rem', marginBottom: '0.4rem', background: 'rgba(0,0,0,0.2)', padding: '0.4rem', borderRadius: '6px' }}>
                                    <strong style={{ color: 'var(--text-primary)', display: 'block', marginBottom: '0.2rem' }}>🎬 배치된 B-roll 소스 ({sceneAssets.length}개):</strong>
                                    <div style={{ display: 'flex', flexDirection: 'column', gap: '0.2rem' }}>
                                      {sceneAssets.map((asset, aIdx) => (
                                        <div key={aIdx} style={{ fontSize: '0.7rem', display: 'flex', justifyContent: 'space-between', color: 'var(--text-secondary)' }}>
                                          <span style={{ color: asset.type === 'video' ? '#00d2ff' : '#10b981' }}>
                                            {asset.type === 'video' ? '🎥 동영상' : '🖼️ 이미지'} (슬롯 {asset.slot_idx + 1})
                                          </span>
                                          <span style={{ textOverflow: 'ellipsis', overflow: 'hidden', whiteSpace: 'nowrap', maxWidth: '200px' }} title={asset.url}>
                                            {asset.url.startsWith('http') ? new URL(asset.url).hostname : asset.url}
                                          </span>
                                        </div>
                                      ))}
                                    </div>
                                  </div>
                                )}

                                <div style={{ fontSize: '0.78rem', padding: '0.4rem', background: 'rgba(0,0,0,0.3)', borderRadius: '4px', borderLeft: '3px solid #10b981' }}>
                                  <strong style={{ color: '#10b981' }}>자막 (CapCut):</strong> <span style={{ color: '#ffffff', fontWeight: 600 }}>"{scene.caption}"</span>
                                </div>
                              </div>
                            );
                          })
                        ) : (
                          <p style={{ color: 'var(--text-secondary)', fontSize: '0.8rem' }}>장면별 연출 정보가 존재하지 않습니다.</p>
                        )}
                      </div>
                    </div>
                  )}

                  {activeResultTab === 'upload' && (
                    <div className="upload-optimization-panel" style={{ background: 'rgba(0, 0, 0, 0.2)', border: '1px solid var(--border-color)', padding: '1.2rem', borderRadius: '12px', color: 'var(--text-primary)', display: 'flex', flexDirection: 'column', gap: '1rem' }}>
                      <h3 style={{ fontSize: '1rem', color: '#fbbf24', margin: 0, borderBottom: '1px solid rgba(255,255,255,0.05)', paddingBottom: '0.4rem' }}>📝 업로드 및 최적화 추천</h3>
                      
                      {/* 추천 제목 10선 */}
                      <div>
                        <strong style={{ fontSize: '0.8rem', color: '#fbbf24', display: 'block', marginBottom: '0.4rem' }}>💡 추천 바이럴 제목 10선 (클릭 시 복사)</strong>
                        <div style={{ display: 'flex', flexDirection: 'column', gap: '0.3rem' }}>
                          {coupangResult.titles && coupangResult.titles.length > 0 ? (
                            coupangResult.titles.map((title, idx) => (
                              <div 
                                key={idx} 
                                onClick={() => handleCopyScript(`title_${idx}`, title)}
                                style={{ 
                                  fontSize: '0.78rem', 
                                  padding: '0.4rem 0.6rem', 
                                  background: 'rgba(255,255,255,0.01)', 
                                  border: '1px solid rgba(255,255,255,0.05)', 
                                  borderRadius: '6px', 
                                  cursor: 'pointer',
                                  display: 'flex',
                                  justifyContent: 'space-between',
                                  alignItems: 'center',
                                  transition: 'background 0.2s'
                                }}
                                onMouseEnter={(e) => e.currentTarget.style.background = 'rgba(255,255,255,0.04)'}
                                onMouseLeave={(e) => e.currentTarget.style.background = 'rgba(255,255,255,0.01)'}
                              >
                                <span>{idx + 1}. {title}</span>
                                <span style={{ fontSize: '0.65rem', color: copiedId === `title_${idx}` ? '#10b981' : 'rgba(255,255,255,0.2)' }}>
                                  {copiedId === `title_${idx}` ? '복사됨!' : '클릭 복사'}
                                </span>
                              </div>
                            ))
                          ) : (
                            <p style={{ color: 'var(--text-secondary)', fontSize: '0.8rem' }}>추천 제목 리스트가 없습니다.</p>
                          )}
                        </div>
                      </div>

                      {/* BGM & 예상 반응 & 유지율 포인트 */}
                      <div style={{ fontSize: '0.8rem', display: 'flex', flexDirection: 'column', gap: '0.75rem', borderTop: '1px solid rgba(255,255,255,0.05)', paddingTop: '0.75rem' }}>
                        <div><strong>🎵 추천 BGM:</strong> <span style={{ color: 'var(--text-secondary)' }}>{coupangResult.bgmRecommendation || '비트감이 빠르고 흥미진진한 음악'}</span></div>
                        <div><strong>💬 예상 시청자 반응:</strong> <span style={{ color: 'var(--text-secondary)' }}>{coupangResult.expectedReaction}</span></div>
                        <div><strong>🔥 유지율 상승 포인트:</strong> <span style={{ color: 'var(--text-secondary)' }}>{coupangResult.retentionPoints}</span></div>
                      </div>

                      {/* 업로드 설명란 */}
                      <div style={{ borderTop: '1px solid rgba(255,255,255,0.05)', paddingTop: '0.75rem' }}>
                        <strong style={{ fontSize: '0.8rem', color: '#fbbf24', display: 'block', marginBottom: '0.4rem' }}>📄 유튜브 설명란 템플릿</strong>
                        <textarea
                          readOnly
                          value={`${coupangResult.shorts.title}\n\n${coupangResult.uploadDescription || ''}\n\n🛒 관련 추천 링크: ${coupangResult.product.affiliateLink}\n\n${coupangResult.hashtags ? coupangResult.hashtags.map(t => `#${t}`).join(' ') : '#쇼츠 #유튜브 #자동화'}`}
                          style={{
                            width: '100%',
                            height: '100px',
                            padding: '0.5rem',
                            background: 'rgba(0,0,0,0.3)',
                            border: '1px solid var(--border-color)',
                            borderRadius: '6px',
                            color: 'var(--text-secondary)',
                            fontSize: '0.75rem',
                            fontFamily: 'monospace',
                            resize: 'none',
                            outline: 'none'
                          }}
                        />
                      </div>
                    </div>
                  )}
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

        .generate-submit-btn-coupang {
          width: 100%; 
          padding: 0.9rem; 
          font-weight: 700; 
          border-radius: 10px;
          background: linear-gradient(135deg, #fbbf24, #f59e0b);
          border: none;
          display: flex;
          align-items: center;
          justify-content: center;
          gap: 0.6rem;
          box-shadow: 0 0 15px rgba(251, 191, 36, 0.15);
          color: #000000;
          cursor: pointer;
          transition: all 0.3s;
        }

        .generate-submit-btn-coupang:hover {
          transform: translateY(-1px);
          box-shadow: 0 0 20px rgba(251, 191, 36, 0.25);
        }

        .generate-submit-btn-coupang:disabled {
          opacity: 0.6;
          cursor: not-allowed;
        }

        .coupang-input-field {
          background: rgba(0, 0, 0, 0.3);
          border: 1px solid var(--border-color);
          border-radius: 8px;
          padding: 0.7rem 0.9rem;
          color: white;
          font-size: 0.85rem;
          outline: none;
          transition: border 0.3s;
        }

        .coupang-input-field:focus {
          border-color: rgba(251, 191, 36, 0.5);
        }

        .coupang-select-field {
          background: rgba(0, 0, 0, 0.3);
          border: 1px solid var(--border-color);
          border-radius: 8px;
          padding: 0.7rem 0.9rem;
          color: white;
          font-size: 0.85rem;
          outline: none;
          cursor: pointer;
        }

        .coupang-select-field option {
          background-color: #0f0f15;
          color: white;
        }

        .input-title-label {
          font-size: 0.78rem;
          color: var(--text-secondary);
          font-weight: 600;
        }

        .media-creation-section {
          border-top: 1px solid rgba(255,255,255,0.05);
          padding-top: 1.25rem;
          display: flex;
          flex-direction: column;
          gap: 0.8rem;
        }

        .sub-section-title {
          font-size: 0.9rem;
          font-weight: 700;
          color: white;
          margin: 0 0 0.2rem 0;
        }

        .video-generation-btn {
          width: 100%;
          padding: 0.85rem;
          background: rgba(0, 210, 255, 0.08);
          border: 1px dashed rgba(0, 210, 255, 0.3);
          color: #00d2ff;
          border-radius: 8px;
          font-weight: 700;
          font-size: 0.8rem;
          display: flex;
          align-items: center;
          justify-content: center;
          gap: 0.5rem;
          cursor: pointer;
          transition: all 0.3s;
        }

        .video-generation-btn:hover {
          background: rgba(0, 210, 255, 0.15);
          border-color: #00d2ff;
        }

        .video-player-container {
          background: #000;
          border: 1px solid var(--border-color);
          border-radius: 12px;
          overflow: hidden;
          width: 180px;
          aspect-ratio: 9/16;
          box-shadow: 0 10px 30px rgba(0,0,0,0.5);
        }

        .rendered-video-player {
          width: 100%;
          height: 100%;
          object-fit: cover;
        }

        .youtube-upload-section {
          border-top: 1px solid rgba(255,255,255,0.05);
          padding-top: 1.25rem;
        }

        .yt-credentials-box {
          background: rgba(255, 255, 255, 0.01);
          border: 1px solid var(--border-color);
          border-radius: 8px;
          padding: 1rem;
          margin-top: 0.5rem;
          display: flex;
          flex-direction: column;
          gap: 0.8rem;
        }

        .yt-connect-btn {
          background: linear-gradient(135deg, #fbbf24, #f59e0b);
          color: black;
          border: none;
          font-weight: 750;
          padding: 0.6rem;
          border-radius: 6px;
          font-size: 0.78rem;
          display: flex;
          align-items: center;
          justify-content: center;
          gap: 0.4rem;
          cursor: pointer;
          transition: opacity 0.2s;
        }

        .yt-connect-btn:hover {
          opacity: 0.9;
        }

        .yt-upload-run-btn {
          width: 100%;
          padding: 0.85rem;
          background: linear-gradient(135deg, #ef4444, #dc2626);
          border: none;
          color: white;
          border-radius: 8px;
          font-weight: 700;
          font-size: 0.82rem;
          display: flex;
          align-items: center;
          justify-content: center;
          gap: 0.5rem;
          cursor: pointer;
          box-shadow: 0 4px 12px rgba(239,68,68,0.25);
          transition: all 0.3s;
        }

        .yt-upload-run-btn:hover {
          transform: translateY(-1px);
          box-shadow: 0 6px 16px rgba(239,68,68,0.35);
        }

        .yt-success-box {
          display: flex;
          flex-direction: column;
          align-items: center;
          gap: 0.8rem;
          background: rgba(16, 185, 129, 0.08);
          border: 1px solid rgba(16, 185, 129, 0.2);
          border-radius: 8px;
          padding: 1rem;
        }

        .success-txt {
          font-size: 0.82rem;
          font-weight: 700;
          color: #10b981;
        }

        .yt-visit-btn {
          background: #10b981 !important;
          color: white !important;
          border: none !important;
          font-size: 0.78rem !important;
          padding: 0.5rem 1rem !important;
          border-radius: 6px !important;
          display: flex;
          align-items: center;
          gap: 0.4rem;
        }

        /* Scraped Product Metadata styling */
        .product-scraped-info-card {
          display: flex;
          gap: 1rem;
          padding: 1rem;
          background: rgba(255, 255, 255, 0.02);
          border: 1px solid var(--border-color);
          border-radius: 12px;
          margin-bottom: 1.25rem;
        }

        .product-scraped-img {
          width: 80px;
          height: 80px;
          object-fit: cover;
          border-radius: 8px;
          background: #fff;
          border: 1px solid rgba(255,255,255,0.05);
        }

        .product-scraped-details {
          flex: 1;
          display: flex;
          flex-direction: column;
          justify-content: space-between;
        }

        .product-scraped-title {
          font-size: 0.85rem;
          font-weight: 700;
          color: white;
          margin: 0;
          display: -webkit-box;
          -webkit-line-clamp: 2;
          -webkit-box-orient: vertical;
          overflow: hidden;
          line-height: 1.4;
        }

        .product-scraped-price-row {
          display: flex;
          align-items: center;
          gap: 0.5rem;
          margin: 0.2rem 0;
        }

        .product-scraped-price-label {
          font-size: 0.7rem;
          color: var(--text-secondary);
        }

        .product-scraped-price-val {
          font-size: 0.85rem;
          font-weight: 800;
          color: #fbbf24;
        }

        .product-scraped-link {
          font-size: 0.72rem;
          color: var(--text-secondary);
          display: inline-flex;
          align-items: center;
          gap: 0.2rem;
          text-decoration: none;
          transition: color 0.2s;
        }

        .product-scraped-link:hover {
          color: white;
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
