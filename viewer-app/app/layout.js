import Link from 'next/link';
import './globals.css'

export const metadata = {
  title: 'Connect AI - Company Viewer',
  description: 'View the outputs and sessions of AI agents',
}

export default function RootLayout({ children }) {
  return (
    <html lang="ko">
      <body>
        <nav style={{ padding: '1rem 2rem', background: 'rgba(0,0,0,0.3)', borderBottom: '1px solid rgba(255,255,255,0.1)', display: 'flex', gap: '2rem', alignItems: 'center' }}>
          <div style={{ fontWeight: 'bold', fontSize: '1.2rem', color: 'var(--accent-color)' }}>Connect AI</div>
          <Link href="/" style={{ color: 'var(--text-color)', textDecoration: 'none', fontWeight: 500 }}>대시보드</Link>
          <Link href="/sandbox" style={{ color: 'var(--accent-secondary)', textDecoration: 'none', fontWeight: 500 }}>테스트 공간 (Sandbox)</Link>
        </nav>
        {children}
      </body>
    </html>
  )
}
