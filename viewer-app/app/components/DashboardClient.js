'use client';

import { useState, useEffect, useRef } from 'react';
import Link from 'next/link';
import ReactMarkdown from 'react-markdown';
import { 
  ArrowLeft, Play, Loader2, CheckCircle2, AlertCircle, Copy, 
  ExternalLink, Video, ShoppingBag, Sparkles, RefreshCw,
  Bot, Calendar, ChevronRight, Activity, Lightbulb, Target, Route, Flame, 
  User, PenTool, Palette, Camera, Briefcase, Code, Search, Cpu, Check, Clock
} from 'lucide-react';

import DynamicIdentity from './DynamicIdentity';
import AgentConsole from './AgentConsole';

// Helper functions for agent mapping
function getAgentIcon(agentName) {
  switch (agentName.toLowerCase()) {
    case 'secretary':
    case '영숙':
      return <User size={18} color="#a78bfa" />;
    case 'youtube':
      return <Video size={18} color="#f87171" />;
    case 'writer':
      return <PenTool size={18} color="#f472b6" />;
    case 'designer':
      return <Palette size={18} color="#34d399" />;
    case 'instagram':
      return <Camera size={18} color="#fb7185" />;
    case 'business':
    case '현빈':
      return <Briefcase size={18} color="#fbbf24" />;
    case 'developer':
      return <Code size={18} color="#60a5fa" />;
    case 'researcher':
      return <Search size={18} color="#2dd4bf" />;
    default:
      return <Cpu size={18} color="#94a3b8" />;
  }
}

function getAgentKoreanName(agentName) {
  const mapping = {
    secretary: '영숙 (비서)',
    youtube: '유튜브 관리자',
    writer: '콘텐츠 작가',
    designer: 'UI/UX 디자이너',
    instagram: '인스타그램 빌더',
    business: '현빈 (수익화 총괄)',
    developer: '개발자 에이전트',
    researcher: '시장 분석가'
  };
  return mapping[agentName.toLowerCase()] || agentName;
}

function formatTime(isoString) {
  if (!isoString) return '';
  const date = new Date(isoString);
  return date.toLocaleTimeString('ko-KR', { hour: '2-digit', minute: '2-digit' });
}

export default function DashboardClient({
  sessions = [],
  agents = [],
  latestSummary = null,
  direction = null,
  progress = { tasksCompleted: 0, targetTasks: 100, percentage: 0 },
  activeAgents = [],
  recentTasks = []
}) {
  // Autopilot Console states
  const [statusData, setStatusData] = useState({ status: 'idle', message: '자동화 가동 대기 중', progress: 0 });
  const [loadingStatus, setLoadingStatus] = useState(true);
  const [triggering, setTriggering] = useState(false);
  const [copied, setCopied] = useState(false);
  const [showGuide, setShowGuide] = useState(false);
  const timerRef = useRef(null);

  // States for Product-Driven Shorts Mode
  const [mode, setMode] = useState('product-driven'); // Set 'product-driven' as default since it is the focus!
  const [productName, setProductName] = useState('');
  const [productUrl, setProductUrl] = useState('');
  const [coupangLink, setCoupangLink] = useState('');
  const [targetAudience, setTargetAudience] = useState('');
  const [videoStyle, setVideoStyle] = useState('Cinematic');
  const [uploading, setUploading] = useState(false);
  const [uploadResult, setUploadResult] = useState(null);

  // Secondary Dashboard Tabs State
  const [activeTab, setActiveTab] = useState('goals-sessions'); // 'goals-sessions' or 'live-agents'

  // States for Local LLM & VRAM System Monitor
  const [sysStatus, setSysStatus] = useState(null);
  const [loadingSys, setLoadingSys] = useState(true);

  const fetchSysStatus = async () => {
    setLoadingSys(true);
    try {
      const res = await fetch('/api/system-status');
      if (res.ok) {
        const json = await res.json();
        setSysStatus(json);
      }
    } catch (e) {
      console.error('Failed to fetch system status:', e);
    } finally {
      setLoadingSys(false);
    }
  };

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

  // Poll system status every 10s
  useEffect(() => {
    fetchSysStatus();
    const interval = setInterval(fetchSysStatus, 10000);
    return () => clearInterval(interval);
  }, []);

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

  const getStepProgressColor = () => {
    if (statusData.status === 'completed') return '#10b981';
    if (statusData.status === 'error') return '#ef4444';
    return 'var(--accent-color)';
  };

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '2rem' }}>
      
      {/* 🖥️ Local AI Environment & GPU VRAM Monitor Panel */}
      <section className="glass-panel" style={{ padding: '1.25rem 1.5rem', border: '1px solid rgba(96, 165, 250, 0.15)', background: 'linear-gradient(145deg, rgba(255,255,255,0.01) 0%, rgba(96, 165, 250, 0.02) 100%)' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '1rem' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
            <Cpu size={22} color="#60a5fa" style={{ filter: 'drop-shadow(0 0 4px rgba(96,165,250,0.3))' }} />
            <div>
              <h3 style={{ fontSize: '1rem', fontWeight: 700, color: 'white', margin: 0 }}>로컬 AI 환경 및 GPU 상태 모니터</h3>
              <p style={{ color: 'var(--text-secondary)', fontSize: '0.75rem', margin: 0 }}>
                {sysStatus?.gpu?.available ? `${sysStatus.gpu.name} 활성화됨` : 'GPU 정보 감지 중...'}
              </p>
            </div>
          </div>

          <div style={{ display: 'flex', alignItems: 'center', gap: '1rem', flexWrap: 'wrap' }}>
            {/* Ollama Status */}
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.4rem', background: 'rgba(0,0,0,0.2)', padding: '0.35rem 0.75rem', borderRadius: '6px', border: '1px solid var(--border-color)', fontSize: '0.8rem' }}>
              <span style={{ width: '8px', height: '8px', borderRadius: '50%', background: sysStatus?.llmServers?.ollama?.status === 'online' ? '#10b981' : '#64748b' }}></span>
              <span style={{ fontWeight: 600, color: sysStatus?.llmServers?.ollama?.status === 'online' ? 'white' : 'var(--text-secondary)' }}>Ollama (11434)</span>
              {sysStatus?.llmServers?.ollama?.status === 'online' && sysStatus.llmServers.ollama.models?.length > 0 && (
                <span style={{ fontSize: '0.7rem', color: '#10b981', background: 'rgba(16,185,129,0.1)', padding: '0.05rem 0.3rem', borderRadius: '4px', marginLeft: '0.2rem' }}>
                  {sysStatus.llmServers.ollama.models[0]}
                </span>
              )}
            </div>

            {/* LM Studio Status */}
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.4rem', background: 'rgba(0,0,0,0.2)', padding: '0.35rem 0.75rem', borderRadius: '6px', border: '1px solid var(--border-color)', fontSize: '0.8rem' }}>
              <span style={{ width: '8px', height: '8px', borderRadius: '50%', background: sysStatus?.llmServers?.lmStudio?.status === 'online' ? '#10b981' : '#64748b' }}></span>
              <span style={{ fontWeight: 600, color: sysStatus?.llmServers?.lmStudio?.status === 'online' ? 'white' : 'var(--text-secondary)' }}>LM Studio (1234)</span>
            </div>

            {/* Refresh Button */}
            <button 
              onClick={fetchSysStatus} 
              disabled={loadingSys} 
              style={{ background: 'rgba(255,255,255,0.05)', border: '1px solid var(--border-color)', borderRadius: '6px', padding: '0.35rem', color: 'white', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center' }}
              title="상태 새로고침"
            >
              <RefreshCw size={14} className={loadingSys ? 'animate-spin' : ''} />
            </button>
          </div>
        </div>

        {/* VRAM Progress Bar */}
        {sysStatus?.gpu?.available && (
          <div style={{ marginTop: '0.75rem', paddingTop: '0.75rem', borderTop: '1px solid rgba(255,255,255,0.05)', display: 'grid', gridTemplateColumns: '1fr auto', gap: '1.5rem', alignItems: 'center' }}>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '0.25rem', width: '100%' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.75rem' }}>
                <span style={{ color: 'var(--text-secondary)' }}>GPU VRAM 사용량</span>
                <span style={{ color: sysStatus.gpu.vram.percentage > 85 ? '#f87171' : 'white', fontWeight: 600 }}>
                  {sysStatus.gpu.vram.used} MiB / {sysStatus.gpu.vram.total} MiB ({sysStatus.gpu.vram.percentage}%)
                </span>
              </div>
              <div style={{ width: '100%', height: '8px', background: 'rgba(0,0,0,0.3)', borderRadius: '4px', overflow: 'hidden' }}>
                <div style={{ 
                  width: `${sysStatus.gpu.vram.percentage}%`, 
                  height: '100%', 
                  background: sysStatus.gpu.vram.percentage > 85 
                    ? 'linear-gradient(90deg, #f87171 0%, #ef4444 100%)' 
                    : 'linear-gradient(90deg, #60a5fa 0%, #3b82f6 100%)',
                  borderRadius: '4px',
                  transition: 'width 0.4s ease-out'
                }} />
              </div>
            </div>
            
            {/* Recommendations Tooltip Box */}
            <div style={{ background: 'rgba(0,0,0,0.15)', padding: '0.5rem 0.75rem', borderRadius: '6px', border: '1px solid rgba(255,255,255,0.03)', fontSize: '0.7rem', display: 'flex', flexDirection: 'column', gap: '0.1rem', minWidth: '180px' }}>
              <div><span style={{ color: 'var(--text-secondary)' }}>권장 모델 크기:</span> <span style={{ color: '#60a5fa', fontWeight: 600 }}>{sysStatus.recommendations.maxModelSize}</span></div>
              <div><span style={{ color: 'var(--text-secondary)' }}>컨텍스트 한계:</span> <span style={{ color: '#a78bfa', fontWeight: 600 }}>{sysStatus.recommendations.contextLimit} tokens</span></div>
              {sysStatus.recommendations.vramWarning && (
                <div style={{ color: '#f87171', fontWeight: 600, display: 'flex', alignItems: 'center', gap: '0.2rem', marginTop: '0.15rem' }}>
                  ⚠️ VRAM 임계치 초과 (타 GUI 종료 권장)
                </div>
              )}
            </div>
          </div>
        )}
      </section>

      {/* 🚀 Main Autopilot Console Section (Central Focus) */}
      <section className="glass-panel" style={{ padding: '2rem', border: '1px solid rgba(251, 113, 133, 0.15)', background: 'linear-gradient(145deg, rgba(255,255,255,0.01) 0%, rgba(251, 113, 133, 0.02) 100%)' }}>
        
        <header style={{ marginBottom: '2rem', display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '1rem' }}>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '0.25rem' }}>
            <h2 className="gradient-text" style={{ fontSize: '1.75rem', fontWeight: 800, margin: 0, display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
              <Sparkles size={26} color="#fb7185" style={{ filter: 'drop-shadow(0 0 6px rgba(251,113,133,0.3))' }} />
              <span>1클릭 쇼츠 자동 운전 (Autopilot)</span>
            </h2>
            <p style={{ color: 'var(--text-secondary)', fontSize: '0.88rem', margin: 0 }}>
              원하는 상품 정보를 입력하면 기획부터 연출, 비디오 생성, 유튜브 업로드까지 자동 완성합니다.
            </p>
          </div>
          
          {/* Mode Selector Tab Pill */}
          {statusData.status !== 'running' && (
            <div style={{ display: 'inline-flex', gap: '0.25rem', background: 'rgba(0,0,0,0.4)', padding: '0.25rem', borderRadius: '8px', border: '1px solid var(--border-color)' }}>
              <button 
                onClick={() => setMode('product-driven')}
                className={`btn ${mode === 'product-driven' ? '' : 'btn-secondary'}`}
                style={{ padding: '0.4rem 1rem', fontSize: '0.8rem', borderRadius: '6px', border: 'none', cursor: 'pointer' }}
              >
                상품 주도형 (Product-Driven)
              </button>
              <button 
                onClick={() => setMode('archetype')}
                className={`btn ${mode === 'archetype' ? '' : 'btn-secondary'}`}
                style={{ padding: '0.4rem 1rem', fontSize: '0.8rem', borderRadius: '6px', border: 'none', cursor: 'pointer' }}
              >
                자동 추천형 (Content Archetype)
              </button>
            </div>
          )}
        </header>

        <div style={{ display: 'flex', flexDirection: 'column', gap: '2rem', alignItems: 'center' }}>
          
          {/* Inputs Section */}
          {statusData.status !== 'running' && mode === 'product-driven' && (
            <div style={{ width: '100%', maxWidth: '750px', textAlign: 'left', display: 'flex', flexDirection: 'column', gap: '1rem', background: 'rgba(0,0,0,0.15)', padding: '1.5rem', borderRadius: '12px', border: '1px solid var(--border-color)' }}>
              
              <div style={{ display: 'flex', flexDirection: 'column', gap: '0.3rem' }}>
                <label style={{ fontSize: '0.8rem', fontWeight: 600, color: 'var(--text-primary)' }}>상품명 <span style={{ color: '#fb7185' }}>*</span></label>
                <input 
                  type="text"
                  placeholder="예: 정관장 홍삼정 에브리타임"
                  value={productName}
                  onChange={(e) => setProductName(e.target.value)}
                  style={{ padding: '0.7rem 0.9rem', background: 'rgba(0,0,0,0.3)', border: '1px solid var(--border-color)', borderRadius: '6px', color: '#fff', fontSize: '0.9rem', outline: 'none', width: '100%' }}
                />
              </div>

              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem' }}>
                <div style={{ display: 'flex', flexDirection: 'column', gap: '0.3rem' }}>
                  <label style={{ fontSize: '0.8rem', color: 'var(--text-secondary)' }}>쿠팡 파트너스 링크 (선택)</label>
                  <input 
                    type="text"
                    placeholder="https://link.coupang.com/..."
                    value={coupangLink}
                    onChange={(e) => setCoupangLink(e.target.value)}
                    style={{ padding: '0.7rem 0.9rem', background: 'rgba(0,0,0,0.3)', border: '1px solid var(--border-color)', borderRadius: '6px', color: '#fff', fontSize: '0.85rem', outline: 'none' }}
                  />
                </div>
                <div style={{ display: 'flex', flexDirection: 'column', gap: '0.3rem' }}>
                  <label style={{ fontSize: '0.8rem', color: 'var(--text-secondary)' }}>상품 원본 URL (선택)</label>
                  <input 
                    type="text"
                    placeholder="https://..."
                    value={productUrl}
                    onChange={(e) => setProductUrl(e.target.value)}
                    style={{ padding: '0.7rem 0.9rem', background: 'rgba(0,0,0,0.3)', border: '1px solid var(--border-color)', borderRadius: '6px', color: '#fff', fontSize: '0.85rem', outline: 'none' }}
                  />
                </div>
              </div>

              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem' }}>
                <div style={{ display: 'flex', flexDirection: 'column', gap: '0.3rem' }}>
                  <label style={{ fontSize: '0.8rem', color: 'var(--text-secondary)' }}>타겟 고객 (선택)</label>
                  <input 
                    type="text"
                    placeholder="예: 30대 바쁜 직장인, 20대 반려인 등"
                    value={targetAudience}
                    onChange={(e) => setTargetAudience(e.target.value)}
                    style={{ padding: '0.7rem 0.9rem', background: 'rgba(0,0,0,0.3)', border: '1px solid var(--border-color)', borderRadius: '6px', color: '#fff', fontSize: '0.85rem', outline: 'none' }}
                  />
                </div>
                <div style={{ display: 'flex', flexDirection: 'column', gap: '0.3rem' }}>
                  <label style={{ fontSize: '0.8rem', color: 'var(--text-secondary)' }}>비디오 화풍/비주얼 스타일 (선택)</label>
                  <select 
                    value={videoStyle}
                    onChange={(e) => setVideoStyle(e.target.value)}
                    style={{ padding: '0.7rem 0.9rem', background: 'rgba(0,0,0,0.3)', border: '1px solid var(--border-color)', borderRadius: '6px', color: '#fff', fontSize: '0.85rem', outline: 'none', cursor: 'pointer' }}
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

          {/* Autopilot Status Panel */}
          <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '1.25rem', width: '100%', maxWidth: '600px' }}>
            
            {/* Visual Progress Spinner/Icon */}
            <div style={{ position: 'relative', width: '110px', height: '110px', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
              {statusData.status === 'running' ? (
                <div style={{ position: 'absolute', width: '100%', height: '100%', borderRadius: '50%', border: '4px solid rgba(255,255,255,0.05)', borderTopColor: '#fb7185', animation: 'spin 1.5s linear infinite' }} />
              ) : statusData.status === 'completed' ? (
                <div style={{ width: '80px', height: '80px', borderRadius: '50%', background: 'rgba(16,185,129,0.12)', border: '2px solid #10b981', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#10b981' }}>
                  <CheckCircle2 size={42} />
                </div>
              ) : statusData.status === 'error' ? (
                <div style={{ width: '80px', height: '80px', borderRadius: '50%', background: 'rgba(239,68,68,0.12)', border: '2px solid #ef4444', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#ef4444' }}>
                  <AlertCircle size={42} />
                </div>
              ) : (
                <div style={{ width: '80px', height: '80px', borderRadius: '50%', background: 'rgba(255,255,255,0.03)', border: '2px solid rgba(255,255,255,0.08)', display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'var(--text-secondary)' }}>
                  <Play size={32} style={{ marginLeft: '4px' }} />
                </div>
              )}
              
              {statusData.status === 'running' && (
                <span style={{ fontSize: '1.15rem', fontWeight: 'bold', color: 'white' }}>
                  {statusData.progress}%
                </span>
              )}
            </div>

            {/* Status Status Message */}
            <div style={{ textAlign: 'center' }}>
              <h3 style={{ fontSize: '1.2rem', color: 'white', margin: '0 0 0.4rem 0' }}>
                {statusData.status === 'running' ? '완전 자동화 파일럿이 운전 중입니다' :
                 statusData.status === 'completed' ? '🎉 쇼츠 비즈니스 자동화 완료!' :
                 statusData.status === 'error' ? '❌ 가동 중 오류가 발생했습니다' :
                 '자동화 가동 대기 중'}
              </h3>
              <p style={{ color: 'var(--text-secondary)', fontSize: '0.9rem', margin: 0 }}>
                {statusData.message}
              </p>
            </div>

            {/* Real Progress Bar */}
            {(statusData.status === 'running' || statusData.status === 'completed') && (
              <div style={{ width: '100%', height: '6px', background: 'rgba(255,255,255,0.05)', borderRadius: '3px', overflow: 'hidden', marginTop: '0.25rem' }}>
                <div style={{ 
                  width: `${statusData.progress}%`, 
                  height: '100%', 
                  background: `linear-gradient(90deg, #fb7185 0%, ${getStepProgressColor()} 100%)`, 
                  transition: 'width 0.4s ease-out' 
                }} />
              </div>
            )}

          </div>

          {/* Trigger Buttons */}
          {statusData.status !== 'running' && (
            <div style={{ display: 'flex', gap: '1rem', marginTop: '0.5rem' }}>
              <button 
                onClick={handleStartAutopilot}
                disabled={triggering}
                className="btn"
                style={{ padding: '0.75rem 2.2rem', fontWeight: 'bold', display: 'inline-flex', alignItems: 'center', gap: '0.5rem', fontSize: '0.95rem', background: 'linear-gradient(135deg, #a78bfa 0%, #fb7185 100%)', boxShadow: '0 0 15px rgba(251,113,133,0.25)', border: 'none', cursor: 'pointer' }}
              >
                {triggering ? <Loader2 className="animate-spin" size={16} /> : <Play size={16} />}
                {mode === 'product-driven' ? '상품 홍보 쇼츠 생성' : '1클릭 자동 파일럿 시작'}
              </button>
              
              {statusData.status !== 'idle' && (
                <button 
                  onClick={() => { setStatusData({ status: 'idle', message: '자동화 가동 대기 중', progress: 0 }); setUploadResult(null); }}
                  className="btn-secondary btn"
                  style={{ padding: '0.75rem 1.25rem', fontSize: '0.9rem', display: 'flex', alignItems: 'center', gap: '0.4rem', cursor: 'pointer' }}
                >
                  <RefreshCw size={14} /> 콘솔 초기화
                </button>
              )}
            </div>
          )}

        </div>

        {/* 🎬 Completed Autopilot Outputs Grid */}
        {statusData.status === 'completed' && (
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(320px, 1fr))', gap: '1.5rem', marginTop: '2.5rem', borderTop: '1px solid var(--border-color)', paddingTop: '2rem', textAlign: 'left' }}>
            
            {/* Player */}
            <div className="glass-panel" style={{ padding: '1.25rem', display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '1rem', background: 'rgba(0,0,0,0.2)' }}>
              <h4 style={{ fontSize: '0.9rem', margin: 0, color: 'white', alignSelf: 'flex-start', fontWeight: 600 }}>🎬 생성 완료 쇼츠 비디오</h4>
              {statusData.videoUrl ? (
                <video src={statusData.videoUrl} controls style={{ width: '100%', maxWidth: '240px', borderRadius: '12px', border: '4px solid #1c1917', background: '#000' }} />
              ) : (
                <div style={{ height: '200px', display: 'flex', alignItems: 'center', color: 'var(--text-secondary)', fontSize: '0.85rem' }}>비디오를 찾을 수 없습니다.</div>
              )}
            </div>

            {/* Details & Action */}
            <div style={{ display: 'flex', flexDirection: 'column', gap: '1.25rem' }}>
              
              {/* Product-driven mode actions */}
              {statusData.upload_mode === 'product-driven' ? (
                <div className="glass-panel" style={{ padding: '1.25rem', display: 'flex', flexDirection: 'column', gap: '0.75rem', borderLeft: '4px solid #a78bfa', background: 'rgba(0,0,0,0.1)' }}>
                  <h4 style={{ color: 'white', fontSize: '0.9rem', margin: 0, fontWeight: 'bold', display: 'flex', alignItems: 'center', gap: '0.3rem' }}>
                    <Sparkles size={14} color="#fb7185" /> 상품 관련성 검수 로그 (Product Relevance Board)
                  </h4>
                  
                  <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0.75rem', fontSize: '0.8rem' }}>
                    <div style={{ background: 'rgba(0,0,0,0.3)', padding: '0.5rem 0.75rem', borderRadius: '6px', border: '1px solid var(--border-color)' }}>
                      <span style={{ fontSize: '0.7rem', color: 'var(--text-secondary)' }}>상품 관련성 점수 (PRS)</span>
                      <div style={{ fontSize: '1.2rem', fontWeight: 'bold', color: statusData.product_relevance_score >= 85 ? '#10b981' : '#f87171', marginTop: '0.1rem' }}>
                        {statusData.product_relevance_score}점 <span style={{ fontSize: '0.7rem', fontWeight: 'normal', color: 'var(--text-secondary)' }}>/ 85점 이상</span>
                      </div>
                      <div style={{ fontSize: '0.65rem', color: statusData.product_relevance_score >= 90 ? '#10b981' : '#fbbf24', marginTop: '0.15rem' }}>
                        {statusData.product_relevance_score >= 90 ? '✓ 자동 업로드 승인' : '⚠ 수동 승인 필요'}
                      </div>
                    </div>
                    <div style={{ background: 'rgba(0,0,0,0.3)', padding: '0.5rem 0.75rem', borderRadius: '6px', border: '1px solid var(--border-color)' }}>
                      <span style={{ fontSize: '0.7rem', color: 'var(--text-secondary)' }}>종합 품질 점수</span>
                      <div style={{ fontSize: '1.2rem', fontWeight: 'bold', color: statusData.quality_score >= 70 ? '#10b981' : '#f87171', marginTop: '0.1rem' }}>
                        {statusData.quality_score}점 <span style={{ fontSize: '0.7rem', fontWeight: 'normal', color: 'var(--text-secondary)' }}>/ 70점 이상</span>
                      </div>
                    </div>
                  </div>

                  {statusData.youtubeVideoId === 'PENDING_APPROVAL' ? (
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem', marginTop: '0.25rem' }}>
                      <div style={{ fontSize: '0.75rem', color: 'var(--text-secondary)' }}>
                        <span style={{ fontWeight: 600, color: 'white' }}>제목:</span> {statusData.scriptData?.title} #Shorts
                      </div>
                      <button
                        onClick={() => handleApproveAndUpload(statusData.product_relevance_score < 90)}
                        disabled={uploading}
                        className="btn"
                        style={{ 
                          width: '100%', 
                          padding: '0.6rem', 
                          fontWeight: 'bold', 
                          fontSize: '0.85rem', 
                          display: 'flex', 
                          alignItems: 'center', 
                          justifyContent: 'center', 
                          gap: '0.4rem',
                          background: statusData.product_relevance_score >= 90 ? 'linear-gradient(135deg, #10b981 0%, #059669 100%)' : 'linear-gradient(135deg, #f59e0b 0%, #d97706 100%)',
                          border: 'none',
                          cursor: 'pointer'
                        }}
                      >
                        {uploading ? <Loader2 className="animate-spin" size={14} /> : <Video size={14} />}
                        {statusData.product_relevance_score >= 90 ? '자동 승인 및 업로드 실행' : '수동 검수 승인 및 업로드 실행'}
                      </button>
                    </div>
                  ) : (
                    <div style={{ fontSize: '0.8rem', color: 'white' }}>
                      <div style={{ color: '#10b981', fontWeight: 'bold', display: 'flex', alignItems: 'center', gap: '0.25rem', marginBottom: '0.25rem' }}>
                        <CheckCircle2 size={14} /> {statusData.uploadMessage}
                      </div>
                      {statusData.youtubeVideoId && statusData.youtubeVideoId !== 'MOCK_VIDEO_ID' && (
                        <a href="https://studio.youtube.com/" target="_blank" rel="noreferrer" style={{ color: '#38bdf8', fontSize: '0.75rem', display: 'inline-flex', alignItems: 'center', gap: '0.2rem' }}>
                          YouTube 스토어에서 확인 <ExternalLink size={10} />
                        </a>
                      )}
                    </div>
                  )}
                </div>
              ) : (
                /* General Autopilot links */
                <>
                  <div className="glass-panel" style={{ padding: '1.25rem', display: 'flex', flexDirection: 'column', gap: '0.5rem', borderLeft: '4px solid #f87171', background: 'rgba(0,0,0,0.1)', fontSize: '0.8rem' }}>
                    <div style={{ color: '#f87171', fontWeight: 'bold', display: 'flex', alignItems: 'center', gap: '0.3rem' }}>
                      <Video size={14} /> 유튜브 자동 업로드 결과
                    </div>
                    <div>{statusData.uploadMessage}</div>
                  </div>

                  <div className="glass-panel" style={{ padding: '1.25rem', display: 'flex', flexDirection: 'column', gap: '0.5rem', borderLeft: '4px solid #fbbf24', background: 'rgba(0,0,0,0.1)', fontSize: '0.8rem' }}>
                    <div style={{ color: '#fbbf24', fontWeight: 'bold', display: 'flex', alignItems: 'center', gap: '0.3rem' }}>
                      <ShoppingBag size={14} /> 고정 댓글 쇼핑 링크
                    </div>
                    <div style={{ position: 'relative', marginTop: '0.25rem' }}>
                      <textarea 
                        readOnly
                        rows={2}
                        value={statusData.commentText || ''}
                        style={{ width: '100%', padding: '0.5rem', paddingRight: '2rem', background: 'rgba(0,0,0,0.3)', border: '1px solid var(--border-color)', borderRadius: '6px', color: '#fff', fontSize: '0.75rem', resize: 'none', outline: 'none' }}
                      />
                      <button
                        onClick={() => handleCopyLink(statusData.commentText)}
                        style={{ position: 'absolute', right: '6px', top: '6px', background: 'rgba(255,255,255,0.05)', border: '1px solid var(--border-color)', borderRadius: '4px', padding: '0.2rem', color: 'white', cursor: 'pointer' }}
                      >
                        {copied ? <CheckCircle2 size={12} color="#10b981" /> : <Copy size={12} />}
                      </button>
                    </div>
                  </div>
                </>
              )}

            </div>

          </div>
        )}

        {/* Accordion Guide */}
        <div style={{ marginTop: '1.5rem', borderTop: '1px solid rgba(255,255,255,0.06)', paddingTop: '1rem', textAlign: 'left' }}>
          <button 
            onClick={() => setShowGuide(!showGuide)}
            style={{ width: '100%', background: 'none', border: 'none', color: 'var(--text-secondary)', display: 'flex', justifyContent: 'space-between', alignItems: 'center', cursor: 'pointer', fontSize: '0.82rem', padding: '0.25rem 0' }}
          >
            <span>💡 고화질 스톡 API 연동 및 AI 드로잉 퀄리티 가이드</span>
            <span>{showGuide ? '접기 ▲' : '펼치기 ▼'}</span>
          </button>
          {showGuide && (
            <div style={{ marginTop: '0.75rem', fontSize: '0.8rem', color: 'var(--text-secondary)', lineHeight: '1.6', background: 'rgba(0,0,0,0.1)', padding: '1rem', borderRadius: '8px' }}>
              <strong>1. 고화질 스톡 API 등록 (권장):</strong><br />
              Pexels 무료 키를 발급받아 <code>.env.local</code> 파일 내에 <code>PEXELS_API_KEY=키값</code> 형태로 입력해 주시면, 생성 실패 시 더욱 어울리는 고품질 스톡 사진이 연동됩니다.<br /><br />
              <strong>2. 기괴함 방지 룰 탑재:</strong><br />
              현재 자동 생성 룰에는 뒤틀린 신체 구조 및 불필요한 이미지 내 워터마크/글자가 박히지 않도록 자동 보정 프로필이 내장되어 있습니다.
            </div>
          )}
        </div>

      </section>

      {/* 📂 Secondary Dashboard Panels (Categorized Tabs) */}
      <section style={{ display: 'flex', flexDirection: 'column', gap: '1.25rem', marginTop: '1rem' }}>
        
        {/* Tab Selectors */}
        <div style={{ display: 'flex', gap: '1rem', borderBottom: '1px solid var(--border-color)', paddingBottom: '0.5rem' }}>
          <button 
            onClick={() => setActiveTab('goals-sessions')}
            className="btn-secondary btn"
            style={{ 
              background: activeTab === 'goals-sessions' ? 'rgba(255,255,255,0.04)' : 'transparent', 
              borderColor: activeTab === 'goals-sessions' ? 'rgba(255,255,255,0.15)' : 'transparent',
              fontWeight: activeTab === 'goals-sessions' ? 'bold' : 'normal',
              color: activeTab === 'goals-sessions' ? '#fff' : 'var(--text-secondary)',
              fontSize: '0.9rem',
              padding: '0.5rem 1.25rem',
              borderRadius: '6px',
              border: '1px solid transparent',
              cursor: 'pointer'
            }}
          >
            📊 회사 방향성 & 세션 리스트 ({sessions.length})
          </button>
          <button 
            onClick={() => setActiveTab('live-agents')}
            className="btn-secondary btn"
            style={{ 
              background: activeTab === 'live-agents' ? 'rgba(255,255,255,0.04)' : 'transparent', 
              borderColor: activeTab === 'live-agents' ? 'rgba(255,255,255,0.15)' : 'transparent',
              fontWeight: activeTab === 'live-agents' ? 'bold' : 'normal',
              color: activeTab === 'live-agents' ? '#fff' : 'var(--text-secondary)',
              fontSize: '0.9rem',
              padding: '0.5rem 1.25rem',
              borderRadius: '6px',
              border: '1px solid transparent',
              cursor: 'pointer'
            }}
          >
            🤖 에이전트 실시간 관제판 ({activeAgents.length})
          </button>
        </div>

        {/* Tab Content 1: Goals & Sessions */}
        {activeTab === 'goals-sessions' && (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '2rem', animation: 'fadeIn 0.2s ease-out' }}>
            
            {/* Monetization Goal Progress */}
            <div style={{ background: 'rgba(255,255,255,0.02)', borderRadius: '12px', padding: '1.25rem', border: '1px solid var(--border-color)' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '0.5rem', fontSize: '0.85rem', color: 'var(--text-secondary)' }}>
                <span style={{ display: 'flex', alignItems: 'center', gap: '0.4rem', color: 'white', fontWeight: 600 }}>
                  <Flame size={16} color="#f97316" /> 수익화 목표 (Monetization Progress)
                </span>
                <span>완료된 태스크: {progress.tasksCompleted} / {progress.targetTasks}개</span>
              </div>
              <div style={{ width: '100%', height: '14px', background: 'rgba(0,0,0,0.4)', borderRadius: '7px', overflow: 'hidden', position: 'relative' }}>
                <div style={{ 
                  width: `${progress.percentage}%`, 
                  height: '100%', 
                  background: 'linear-gradient(90deg, #f59e0b 0%, #f97316 100%)',
                  boxShadow: '0 0 6px rgba(249, 115, 22, 0.4)'
                }} />
              </div>
            </div>

            {/* Direction & Goals */}
            {direction && (
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(320px, 1fr))', gap: '1.5rem' }}>
                <div className="glass-panel" style={{ padding: '1.5rem', background: 'rgba(0,0,0,0.1)' }}>
                  <h3 style={{ fontSize: '1rem', color: '#fb7185', marginBottom: '0.75rem', display: 'flex', alignItems: 'center', gap: '0.4rem', borderBottom: '1px solid rgba(255,255,255,0.06)', paddingBottom: '0.4rem', fontWeight: 'bold', margin: 0 }}>
                    <Target size={16} /> 공동 목표 (Goals)
                  </h3>
                  <div className="markdown-content" style={{ fontSize: '0.88rem' }}>
                    <ReactMarkdown>{direction.goals}</ReactMarkdown>
                  </div>
                </div>
                <div className="glass-panel" style={{ padding: '1.5rem', background: 'rgba(0,0,0,0.1)' }}>
                  <h3 style={{ fontSize: '1rem', color: '#38bdf8', marginBottom: '0.75rem', display: 'flex', alignItems: 'center', gap: '0.4rem', borderBottom: '1px solid rgba(255,255,255,0.06)', paddingBottom: '0.4rem', fontWeight: 'bold', margin: 0 }}>
                    <Route size={16} /> 최근 주요 의사결정 (Decisions)
                  </h3>
                  <div className="markdown-content" style={{ fontSize: '0.88rem', maxHeight: '250px', overflowY: 'auto' }}>
                    <ReactMarkdown>{direction.decisions}</ReactMarkdown>
                  </div>
                </div>
              </div>
            )}

            {/* Realtime Summary */}
            {latestSummary && (
              <div className="glass-panel" style={{ padding: '1.5rem', border: '1px solid rgba(167, 139, 250, 0.2)', background: 'linear-gradient(145deg, rgba(255,255,255,0.01) 0%, rgba(167, 139, 250, 0.03) 100%)' }}>
                <h3 style={{ fontSize: '1rem', color: 'var(--accent-secondary)', marginBottom: '0.75rem', display: 'flex', alignItems: 'center', gap: '0.4rem', borderBottom: '1px solid rgba(255,255,255,0.06)', paddingBottom: '0.4rem', fontWeight: 'bold', margin: 0 }}>
                  <Lightbulb size={16} /> 최신 세션 요약 ({latestSummary.session})
                </h3>
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(300px, 1fr))', gap: '1.5rem', fontSize: '0.88rem' }}>
                  <div>
                    <div style={{ fontWeight: 600, color: 'white', marginBottom: '0.4rem' }}>🎯 현재 방향성</div>
                    <div className="markdown-content"><ReactMarkdown>{latestSummary.summary}</ReactMarkdown></div>
                  </div>
                  <div>
                    <div style={{ fontWeight: 600, color: 'white', marginBottom: '0.4rem' }}>📋 에이전트 역할 분배</div>
                    <div className="markdown-content"><ReactMarkdown>{latestSummary.tasks}</ReactMarkdown></div>
                  </div>
                </div>
                <div style={{ marginTop: '1rem', textAlign: 'right' }}>
                  <Link href={`/sessions/${latestSummary.session}`} className="btn" style={{ padding: '0.4rem 1rem', fontSize: '0.8rem' }}>
                    이 세션 세부 결과물 확인하기
                  </Link>
                </div>
              </div>
            )}

            {/* Sessions history list */}
            <div>
              <h3 style={{ fontSize: '1.05rem', color: 'white', marginBottom: '1rem', display: 'flex', alignItems: 'center', gap: '0.4rem', fontWeight: 'bold' }}>
                <Calendar size={18} /> 최근 진행된 작업 세션
              </h3>
              {sessions.length === 0 ? (
                <div className="glass-panel" style={{ padding: '2rem', textAlign: 'center', color: 'var(--text-secondary)' }}>아직 진행된 세션이 없습니다.</div>
              ) : (
                <div className="grid">
                  {sessions.slice(0, 6).map(session => (
                    <div key={session} className="glass-panel card" style={{ padding: '1rem', background: 'rgba(255,255,255,0.01)', border: '1px solid rgba(255,255,255,0.03)' }}>
                      <div className="card-title" style={{ fontSize: '1rem' }}>{session}</div>
                      <div className="card-desc" style={{ fontSize: '0.8rem', flex: 1 }}>생성된 에이전트들의 작업 산출물 문서(.md)를 확인합니다.</div>
                      <div style={{ display: 'flex', gap: '0.5rem', marginTop: '0.5rem' }}>
                        <Link href={`/sessions/${session}`} className="btn" style={{ padding: '0.3rem 0.6rem', fontSize: '0.75rem' }}>요약 & 로드맵</Link>
                        <Link href={`/sessions/${session}?tab=documents`} className="btn btn-secondary" style={{ padding: '0.3rem 0.6rem', fontSize: '0.75rem' }}>문서 보기</Link>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>

          </div>
        )}

        {/* Tab Content 2: Live Agents */}
        {activeTab === 'live-agents' && (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '2rem', animation: 'fadeIn 0.2s ease-out' }}>
            
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(320px, 1fr))', gap: '1.5rem' }}>
              
              {/* Active Agents online list */}
              <div className="glass-panel" style={{ padding: '1.5rem', background: 'rgba(0,0,0,0.1)' }}>
                <h3 style={{ fontSize: '1rem', color: '#10b981', marginBottom: '0.75rem', display: 'flex', alignItems: 'center', gap: '0.4rem', borderBottom: '1px solid rgba(255,255,255,0.06)', paddingBottom: '0.4rem', fontWeight: 'bold', margin: 0 }}>
                  <Bot size={16} /> 실시간 에이전트 현황 (Live Agents)
                </h3>
                <div className="agent-grid" style={{ marginTop: '0.75rem' }}>
                  {activeAgents.length === 0 ? (
                    <div style={{ gridColumn: '1 / -1', padding: '1rem', color: 'var(--text-secondary)', fontSize: '0.85rem' }}>온라인 상태인 에이전트가 없습니다.</div>
                  ) : (
                    activeAgents.map(agent => (
                      <div key={agent.name} className="agent-item" style={{ padding: '0.75rem', gap: '0.5rem' }}>
                        <div style={{ display: 'flex', justifyContent: 'space-between', width: '100%', alignItems: 'center' }}>
                          <span className="pulse-dot"></span>
                          <span style={{ fontSize: '0.65rem', color: 'var(--text-secondary)', display: 'flex', alignItems: 'center', gap: '0.2rem' }}>
                            <Clock size={8} /> {formatTime(agent.activatedAt)}
                          </span>
                        </div>
                        <div style={{ background: 'rgba(255,255,255,0.03)', borderRadius: '50%', padding: '0.5rem', border: '1px solid rgba(255,255,255,0.05)' }}>
                          {getAgentIcon(agent.name)}
                        </div>
                        <div style={{ fontWeight: 600, fontSize: '0.8rem' }}>{getAgentKoreanName(agent.name)}</div>
                        <div style={{ fontSize: '0.65rem', color: '#10b981', background: 'rgba(16, 185, 129, 0.08)', padding: '0.1rem 0.3rem', borderRadius: '4px' }}>ONLINE</div>
                      </div>
                    ))
                  )}
                </div>
              </div>

              {/* Task Stream logs */}
              <div className="glass-panel" style={{ padding: '1.5rem', background: 'rgba(0,0,0,0.1)' }}>
                <h3 style={{ fontSize: '1rem', color: '#60a5fa', marginBottom: '0.75rem', display: 'flex', alignItems: 'center', gap: '0.4rem', borderBottom: '1px solid rgba(255,255,255,0.06)', paddingBottom: '0.4rem', fontWeight: 'bold', margin: 0 }}>
                  <Activity size={16} /> 최근 완료 태스크 로그 (Task Stream)
                </h3>
                <div className="task-list" style={{ marginTop: '0.75rem' }}>
                  {recentTasks.length === 0 ? (
                    <div style={{ padding: '1rem', color: 'var(--text-secondary)', fontSize: '0.85rem' }}>최근 처리된 태스크 내역이 없습니다.</div>
                  ) : (
                    recentTasks.map(task => (
                      <div key={task.id} className="task-item" style={{ padding: '0.75rem' }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', flex: 1, minWidth: 0 }}>
                          <div style={{ background: 'rgba(255,255,255,0.03)', borderRadius: '50%', padding: '0.35rem', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                            {getAgentIcon(task.agentIds?.[0] || 'unknown')}
                          </div>
                          <div style={{ minWidth: 0, flex: 1 }}>
                            <div style={{ fontWeight: 500, fontSize: '0.8rem', color: 'var(--text-primary)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{task.title}</div>
                            <div style={{ fontSize: '0.7rem', color: 'var(--text-secondary)' }}>{getAgentKoreanName(task.agentIds?.[0] || '알수없음')}</div>
                          </div>
                        </div>
                        <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'flex-end', gap: '0.15rem' }}>
                          <span style={{ fontSize: '0.65rem', color: '#10b981', background: 'rgba(16, 185, 129, 0.08)', padding: '0.1rem 0.3rem', borderRadius: '4px', fontWeight: 500 }}>DONE</span>
                          <span style={{ fontSize: '0.65rem', color: 'var(--text-secondary)', display: 'inline-flex', alignItems: 'center', gap: '0.2rem' }}><Clock size={8} /> {formatTime(task.completedAt)}</span>
                        </div>
                      </div>
                    ))
                  )}
                </div>
              </div>

            </div>

            {/* Interactive Console and Identity */}
            <DynamicIdentity />
            <AgentConsole />

          </div>
        )}

      </section>

      {/* Global CSS spinner/fade rules */}
      <style jsx global>{`
        @keyframes spin {
          from { transform: rotate(0deg); }
          to { transform: rotate(360deg); }
        }
        @keyframes fadeIn {
          from { opacity: 0; transform: translateY(4px); }
          to { opacity: 1; transform: translateY(0); }
        }
      `}</style>

    </div>
  );
}
