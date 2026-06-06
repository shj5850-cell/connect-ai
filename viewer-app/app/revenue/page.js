'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import { 
  ArrowLeft, DollarSign, TrendingUp, AlertCircle, Briefcase, 
  Calendar, Percent, CheckCircle, RefreshCw, Landmark, ArrowUpRight, ArrowDownRight
} from 'lucide-react';

export default function RevenuePage() {
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [refreshKey, setRefreshKey] = useState(0);

  useEffect(() => {
    setLoading(true);
    fetch('/api/paypal-revenue')
      .then(res => {
        if (!res.ok) throw new Error('API 서버에서 데이터를 가져오지 못했습니다.');
        return res.json();
      })
      .then(json => {
        setData(json);
        setLoading(false);
      })
      .catch(err => {
        console.error(err);
        setError(err.message);
        setLoading(false);
      });
  }, [refreshKey]);

  if (loading) {
    return (
      <div className="container" style={{ padding: '4rem 2rem', textAlign: 'center' }}>
        <RefreshCw className="animate-spin" size={40} color="var(--accent-color)" style={{ margin: '0 auto 1.5rem auto' }} />
        <p style={{ color: 'var(--text-secondary)' }}>PayPal API를 통해 매출 집계 데이터를 분석하고 있습니다...</p>
      </div>
    );
  }

  if (error) {
    return (
      <div className="container" style={{ padding: '4rem 2rem' }}>
        <div className="error-message-box" style={{ maxWidth: '600px', margin: '0 auto', padding: '2rem' }}>
          <AlertCircle size={32} style={{ marginBottom: '1rem' }} />
          <h3>오류 발생</h3>
          <p>{error}</p>
          <button onClick={() => setRefreshKey(prev => prev + 1)} className="btn" style={{ marginTop: '1.5rem' }}>
            다시 시도
          </button>
        </div>
      </div>
    );
  }

  const totals = data?.totals || {};
  
  // Find active currency from filter or data
  const activeCurrency = data?.currency_filter || Object.keys(totals.by_currency || {})[0] || 'USD';
  const currencyTotals = totals.by_currency?.[activeCurrency] || { gross: 0, refunds: 0, fees: 0, count: 0 };
  const netRevenue = currencyTotals.gross - currencyTotals.refunds - currencyTotals.fees;
  const refundRate = currencyTotals.count > 0 ? (currencyTotals.refunds / currencyTotals.gross) * 100 : 0;

  // Process day chart data (last 15 days for a clean SVG visualization)
  const dayKeys = Object.keys(data?.by_day || {}).sort().slice(-15);
  const chartPoints = dayKeys.map((day, idx) => {
    const value = data.by_day[day]?.[activeCurrency]?.gross || 0;
    return { label: day.substring(5), value };
  });

  const maxChartVal = Math.max(...chartPoints.map(p => p.value), 10);
  const chartHeight = 140;
  const chartWidth = 700;

  const getCurrencySymbol = (code) => {
    if (code === 'KRW') return '₩';
    if (code === 'USD') return '$';
    if (code === 'EUR') return '€';
    if (code === 'JPY') return '¥';
    return code + ' ';
  };

  const formatVal = (val) => {
    const isZeroDecimal = activeCurrency === 'KRW' || activeCurrency === 'JPY';
    return val.toLocaleString(undefined, {
      minimumFractionDigits: isZeroDecimal ? 0 : 2,
      maximumFractionDigits: isZeroDecimal ? 0 : 2
    });
  };

  return (
    <div className="container" style={{ padding: '2rem', maxWidth: '1350px' }}>
      
      {/* Header */}
      <header style={{ marginBottom: '2rem', display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
        <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
          <Link href="/" style={{ display: 'inline-flex', alignItems: 'center', gap: '0.5rem', color: 'var(--text-primary)', width: 'fit-content' }} className="btn-secondary btn">
            <ArrowLeft size={16} /> 대시보드로 돌아가기
          </Link>
          <h1 className="title gradient-text" style={{ fontSize: '2.2rem', margin: 0, display: 'flex', alignItems: 'center', gap: '0.6rem' }}>
            <Landmark size={30} color="#fbbf24" style={{ filter: 'drop-shadow(0 0 8px rgba(251,191,36,0.4))' }} />
            <span>수익화 및 매출 분석판</span>
          </h1>
          <p style={{ color: 'var(--text-secondary)', margin: 0, fontSize: '0.95rem' }}>
            비즈니스 에이전트(현빈)가 연동한 PayPal 거래 내역 기반의 실시간 재무 분석 보고서
          </p>
        </div>
        <button onClick={() => setRefreshKey(prev => prev + 1)} className="btn-secondary btn" style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
          <RefreshCw size={16} /> 실시간 데이터 동기화
        </button>
      </header>

      {/* Demo Warning */}
      {data?.is_mock && (
        <div className="glass-panel" style={{ 
          padding: '1.25rem', 
          borderLeft: '4px solid #eab308', 
          background: 'rgba(234,179,8,0.06)', 
          marginBottom: '2rem',
          display: 'flex',
          alignItems: 'center',
          gap: '1rem'
        }}>
          <AlertCircle size={24} color="#eab308" style={{ flexShrink: 0 }} />
          <div>
            <div style={{ fontWeight: 'bold', color: '#fef08a', marginBottom: '0.2rem' }}>⚠️ 시뮬레이션 데모 모드 구동 중</div>
            <div style={{ fontSize: '0.85rem', color: '#eab308' }}>
              PayPal Client ID/Secret 설정이 완료되지 않아 가상의 거래 데이터를 출력하고 있습니다. 우측 상단의 [⚙️ 에이전트 튜너] 또는 VS Code의 외부 연동 설정에서 PayPal API를 연결하시면 실제 매출이 연동됩니다.
            </div>
          </div>
        </div>
      )}

      {/* KPI Cards Grid */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(240px, 1fr))', gap: '1.5rem', marginBottom: '2rem' }}>
        
        {/* KPI 1 */}
        <div className="glass-panel" style={{ padding: '1.5rem', position: 'relative', overflow: 'hidden' }}>
          <div style={{ position: 'absolute', right: '-10px', bottom: '-10px', opacity: 0.05, color: '#fbbf24' }}>
            <DollarSign size={100} />
          </div>
          <div style={{ color: 'var(--text-secondary)', fontSize: '0.85rem', fontWeight: 500 }}>총 매출액 (Gross)</div>
          <div style={{ fontSize: '1.8rem', fontWeight: 'bold', margin: '0.5rem 0', color: 'white' }}>
            {getCurrencySymbol(activeCurrency)}{formatVal(currencyTotals.gross)}
          </div>
          <div style={{ fontSize: '0.75rem', color: 'var(--text-secondary)', display: 'flex', alignItems: 'center', gap: '0.25rem' }}>
            <TrendingUp size={12} color="#10b981" /> 누적 거래 건수: {currencyTotals.count}건
          </div>
        </div>

        {/* KPI 2 */}
        <div className="glass-panel" style={{ padding: '1.5rem', position: 'relative', overflow: 'hidden', borderLeft: '3px solid #10b981' }}>
          <div style={{ position: 'absolute', right: '-10px', bottom: '-10px', opacity: 0.05, color: '#10b981' }}>
            <CheckCircle size={100} />
          </div>
          <div style={{ color: 'var(--text-secondary)', fontSize: '0.85rem', fontWeight: 500 }}>순수 정산액 (Net)</div>
          <div style={{ fontSize: '1.8rem', fontWeight: 'bold', margin: '0.5rem 0', color: '#10b981' }}>
            {getCurrencySymbol(activeCurrency)}{formatVal(netRevenue)}
          </div>
          <div style={{ fontSize: '0.75rem', color: 'var(--text-secondary)' }}>
            수수료 및 환불금이 차감된 순수익
          </div>
        </div>

        {/* KPI 3 */}
        <div className="glass-panel" style={{ padding: '1.5rem', position: 'relative', overflow: 'hidden' }}>
          <div style={{ color: 'var(--text-secondary)', fontSize: '0.85rem', fontWeight: 500 }}>PayPal 수수료 (Fees)</div>
          <div style={{ fontSize: '1.8rem', fontWeight: 'bold', margin: '0.5rem 0', color: '#f87171' }}>
            -{getCurrencySymbol(activeCurrency)}{formatVal(currencyTotals.fees)}
          </div>
          <div style={{ fontSize: '0.75rem', color: 'var(--text-secondary)' }}>
            평균 수수료율: {currencyTotals.gross > 0 ? ((currencyTotals.fees / currencyTotals.gross) * 100).toFixed(1) : 0}%
          </div>
        </div>

        {/* KPI 4 */}
        <div className="glass-panel" style={{ padding: '1.5rem', position: 'relative', overflow: 'hidden' }}>
          <div style={{ color: 'var(--text-secondary)', fontSize: '0.85rem', fontWeight: 500 }}>환불액 (Refunds)</div>
          <div style={{ fontSize: '1.8rem', fontWeight: 'bold', margin: '0.5rem 0', color: '#f87171' }}>
            -{getCurrencySymbol(activeCurrency)}{formatVal(currencyTotals.refunds)}
          </div>
          <div style={{ fontSize: '0.75rem', color: refundRate > 10 ? '#ef4444' : 'var(--text-secondary)', display: 'flex', alignItems: 'center', gap: '0.25rem' }}>
            <Percent size={12} /> 환불 비율: {refundRate.toFixed(1)}% {refundRate > 10 && '(높음)'}
          </div>
        </div>

      </div>

      {/* Main Charts & Project Breakdown Grid */}
      <div style={{ display: 'grid', gridTemplateColumns: 'minmax(0, 2fr) 1fr', gap: '2rem', marginBottom: '2rem' }}>
        
        {/* Sales Trend Chart */}
        <div className="glass-panel" style={{ padding: '2rem', display: 'flex', flexDirection: 'column' }}>
          <h2 style={{ fontSize: '1.2rem', marginBottom: '1.5rem', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
            <TrendingUp size={20} color="#fbbf24" /> 최근 15일간 일별 매출 동향 ({activeCurrency})
          </h2>
          
          {chartPoints.length === 0 ? (
            <div style={{ flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'var(--text-secondary)' }}>
              차트를 그릴 일별 거래 데이터가 없습니다.
            </div>
          ) : (
            <div style={{ width: '100%', overflowX: 'auto', display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
              <svg viewBox={`0 0 ${chartWidth} 180`} style={{ width: '100%', height: 'auto', background: 'rgba(0,0,0,0.15)', borderRadius: '8px', padding: '10px 20px 20px 20px' }}>
                {/* Horizontal Grid Lines */}
                {[0, 0.25, 0.5, 0.75, 1].map((ratio, idx) => {
                  const y = 10 + (1 - ratio) * chartHeight;
                  return (
                    <line key={idx} x1="40" y1={y} x2={chartWidth - 10} y2={y} stroke="rgba(255,255,255,0.05)" strokeDasharray="3 3" />
                  );
                })}

                {/* Y Axis Labels */}
                {[0, 0.5, 1].map((ratio, idx) => {
                  const y = 14 + (1 - ratio) * chartHeight;
                  const val = Math.round(ratio * maxChartVal);
                  return (
                    <text key={idx} x="5" y={y} fill="var(--text-secondary)" fontSize="10" textAnchor="start">{getCurrencySymbol(activeCurrency)}{formatVal(val)}</text>
                  );
                })}

                {/* Area and Line */}
                {(() => {
                  const points = chartPoints.map((p, idx) => {
                    const x = 50 + (idx * (chartWidth - 80)) / (chartPoints.length - 1);
                    const y = 10 + (1 - p.value / maxChartVal) * chartHeight;
                    return { x, y };
                  });

                  const linePath = points.map((p, idx) => `${idx === 0 ? 'M' : 'L'} ${p.x} ${p.y}`).join(' ');
                  const areaPath = `${linePath} L ${points[points.length - 1].x} ${10 + chartHeight} L ${points[0].x} ${10 + chartHeight} Z`;

                  return (
                    <>
                      <defs>
                        <linearGradient id="chartGrad" x1="0" y1="0" x2="0" y2="1">
                          <stop offset="0%" stopColor="#fbbf24" stopOpacity="0.25" />
                          <stop offset="100%" stopColor="#fbbf24" stopOpacity="0" />
                        </linearGradient>
                      </defs>
                      <path d={areaPath} fill="url(#chartGrad)" />
                      <path d={linePath} fill="none" stroke="#fbbf24" strokeWidth="2.5" />
                      
                      {/* Dots on line */}
                      {points.map((p, idx) => (
                        <circle key={idx} cx={p.x} cy={p.y} r="4" fill="#fbbf24" stroke="var(--bg-color)" strokeWidth="1.5" style={{ cursor: 'pointer' }}>
                          <title>{chartPoints[idx].label}: {getCurrencySymbol(activeCurrency)}{formatVal(chartPoints[idx].value)}</title>
                        </circle>
                      ))}
                    </>
                  );
                })()}

                {/* X Axis Labels */}
                {chartPoints.map((p, idx) => {
                  const x = 50 + (idx * (chartWidth - 80)) / (chartPoints.length - 1);
                  return (
                    <text key={idx} x={x} y={165} fill="var(--text-secondary)" fontSize="9" textAnchor="middle">{p.label}</text>
                  );
                })}
              </svg>
            </div>
          )}
        </div>

        {/* Project Contribution */}
        <div className="glass-panel" style={{ padding: '2rem', display: 'flex', flexDirection: 'column' }}>
          <h2 style={{ fontSize: '1.2rem', marginBottom: '1.5rem', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
            <Briefcase size={20} color="#fbbf24" /> 프로젝트별 기여도
          </h2>
          
          <div style={{ display: 'flex', flexDirection: 'column', gap: '1.25rem', flex: 1, justifyContent: 'center' }}>
            {Object.entries(data?.by_project || {}).map(([name, p]) => {
              const contribution = currencyTotals.gross > 0 ? (p.gross / currencyTotals.gross) * 100 : 0;
              return (
                <div key={name} style={{ display: 'flex', flexDirection: 'column', gap: '0.35rem' }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.9rem' }}>
                    <span style={{ fontWeight: 600, color: 'white' }}>{name}</span>
                    <span style={{ color: 'var(--text-secondary)' }}>
                      {getCurrencySymbol(p.currency || activeCurrency)}{formatVal(p.gross)} ({contribution.toFixed(1)}%)
                    </span>
                  </div>
                  <div style={{ width: '100%', height: '8px', background: 'rgba(255,255,255,0.05)', borderRadius: '4px', overflow: 'hidden' }}>
                    <div style={{ 
                      width: `${contribution}%`, 
                      height: '100%', 
                      background: 'var(--accent-gradient)',
                      borderRadius: '4px' 
                    }} />
                  </div>
                  <div style={{ fontSize: '0.75rem', color: 'var(--text-secondary)' }}>
                    총 {p.count}건 결제됨
                  </div>
                </div>
              );
            })}
          </div>
        </div>

      </div>

      {/* Transaction History Table */}
      <div className="glass-panel" style={{ padding: '2rem' }}>
        <h2 style={{ fontSize: '1.2rem', marginBottom: '1.5rem', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
          <Calendar size={20} color="#fbbf24" /> 최근 거래 기록 내역 (최대 100건)
        </h2>

        {data?.transactions?.length === 0 ? (
          <div style={{ padding: '3rem', textAlign: 'center', color: 'var(--text-secondary)' }}>
            기록된 PayPal 결제 거래 건수가 존재하지 않습니다.
          </div>
        ) : (
          <div style={{ overflowX: 'auto' }}>
            <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left' }}>
              <thead>
                <tr style={{ borderBottom: '1px solid rgba(255,255,255,0.08)', color: 'var(--text-secondary)', fontSize: '0.85rem' }}>
                  <th style={{ padding: '0.75rem 1rem' }}>거래 ID</th>
                  <th style={{ padding: '0.75rem 1rem' }}>날짜 및 시간</th>
                  <th style={{ padding: '0.75rem 1rem' }}>상품 설명 (Subject)</th>
                  <th style={{ padding: '0.75rem 1rem' }}>결제 상태</th>
                  <th style={{ padding: '0.75rem 1rem', textAnchor: 'end', textAlign: 'right' }}>금액 ({activeCurrency})</th>
                </tr>
              </thead>
              <tbody>
                {data.transactions.map((tx) => {
                  const isRefund = tx.is_refund || tx.value < 0;
                  return (
                    <tr key={tx.id} style={{ borderBottom: '1px solid rgba(255,255,255,0.05)', fontSize: '0.9rem', transition: 'background 0.2s' }} className="table-row-hover">
                      <td style={{ padding: '0.75rem 1rem', fontFamily: 'monospace', color: 'var(--text-secondary)' }}>
                        {tx.id}
                      </td>
                      <td style={{ padding: '0.75rem 1rem', color: 'var(--text-secondary)' }}>
                        {new Date(tx.ts).toLocaleString('ko-KR', { month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' })}
                      </td>
                      <td style={{ padding: '0.75rem 1rem', fontWeight: 500, color: 'white' }}>
                        {tx.subject || '프로젝트 구매 결제'}
                      </td>
                      <td style={{ padding: '0.75rem 1rem' }}>
                        <span style={{ 
                          fontSize: '0.75rem', 
                          fontWeight: 600, 
                          padding: '0.2rem 0.5rem', 
                          borderRadius: '4px',
                          display: 'inline-flex',
                          alignItems: 'center',
                          gap: '0.25rem',
                          background: isRefund ? 'rgba(239, 68, 68, 0.12)' : 'rgba(16, 185, 129, 0.12)',
                          color: isRefund ? '#ef4444' : '#10b981'
                        }}>
                          {isRefund ? <ArrowDownRight size={10} /> : <ArrowUpRight size={10} />}
                          {isRefund ? '환불 완료' : '결제 완료'}
                        </span>
                      </td>
                      <td style={{ padding: '0.75rem 1rem', fontWeight: 'bold', textAlign: 'right', color: isRefund ? '#ef4444' : '#10b981' }}>
                        {isRefund ? '-' : '+'}{getCurrencySymbol(tx.currency || activeCurrency)}{formatVal(Math.abs(tx.value))}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>

      <style jsx>{`
        .table-row-hover:hover {
          background: rgba(255, 255, 255, 0.02);
        }
      `}</style>
    </div>
  );
}
