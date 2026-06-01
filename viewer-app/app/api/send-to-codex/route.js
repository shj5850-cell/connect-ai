import { NextResponse } from 'next/server';
import { getSessionFiles } from '../../lib/api';

export async function POST(request) {
  try {
    const { sessionId } = await request.json();

    if (!sessionId) {
      return NextResponse.json(
        { success: false, error: '세션 ID가 제공되지 않았습니다.' },
        { status: 400 }
      );
    }

    const files = getSessionFiles(sessionId);
    
    if (!files || files.length === 0) {
      return NextResponse.json(
        { success: false, error: `세션 '${sessionId}'에 해당하는 파일이 없습니다.` },
        { status: 404 }
      );
    }

    const payload = {
      sessionId,
      timestamp: new Date().toISOString(),
      files: files.map(file => ({
        name: file.name,
        content: file.content
      }))
    };

    const codexUrl = process.env.CODEX_API_URL;
    const codexApiKey = process.env.CODEX_API_KEY;

    if (codexUrl) {
      console.log(`[Codex API] ${sessionId} 세션 데이터를 ${codexUrl}로 전송을 시작합니다.`);
      
      const headers = {
        'Content-Type': 'application/json',
      };
      
      if (codexApiKey) {
        headers['Authorization'] = `Bearer ${codexApiKey}`;
      }

      const response = await fetch(codexUrl, {
        method: 'POST',
        headers,
        body: JSON.stringify(payload),
      });

      if (!response.ok) {
        const errorText = await response.text();
        console.error(`[Codex API] 전송 실패: ${response.status} - ${errorText}`);
        return NextResponse.json(
          { success: false, error: `코덱스 전송 실패: ${response.statusText} (${response.status})` },
          { status: response.status }
        );
      }

      const responseData = await response.json().catch(() => ({}));
      console.log(`[Codex API] 전송 성공:`, responseData);
      
      return NextResponse.json({
        success: true,
        message: '코덱스 전송 성공',
        data: responseData
      });
    } else {
      // CODEX_API_URL이 설정되어 있지 않은 경우 Mock 데이터 처리
      console.log('==================================================');
      console.log(`[Codex API Mock Log] ${sessionId} 데이터 전송 시뮬레이션`);
      console.log(`전송 시각: ${payload.timestamp}`);
      console.log(`전송된 파일 개수: ${payload.files.length}개`);
      payload.files.forEach(f => {
        console.log(`- 파일명: ${f.name} (${f.content.length} bytes)`);
      });
      console.log('==================================================');

      // 실제 전송하는 느낌을 주기 위해 1초 대기
      await new Promise(resolve => setTimeout(resolve, 1000));

      return NextResponse.json({
        success: true,
        isMock: true,
        message: 'Mock 전송 성공 (환경 변수 CODEX_API_URL이 설정되지 않아 모의 처리됨)',
        data: {
          receivedSessionId: sessionId,
          fileCount: files.length
        }
      });
    }
  } catch (error) {
    console.error('[Codex API Route Error]', error);
    return NextResponse.json(
      { success: false, error: error.message || '서버 내부 오류가 발생했습니다.' },
      { status: 500 }
    );
  }
}
