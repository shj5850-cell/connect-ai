import Link from 'next/link';
import fs from 'fs';
import path from 'path';
import { ArrowLeft, Video, ShieldAlert, CheckCircle2, AlertTriangle, Clock, RefreshCw, BarChart2, Flame, HelpCircle } from 'lucide-react';

// Read DNA DB data directly from backend
function getTrendDNAData() {
  const dbPath = path.join(process.cwd(), '..', '_company', 'trend_dna_db.json');
  if (!fs.existsSync(dbPath)) return {};
  try {
    return JSON.parse(fs.readFileSync(dbPath, 'utf-8'));
  } catch (e) {
    console.error('Failed to parse trend DNA database:', e);
    return {};
  }
}

export default async function YoutubeTrendsPage() {
  const apiKey = process.env.YOUTUBE_API_KEY;
  const hasApiKey = !!(apiKey && apiKey.trim() !== '');
  
  const trendData = getTrendDNAData();
  const keywordsList = Object.keys(trendData);

  // Group status variables
  const lastSync = keywordsList.length > 0
    ? Object.values(trendData).reduce((latest, current) => {
        return new Date(current.updatedAt) > new Date(latest) ? current.updatedAt : latest;
      }, '1970-01-01')
    : null;

  return (
    <div className="container" style={{ paddingBottom: '4rem' }}>
      <header className="header" style={{ marginBottom: '2rem', borderBottom: 'none' }}>
        <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem', width: '100%' }}>
          <Link href="/" className="btn-secondary btn" style={{ display: 'inline-flex', alignItems: 'center', gap: '0.5rem', width: 'fit-content' }}>
            <ArrowLeft size={16} /> 대시보드로 돌아가기
          </Link>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '1rem' }}>
            <div>
              <h1 className="title gradient-text" style={{ fontSize: '2.2rem', margin: 0, display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
                <Video size={36} color="#ef4444" style={{ filter: 'drop-shadow(0 0 10px rgba(239, 68, 68, 0.4))' }} /> 
                <span>유튜브 트렌드 분석 엔진 (Trend DNA)</span>
              </h1>
              <p style={{ color: 'var(--text-secondary)', marginTop: '0.5rem' }}>
                실제 유튜브 시장 데이터를 기반으로 비디오 중복을 제거하고 틈새 시장을 포착합니다.
              </p>
            </div>
          </div>
        </div>
      </header>

      {/* System Status Indicators */}
      <section style={{ marginBottom: '2rem' }}>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))', gap: '1.25rem' }}>
          
          {/* API Key Status */}
          <div className="glass-panel" style={{ padding: '1.25rem', display: 'flex', alignItems: 'center', gap: '1rem', border: hasApiKey ? '1px solid rgba(16,185,129,0.2)' : '1px solid rgba(239,68,68,0.2)' }}>
            <div style={{ padding: '0.75rem', borderRadius: '50%', background: hasApiKey ? 'rgba(16,185,129,0.1)' : 'rgba(239,68,68,0.1)', display: 'flex' }}>
              {hasApiKey ? <CheckCircle2 size={24} color="#10b981" /> : <ShieldAlert size={24} color="#ef4444" />}
            </div>
            <div>
              <span style={{ fontSize: '0.75rem', color: 'var(--text-secondary)', display: 'block' }}>YouTube Data API Status</span>
              <strong style={{ fontSize: '1rem', color: hasApiKey ? '#10b981' : '#ef4444' }}>
                {hasApiKey ? '작동 중 (Real API 활성화)' : 'API Key 없음 (엔진 비활성화)'}
              </strong>
            </div>
          </div>

          {/* Keywords Count */}
          <div className="glass-panel" style={{ padding: '1.25rem', display: 'flex', alignItems: 'center', gap: '1rem' }}>
            <div style={{ padding: '0.75rem', borderRadius: '50%', background: 'rgba(59,130,246,0.1)', display: 'flex' }}>
              <BarChart2 size={24} color="#3b82f6" />
            </div>
            <div>
              <span style={{ fontSize: '0.75rem', color: 'var(--text-secondary)', display: 'block' }}>분석 완료 상품 키워드</span>
              <strong style={{ fontSize: '1.2rem', color: '#fff' }}>{keywordsList.length} 개</strong>
            </div>
          </div>

          {/* Last Collected Time */}
          <div className="glass-panel" style={{ padding: '1.25rem', display: 'flex', alignItems: 'center', gap: '1rem' }}>
            <div style={{ padding: '0.75rem', borderRadius: '50%', background: 'rgba(245,158,11,0.1)', display: 'flex' }}>
              <Clock size={24} color="#f59e0b" />
            </div>
            <div>
              <span style={{ fontSize: '0.75rem', color: 'var(--text-secondary)', display: 'block' }}>마지막 수집 시간</span>
              <strong style={{ fontSize: '0.9rem', color: '#fff' }}>
                {lastSync ? new Date(lastSync).toLocaleString('ko-KR') : '데이터 없음'}
              </strong>
            </div>
          </div>

        </div>
      </section>

      {!hasApiKey && (
        <div className="glass-panel" style={{ padding: '2rem', textAlign: 'center', background: 'linear-gradient(135deg, rgba(239, 68, 68, 0.05) 0%, rgba(0,0,0,0) 100%)', border: '1px solid rgba(239,68,68,0.2)', marginBottom: '2rem' }}>
          <AlertTriangle size={48} color="#ef4444" style={{ margin: '0 auto 1rem auto' }} />
          <h3 style={{ fontSize: '1.2rem', marginBottom: '0.5rem', color: '#ef4444' }}>YouTube Data API Key가 설정되지 않았습니다</h3>
          <p style={{ color: 'var(--text-secondary)', maxWidth: '600px', margin: '0 auto', fontSize: '0.9rem', lineHeight: '1.5' }}>
            트렌드 엔진을 통한 실제 시장 검색과 DNA 중복도 검사를 작동시키려면 <code>.env</code> 파일에 <code>YOUTUBE_API_KEY</code>를 추가하셔야 합니다. 
            키가 설정되지 않은 동안에는 가짜(Mock) 데이터 생성이 엄격히 금지되며 트렌드 분석 기능이 완전히 대기 상태로 정지됩니다.
          </p>
        </div>
      )}

      {/* Main Content Area */}
      {keywordsList.length === 0 ? (
        <div className="glass-panel" style={{ padding: '4rem', textAlign: 'center', color: 'var(--text-secondary)' }}>
          <HelpCircle size={48} style={{ margin: '0 auto 1rem auto', opacity: 0.5 }} />
          <p style={{ fontSize: '1.1rem' }}>수집 완료된 실제 유튜브 트렌드 데이터가 존재하지 않습니다.</p>
          <p style={{ fontSize: '0.85rem', marginTop: '0.25rem' }}>쇼츠 영상 자동 생성을 트리거하면 해당 키워드의 유튜브 시장 데이터를 수집하기 시작합니다.</p>
        </div>
      ) : (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '2rem' }}>
          
          <h2 style={{ fontSize: '1.4rem', margin: 0, color: 'var(--text-primary)' }}>수집된 시장 트렌드 DNA 데이터베이스</h2>
          
          {keywordsList.map(kw => {
            const data = trendData[kw];
            return (
              <div key={kw} className="glass-panel" style={{ padding: '2rem', border: '1px solid var(--border-color)' }}>
                {/* Panel Header */}
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', borderBottom: '1px solid rgba(255,255,255,0.06)', paddingBottom: '1rem', marginBottom: '1.5rem', flexWrap: 'wrap', gap: '1rem' }}>
                  <div>
                    <h3 style={{ fontSize: '1.5rem', margin: 0, fontWeight: 700, color: '#fff' }}>"{kw}" 검색 데이터</h3>
                    <span style={{ fontSize: '0.75rem', color: 'var(--text-secondary)', display: 'block', marginTop: '0.25rem' }}>
                      분석 수량: 실제 비디오 {data.rawVideosCount || 20}개 · 수집 시간: {new Date(data.updatedAt).toLocaleString('ko-KR')}
                    </span>
                  </div>
                  <div style={{ display: 'flex', gap: '0.75rem' }}>
                    <span style={{
                      fontSize: '0.75rem',
                      fontWeight: 'bold',
                      background: data.saturation?.riskScore > 70 ? 'rgba(239, 68, 68, 0.1)' : 'rgba(16, 185, 129, 0.1)',
                      color: data.saturation?.riskScore > 70 ? '#ef4444' : '#10b981',
                      border: `1px solid ${data.saturation?.riskScore > 70 ? 'rgba(239, 68, 68, 0.2)' : 'rgba(16, 185, 129, 0.2)'}`,
                      padding: '0.3rem 0.6rem',
                      borderRadius: '6px'
                    }}>
                      시장 포화 위험도: {data.saturation?.riskScore}%
                    </span>
                    <span style={{
                      fontSize: '0.75rem',
                      fontWeight: 'bold',
                      background: 'rgba(59, 130, 246, 0.1)',
                      color: '#3b82f6',
                      border: '1px solid rgba(59, 130, 246, 0.2)',
                      padding: '0.3rem 0.6rem',
                      borderRadius: '6px'
                    }}>
                      추천 유형: {data.gapOpportunity?.recommendedType}
                    </span>
                  </div>
                </div>

                {/* Grid Content */}
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(320px, 1fr))', gap: '2rem' }}>
                  
                  {/* DNA Patterns */}
                  <div>
                    <h4 style={{ fontSize: '1.05rem', color: 'var(--accent-secondary)', display: 'flex', alignItems: 'center', gap: '0.4rem', marginBottom: '1rem', fontWeight: 600 }}>
                      🧬 유튜브 시장 DNA 패턴
                    </h4>
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem', background: 'rgba(0,0,0,0.2)', padding: '1.25rem', borderRadius: '10px', height: '100%' }}>
                      <div>
                        <span style={{ fontSize: '0.75rem', color: 'var(--text-secondary)' }}>주요 제목 패턴</span>
                        <ul style={{ margin: '0.25rem 0 0 0', paddingLeft: '1.25rem', fontSize: '0.85rem', color: '#cbd5e1', lineHeight: '1.5' }}>
                          {(data.dna?.titlePatterns || []).map((p, idx) => <li key={idx}>{p}</li>)}
                        </ul>
                      </div>
                      <div>
                        <span style={{ fontSize: '0.75rem', color: 'var(--text-secondary)' }}>주요 Hook 스타일</span>
                        <ul style={{ margin: '0.25rem 0 0 0', paddingLeft: '1.25rem', fontSize: '0.85rem', color: '#cbd5e1', lineHeight: '1.5' }}>
                          {(data.dna?.hookPatterns || []).map((p, idx) => <li key={idx}>{p}</li>)}
                        </ul>
                      </div>
                      <div>
                        <span style={{ fontSize: '0.75rem', color: 'var(--text-secondary)', display: 'block' }}>자막/캡션 특징</span>
                        <span style={{ fontSize: '0.85rem', color: '#cbd5e1' }}>{data.dna?.captionStyle || '정보 없음'}</span>
                      </div>
                    </div>
                  </div>

                  {/* Overused & Saturation Analysis */}
                  <div>
                    <h4 style={{ fontSize: '1.05rem', color: '#ef4444', display: 'flex', alignItems: 'center', gap: '0.4rem', marginBottom: '1rem', fontWeight: 600 }}>
                      <Flame size={18} /> 중복 과포화 표현 (Saturation Analysis)
                    </h4>
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem', background: 'rgba(0,0,0,0.2)', padding: '1.25rem', borderRadius: '10px', height: '100%' }}>
                      <p style={{ fontSize: '0.8rem', color: 'var(--text-secondary)', margin: 0 }}>
                        아래 표현들은 시장 내 타 유튜버들이 지나치게 남용하고 있는 단어들입니다. AI 생성 파이프라인에서 자동 차단/검열 필터링됩니다.
                      </p>
                      <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem', marginTop: '0.5rem' }}>
                        {(data.saturation?.overusedPhrases || []).map((item, idx) => (
                          <div key={idx} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', background: 'rgba(255,255,255,0.02)', padding: '0.5rem 0.75rem', borderRadius: '6px', border: '1px solid rgba(255,255,255,0.03)' }}>
                            <span style={{ fontSize: '0.85rem', color: '#fff', fontWeight: 500 }}>"{item.phrase}"</span>
                            <span style={{ fontSize: '0.8rem', color: '#ef4444', fontWeight: 'bold' }}>포화율 {(item.rate * 100).toFixed(0)}%</span>
                          </div>
                        ))}
                      </div>
                    </div>
                  </div>

                  {/* Gap Opportunities */}
                  <div style={{ gridColumn: '1 / -1' }}>
                    <h4 style={{ fontSize: '1.05rem', color: '#f59e0b', display: 'flex', alignItems: 'center', gap: '0.4rem', marginBottom: '1rem', fontWeight: 600 }}>
                      💡 시장 틈새 기회 (Gap Opportunity)
                    </h4>
                    <div style={{ background: 'linear-gradient(145deg, rgba(245,158,11,0.03) 0%, rgba(0,0,0,0.2) 100%)', border: '1px solid rgba(245,158,11,0.15)', padding: '1.5rem', borderRadius: '10px' }}>
                      <div style={{ display: 'grid', gridTemplateColumns: '1fr 2fr', gap: '1.5rem', alignItems: 'center' }}>
                        <div>
                          <span style={{ fontSize: '0.75rem', color: 'var(--text-secondary)', display: 'block', marginBottom: '0.25rem' }}>시장 영상 분포도</span>
                          <div style={{ display: 'flex', flexDirection: 'column', gap: '0.4rem' }}>
                            {data.gapOpportunity?.typesDistribution && Object.entries(data.gapOpportunity.typesDistribution).map(([type, rate]) => (
                              <div key={type} style={{ fontSize: '0.8rem', display: 'flex', justifyContent: 'space-between' }}>
                                <span style={{ textTransform: 'capitalize', color: 'var(--text-secondary)' }}>{type === 'experiment' ? '실험형' : type === 'review' ? '후기형' : type === 'ads' ? '광고형' : type}:</span>
                                <span style={{ fontWeight: 'bold', color: '#fff' }}>{(rate * 100).toFixed(0)}%</span>
                              </div>
                            ))}
                          </div>
                        </div>
                        <div style={{ borderLeft: '1px solid rgba(255,255,255,0.08)', paddingLeft: '1.5rem' }}>
                          <span style={{ fontSize: '0.85rem', color: '#f59e0b', fontWeight: 'bold', display: 'block', marginBottom: '0.25rem' }}>
                            AI 추천 대안 앵글: {data.gapOpportunity?.recommendedType === 'experiment' ? '실험/검증형' : data.gapOpportunity?.recommendedType}
                          </span>
                          <p style={{ fontSize: '0.85rem', color: '#cbd5e1', lineHeight: '1.6', margin: 0 }}>
                            {data.gapOpportunity?.reason}
                          </p>
                        </div>
                      </div>
                    </div>
                  </div>

                </div>
              </div>
            );
          })}

        </div>
      )}
    </div>
  );
}
