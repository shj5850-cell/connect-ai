import Link from 'next/link';
import './globals.css'

export const metadata = {
  title: '맹칠컴퍼니 - 에이전트 대시보드',
  description: 'View the outputs and sessions of AI agents',
}

export default function RootLayout({ children }) {
  return (
    <html lang="ko">
      <body>
        <nav style={{ padding: '1rem 2rem', background: 'rgba(0,0,0,0.3)', borderBottom: '1px solid rgba(255,255,255,0.1)', display: 'flex', gap: '1.5rem', alignItems: 'center', flexWrap: 'wrap' }}>
          <div style={{ fontWeight: 'bold', fontSize: '1.2rem', color: 'var(--accent-color)', marginRight: '1rem' }}>맹칠컴퍼니</div>
          <Link href="/" style={{ color: 'var(--text-color)', textDecoration: 'none', fontWeight: 500 }}>대시보드</Link>
          <Link href="/autopilot" style={{ color: '#ff7b90', textDecoration: 'none', fontWeight: 700, border: '1px solid rgba(251,113,133,0.3)', padding: '0.25rem 0.75rem', borderRadius: '20px', background: 'rgba(251,113,133,0.05)', boxShadow: '0 0 10px rgba(251,113,133,0.15)' }}>🚀 1클릭 자동화</Link>
          <Link href="/archive" style={{ color: '#a78bfa', textDecoration: 'none', fontWeight: 700, border: '1px solid rgba(167,139,250,0.3)', padding: '0.25rem 0.75rem', borderRadius: '20px', background: 'rgba(167,139,250,0.05)', boxShadow: '0 0 10px rgba(167,139,250,0.15)' }}>🎥 영상 보관함</Link>
          <Link href="/learning" style={{ color: '#34d399', textDecoration: 'none', fontWeight: 700, border: '1px solid rgba(52,211,153,0.3)', padding: '0.25rem 0.75rem', borderRadius: '20px', background: 'rgba(52,211,153,0.05)', boxShadow: '0 0 10px rgba(52,211,153,0.15)' }}>🧠 AI 자기개선 학습</Link>
          <Link href="/revenue" style={{ color: '#fbbf24', textDecoration: 'none', fontWeight: 500 }}>💰 수익 & 매출</Link>
          <Link href="/cinema-shorts" style={{ color: '#fb7185', textDecoration: 'none', fontWeight: 500 }}>🎬 AI 4컷 시네마틱 쇼츠</Link>
          <Link href="/youtube/comments" style={{ color: '#a78bfa', textDecoration: 'none', fontWeight: 500 }}>💬 YouTube 소통</Link>
          <Link href="/agents" style={{ color: '#3b82f6', textDecoration: 'none', fontWeight: 500 }}>⚙️ 에이전트 튜너</Link>
          <Link href="/long-to-short" style={{ color: '#00d2ff', textDecoration: 'none', fontWeight: 500 }}>⚡ 롱폼➔숏폼 변환기</Link>
          <Link href="/sandbox" style={{ color: 'var(--accent-secondary)', textDecoration: 'none', fontWeight: 500 }}>테스트 공간 (Sandbox)</Link>
        </nav>
        {children}
      </body>
    </html>
  )
}
