'use client';

import { useEffect } from 'react';
import { useRouter } from 'next/navigation';

export default function AutopilotRedirect() {
  const router = useRouter();

  useEffect(() => {
    router.replace('/');
  }, [router]);

  return (
    <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', height: '100vh', color: 'var(--text-secondary)' }}>
      메인 대시보드로 이동 중...
    </div>
  );
}
