'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import { 
  ArrowLeft, Edit3, Film, Play, Download, ExternalLink, 
  CheckCircle, Loader2, Sparkles, AlertCircle, ShoppingBag, X, RefreshCw
} from 'lucide-react';

export default function ArchivePage() {
  const [history, setHistory] = useState([]);
  const [loading, setLoading] = useState(true);
  const [editingItem, setEditingItem] = useState(null); // Item being edited
  const [editCuts, setEditCuts] = useState([]); // Edited cuts data
  const [reRendering, setReRendering] = useState(false);
  const [generatingCutIdx, setGeneratingCutIdx] = useState(null); // Loading index for AI generation
  const [errorMessage, setErrorMessage] = useState('');

  // Fetch history list
  const fetchHistory = async () => {
    try {
      const res = await fetch('/api/archive');
      if (res.ok) {
        const data = await res.json();
        setHistory(data);
      }
    } catch (e) {
      console.error('Failed to fetch video archive history:', e);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchHistory();
  }, []);

  // Open edit modal
  const handleOpenEdit = (item) => {
    setEditingItem(item);
    // Deep clone cuts so we don't modify state prematurely
    const cutsClone = JSON.parse(JSON.stringify(item.scriptData?.cuts || []));
    setEditCuts(cutsClone);
    setErrorMessage('');
  };

  // Close edit modal
  const handleCloseEdit = () => {
    if (reRendering) return; // Prevent closing while processing
    setEditingItem(null);
    setEditCuts([]);
    setErrorMessage('');
  };

  // Handle cut field changes
  const handleCutChange = (index, field, value) => {
    const updated = [...editCuts];
    updated[index][field] = value;
    setEditCuts(updated);
  };

  // Trigger individual cut AI image generation
  const handleGenerateAiImage = async (index) => {
    if (generatingCutIdx !== null || reRendering) return;
    
    setGeneratingCutIdx(index);
    setErrorMessage('');
    
    try {
      const prompt = editCuts[index].prompt;
      if (!prompt || prompt.trim() === '') {
        throw new Error('AI 이미지를 생성하기 위해 프롬프트를 입력해 주세요.');
      }

      const res = await fetch('/api/archive', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          action: 'generate_image',
          id: editingItem.id,
          cutIndex: index,
          prompt: prompt
        })
      });

      if (!res.ok) {
        const errData = await res.json();
        throw new Error(errData.error || 'AI 이미지 생성에 실패했습니다.');
      }

      const data = await res.json();
      
      // Update image path with the newly generated image url
      const updated = [...editCuts];
      // Convert physical path to web path for UI display if needed, but store the absolute path in image_path for python
      updated[index].image_path = data.imagePath;
      updated[index].imageUrl = data.imageUrl; // Temporary browser display
      setEditCuts(updated);
      
      alert(`[Cut ${index + 1}] AI 이미지 재생성이 완료되었습니다.`);
    } catch (e) {
      setErrorMessage(e.message);
    } finally {
      setGeneratingCutIdx(null);
    }
  };

  // Trigger re-rendering of the video using edited cuts
  const handleReRenderVideo = async () => {
    if (reRendering) return;
    
    setReRendering(true);
    setErrorMessage('');

    try {
      const res = await fetch('/api/archive', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          action: 're_render',
          id: editingItem.id,
          cuts: editCuts
        })
      });

      if (!res.ok) {
        const errData = await res.json();
        throw new Error(errData.error || '비디오 재인코딩 과정에서 오류가 발생했습니다.');
      }

      const data = await res.json();
      
      // Update local history array
      setHistory(prev => prev.map(item => item.id === editingItem.id ? data.item : item));
      
      alert('🎉 비디오 재인코딩이 성공적으로 완료되었습니다! 변경 사항이 적용되었습니다.');
      handleCloseEdit();
    } catch (e) {
      setErrorMessage(e.message);
    } finally {
      setReRendering(false);
    }
  };

  return (
    <div className="container" style={{ padding: '2rem', maxWidth: '1200px' }}>
      
      {/* Header */}
      <header style={{ marginBottom: '2.5rem', display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
        <Link href="/" style={{ display: 'inline-flex', alignItems: 'center', gap: '0.5rem', color: 'var(--text-primary)', width: 'fit-content' }} className="btn-secondary btn">
          <ArrowLeft size={16} /> 대시보드로 돌아가기
        </Link>
        <h1 className="title gradient-text" style={{ fontSize: '2.2rem', margin: 0, display: 'flex', alignItems: 'center', gap: '0.6rem' }}>
          <Film size={30} color="#a78bfa" style={{ filter: 'drop-shadow(0 0 8px rgba(167,139,250,0.4))' }} />
          <span>시네마틱 쇼츠 영상 보관함 (Archive)</span>
        </h1>
        <p style={{ color: 'var(--text-secondary)', margin: 0, fontSize: '0.95rem' }}>
          1클릭 자동 파일럿 시스템이 생성한 쇼츠 영상의 역사입니다. 각 영상의 자막과 이미지를 자유롭게 수정하고 실시간으로 다시 인코딩해 완성도를 끌어올릴 수 있습니다.
        </p>
      </header>

      {/* Main Grid List */}
      {loading ? (
        <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '1rem', padding: '5rem 0' }}>
          <Loader2 className="animate-spin" size={40} color="var(--accent-color)" />
          <p style={{ color: 'var(--text-secondary)' }}>아카이브 데이터를 로딩 중입니다...</p>
        </div>
      ) : history.length === 0 ? (
        <div className="glass-panel" style={{ padding: '5rem 2rem', textAlign: 'center', display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '1.5rem' }}>
          <Film size={50} style={{ color: 'rgba(255,255,255,0.1)' }} />
          <div style={{ maxWidth: '400px' }}>
            <h3 style={{ fontSize: '1.2rem', color: '#fff', marginBottom: '0.5rem' }}>보관된 영상이 없습니다</h3>
            <p style={{ color: 'var(--text-secondary)', fontSize: '0.9rem', lineHeight: '1.6', margin: 0 }}>
              아직 오토파일럿이 한 번도 기동되지 않았거나 보관 파일이 비어 있습니다. 자동 운전을 시작하여 첫 비디오를 만들어보세요!
            </p>
          </div>
          <Link href="/autopilot" className="btn" style={{ padding: '0.7rem 2rem', background: 'linear-gradient(135deg, #a78bfa 0%, #fb7185 100%)', fontWeight: 'bold' }}>
            🚀 1클릭 자동 운전 하러 가기
          </Link>
        </div>
      ) : (
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(360px, 1fr))', gap: '2rem' }}>
          {history.map((item) => {
            // Pick first cut image for thumbnail fallback
            const firstCut = item.scriptData?.cuts?.[0];
            const timestampDate = new Date(parseInt(item.id)).toLocaleString('ko-KR');

            return (
              <div key={item.id} className="glass-panel" style={{ display: 'flex', flexDirection: 'column', overflow: 'hidden', padding: '1rem', background: 'linear-gradient(180deg, rgba(255,255,255,0.01) 0%, rgba(255,255,255,0.03) 100%)', border: '1px solid rgba(255,255,255,0.06)' }}>
                
                {/* Visual Video Container */}
                <div style={{ position: 'relative', width: '100%', aspectRatio: '9/16', maxHeight: '420px', borderRadius: '8px', overflow: 'hidden', background: '#000', border: '1px solid rgba(255,255,255,0.05)', display: 'flex', justifyContent: 'center' }}>
                  {item.videoUrl ? (
                    <video src={item.videoUrl} controls style={{ height: '100%', objectFit: 'contain' }} />
                  ) : (
                    <div style={{ display: 'flex', alignItems: 'center', color: 'var(--text-secondary)' }}>비디오 재생 불가</div>
                  )}
                </div>

                {/* Video Info Details */}
                <div style={{ padding: '1rem 0.25rem 0.25rem 0.25rem', display: 'flex', flexDirection: 'column', gap: '0.8rem', flexGrow: 1 }}>
                  
                  <div>
                    <span style={{ fontSize: '0.75rem', color: '#fb7185', fontWeight: 'bold', background: 'rgba(251,113,133,0.1)', padding: '0.2rem 0.5rem', borderRadius: '4px' }}>
                      {item.productTitle}
                    </span>
                    <h3 style={{ fontSize: '1.05rem', color: 'white', marginTop: '0.5rem', marginBottom: '0.25rem', fontWeight: 600 }}>
                      {item.scriptData?.title || '제목 없음'}
                    </h3>
                    <div style={{ fontSize: '0.75rem', color: 'var(--text-secondary)' }}>
                      생성일: {timestampDate}
                    </div>
                  </div>

                  {/* Diversity & Revenue Metrics Grid */}
                  <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0.75rem', background: 'rgba(255,255,255,0.02)', padding: '1rem', borderRadius: '10px', border: '1px solid rgba(255,255,255,0.06)', fontSize: '0.8rem', backdropFilter: 'blur(10px)' }}>
                    <div>
                      <span style={{ color: 'var(--text-secondary)', display: 'block', fontSize: '0.7rem', marginBottom: '0.15rem' }}>🧬 사용한 DNA</span>
                      <span style={{ color: '#a78bfa', fontWeight: 700 }}>{item.style_dna || 'Motivation'}</span>
                    </div>
                    <div>
                      <span style={{ color: 'var(--text-secondary)', display: 'block', fontSize: '0.7rem', marginBottom: '0.15rem' }}>🎨 사용한 스타일</span>
                      <span style={{ color: '#fff', fontWeight: 600 }}>{item.used_style || 'Cinematic'}</span>
                    </div>
                    <div>
                      <span style={{ color: 'var(--text-secondary)', display: 'block', fontSize: '0.7rem', marginBottom: '0.15rem' }}>⚡ 후킹 유형</span>
                      <span style={{ color: '#60a5fa', fontWeight: 600 }}>{item.hook_type || '호기심형'}</span>
                    </div>
                    <div>
                      <span style={{ color: 'var(--text-secondary)', display: 'block', fontSize: '0.7rem', marginBottom: '0.15rem' }}>💰 Revenue Score</span>
                      <span style={{ color: '#10b981', fontWeight: 700 }}>{item.postUploadAnalysis?.money_score || item.preUploadAnalysis?.scores?.hookStrength || 78}점</span>
                    </div>
                    <div>
                      <span style={{ color: 'var(--text-secondary)', display: 'block', fontSize: '0.7rem', marginBottom: '0.15rem' }}>📊 Diversity Score</span>
                      <span style={{ color: (item.diversity_score || 80) >= 70 ? '#10b981' : '#fb7185', fontWeight: 700 }}>
                        {item.diversity_score || 80}%
                      </span>
                    </div>
                    <div>
                      <span style={{ color: 'var(--text-secondary)', display: 'block', fontSize: '0.7rem', marginBottom: '0.15rem' }}>🔍 Similarity Score</span>
                      <span style={{ color: (item.similarity_score || 20) < 30 ? '#10b981' : '#fb7185', fontWeight: 700 }}>
                        {item.similarity_score || 20}%
                      </span>
                    </div>
                    <div style={{ gridColumn: 'span 2', borderTop: '1px solid rgba(255,255,255,0.05)', paddingTop: '0.5rem', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                      <span style={{ color: 'var(--text-secondary)', fontSize: '0.7rem' }}>🧠 적용된 DNA 유형</span>
                      <span style={{ color: item.is_experiment ? '#a78bfa' : '#34d399', fontWeight: 'bold', fontSize: '0.75rem', background: item.is_experiment ? 'rgba(167,139,250,0.1)' : 'rgba(52,211,153,0.1)', padding: '0.1rem 0.4rem', borderRadius: '4px' }}>
                        {item.is_experiment ? '🧪 자가 실험 DNA' : '🔥 Revenue DNA'}
                      </span>
                    </div>
                  </div>

                  {/* DNA Trace Info */}
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '0.4rem', background: 'rgba(0,0,0,0.15)', padding: '0.75rem', borderRadius: '8px', border: '1px solid rgba(255,255,255,0.04)', fontSize: '0.75rem' }}>
                    <div style={{ fontWeight: 'bold', color: 'white', borderBottom: '1px solid rgba(255,255,255,0.05)', paddingBottom: '0.25rem', marginBottom: '0.25rem', fontSize: '0.7rem', color: '#a78bfa' }}>🧬 DNA Trace (모델 대본 프롬프트 반영)</div>
                    <div>
                      <span style={{ color: '#fbbf24', fontWeight: 600 }}>성공 DNA (50%):</span>{' '}
                      <span style={{ color: 'var(--text-secondary)' }}>
                        {item.used_success_dna && item.used_success_dna.length > 0
                          ? item.used_success_dna.map(x => x.title).join(', ')
                          : '없음'}
                      </span>
                    </div>
                    <div>
                      <span style={{ color: '#f87171', fontWeight: 600 }}>실패 DNA (회피 15%):</span>{' '}
                      <span style={{ color: 'var(--text-secondary)' }}>
                        {item.used_failure_dna && item.used_failure_dna.length > 0
                          ? item.used_failure_dna.map(x => x.title).join(', ')
                          : '없음'}
                      </span>
                    </div>
                    <div>
                      <span style={{ color: '#34d399', fontWeight: 600 }}>수익 DNA (25%):</span>{' '}
                      <span style={{ color: 'var(--text-secondary)' }}>
                        {item.used_revenue_dna && item.used_revenue_dna.length > 0
                          ? item.used_revenue_dna.map(x => x.title).join(', ')
                          : '없음'}
                      </span>
                    </div>
                  </div>

                  {/* YouTube upload Status Badge */}
                  <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', background: 'rgba(0,0,0,0.2)', padding: '0.6rem', borderRadius: '6px', border: '1px solid rgba(255,255,255,0.03)' }}>
                    <div style={{ width: '8px', height: '8px', borderRadius: '50%', background: item.isMockUpload ? '#fbbf24' : '#10b981' }} />
                    <span style={{ fontSize: '0.8rem', color: 'var(--text-secondary)' }}>
                      {item.isMockUpload ? '시뮬레이션 업로드 완료' : '실제 채널 업로드 완료'}
                    </span>
                  </div>

                  {/* Action row */}
                  <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0.75rem', marginTop: 'auto', paddingTop: '0.5rem' }}>
                    <button 
                      onClick={() => handleOpenEdit(item)}
                      className="btn-secondary btn" 
                      style={{ fontSize: '0.85rem', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '0.4rem', padding: '0.6rem' }}
                    >
                      <Edit3 size={14} /> <span>영상 편집 & 재생성</span>
                    </button>
                    <a 
                      href={item.videoUrl} 
                      download={`shorts_${item.id}.mp4`}
                      className="btn" 
                      style={{ fontSize: '0.85rem', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '0.4rem', padding: '0.6rem', background: 'rgba(255,255,255,0.06)', border: '1px solid rgba(255,255,255,0.1)' }}
                    >
                      <Download size={14} /> <span>다운로드</span>
                    </a>
                  </div>

                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* Slide-in Edit Modal */}
      {editingItem && (
        <div style={{ position: 'fixed', top: 0, left: 0, width: '100%', height: '100%', background: 'rgba(0,0,0,0.85)', zIndex: 1000, display: 'flex', justifyContent: 'center', alignItems: 'center', padding: '2rem' }}>
          
          <div className="glass-panel" style={{ width: '100%', maxWidth: '850px', maxHeight: '90vh', overflowY: 'auto', padding: '2rem', display: 'flex', flexDirection: 'column', gap: '1.5rem', border: '1px solid rgba(255,255,255,0.1)', boxShadow: '0 20px 40px rgba(0,0,0,0.6)' }}>
            
            {/* Modal Header */}
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', borderBottom: '1px solid rgba(255,255,255,0.1)', paddingBottom: '1rem' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                <Sparkles size={20} color="#fb7185" />
                <h2 style={{ fontSize: '1.3rem', color: '#fff', margin: 0 }}>쇼츠 디렉터 편집기 - {editingItem.productTitle}</h2>
              </div>
              <button 
                onClick={handleCloseEdit}
                disabled={reRendering}
                style={{ background: 'none', border: 'none', color: 'var(--text-secondary)', cursor: 'pointer' }}
              >
                <X size={24} />
              </button>
            </div>

            {/* Error Message */}
            {errorMessage && (
              <div style={{ background: 'rgba(239,68,68,0.1)', border: '1px solid #ef4444', color: '#f87171', padding: '0.75rem', borderRadius: '6px', fontSize: '0.85rem', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                <AlertCircle size={16} />
                <span>{errorMessage}</span>
              </div>
            )}

            {/* Cuts Editor Form */}
            <div style={{ display: 'flex', flexDirection: 'column', gap: '2rem' }}>
              {editCuts.map((cut, idx) => {
                // Determine source for display thumbnail
                const displayImg = cut.imageUrl || (cut.image_path ? cut.image_path.replace(/.*\/public/, '') : '');

                return (
                  <div key={idx} style={{ display: 'grid', gridTemplateColumns: '120px 1fr', gap: '1.5rem', background: 'rgba(255,255,255,0.02)', padding: '1.2rem', borderRadius: '8px', border: '1px solid rgba(255,255,255,0.04)' }}>
                    
                    {/* Visual Preview */}
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
                      <div style={{ width: '100%', aspectRatio: '9/16', borderRadius: '4px', overflow: 'hidden', background: '#000', border: '1px solid rgba(255,255,255,0.05)', position: 'relative' }}>
                        {displayImg ? (
                          <img src={displayImg} alt={`Cut ${idx + 1}`} style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                        ) : (
                          <div style={{ height: '100%', display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'var(--text-secondary)', fontSize: '0.7rem' }}>이미지 없음</div>
                        )}
                        {generatingCutIdx === idx && (
                          <div style={{ position: 'absolute', top: 0, left: 0, width: '100%', height: '100%', background: 'rgba(0,0,0,0.6)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                            <Loader2 className="animate-spin" size={24} color="#fff" />
                          </div>
                        )}
                      </div>
                      <div style={{ fontSize: '0.75rem', fontWeight: 'bold', color: 'var(--text-secondary)', textAlign: 'center' }}>컷 {idx + 1}</div>
                    </div>

                    {/* Inputs Block */}
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
                      {/* Subtitle text */}
                      <div>
                        <label style={{ display: 'block', fontSize: '0.8rem', color: 'white', marginBottom: '0.3rem', fontWeight: 500 }}>자막 / 나레이션 문구</label>
                        <input 
                          type="text"
                          value={cut.subtitle || ''}
                          onChange={(e) => handleCutChange(idx, 'subtitle', e.target.value)}
                          style={{ width: '100%', padding: '0.6rem', background: 'rgba(0,0,0,0.3)', border: '1px solid rgba(255,255,255,0.1)', borderRadius: '4px', color: '#fff', fontSize: '0.85rem' }}
                        />
                      </div>

                      {/* Image prompt text */}
                      <div>
                        <label style={{ display: 'block', fontSize: '0.8rem', color: 'white', marginBottom: '0.3rem', fontWeight: 500 }}>AI 이미지 프롬프트 (영어)</label>
                        <div style={{ display: 'flex', gap: '0.5rem' }}>
                          <textarea 
                            rows={2}
                            value={cut.prompt || ''}
                            onChange={(e) => handleCutChange(idx, 'prompt', e.target.value)}
                            style={{ flexGrow: 1, padding: '0.6rem', background: 'rgba(0,0,0,0.3)', border: '1px solid rgba(255,255,255,0.1)', borderRadius: '4px', color: '#fff', fontSize: '0.8rem', resize: 'vertical' }}
                          />
                          <button
                            onClick={() => handleGenerateAiImage(idx)}
                            disabled={generatingCutIdx !== null || reRendering}
                            className="btn"
                            style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', gap: '0.2rem', padding: '0.5rem 1rem', fontSize: '0.75rem', background: 'linear-gradient(135deg, #a78bfa 0%, #fb7185 100%)', minWidth: '110px' }}
                          >
                            {generatingCutIdx === idx ? <Loader2 className="animate-spin" size={14} /> : <RefreshCw size={14} />}
                            <span>AI 이미지 재생성</span>
                          </button>
                        </div>
                        <div style={{ fontSize: '0.7rem', color: 'var(--text-secondary)', marginTop: '0.25rem' }}>
                          프롬프트를 수정한 뒤 우측 버튼을 누르면 AI가 이 컷의 이미지를 실시간으로 다시 생성하여 교체합니다.
                        </div>
                      </div>
                    </div>

                  </div>
                );
              })}
            </div>

            {/* Modal Actions */}
            <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '1rem', borderTop: '1px solid rgba(255,255,255,0.1)', paddingTop: '1.5rem', marginTop: '1rem' }}>
              <button 
                onClick={handleCloseEdit}
                disabled={reRendering}
                className="btn-secondary btn"
                style={{ padding: '0.7rem 1.5rem' }}
              >
                취소
              </button>
              
              <button 
                onClick={handleReRenderVideo}
                disabled={reRendering || generatingCutIdx !== null}
                className="btn"
                style={{ padding: '0.7rem 2rem', fontWeight: 'bold', display: 'flex', alignItems: 'center', gap: '0.5rem', background: 'linear-gradient(135deg, #fb7185 0%, #a78bfa 100%)', boxShadow: '0 0 15px rgba(167,139,250,0.3)' }}
              >
                {reRendering ? (
                  <>
                    <Loader2 className="animate-spin" size={16} />
                    <span>비디오 렌더링 중 (약 30초 소요)...</span>
                  </>
                ) : (
                  <>
                    <Play size={16} />
                    <span>수정 및 비디오 재인코딩</span>
                  </>
                )}
              </button>
            </div>

          </div>

        </div>
      )}

    </div>
  );
}
