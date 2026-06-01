import { NextResponse } from 'next/server';
import fs from 'fs';
import path from 'path';

function getAccountConfigPath() {
  return path.join(process.cwd(), '../_company/_agents/youtube/tools/youtube_account.json');
}

function loadConfig() {
  const filePath = getAccountConfigPath();
  if (fs.existsSync(filePath)) {
    try {
      return JSON.parse(fs.readFileSync(filePath, 'utf-8'));
    } catch (e) {
      console.error('Error parsing youtube_account.json:', e);
      return {};
    }
  }
  return {};
}

function saveConfig(config) {
  const filePath = getAccountConfigPath();
  try {
    fs.mkdirSync(path.dirname(filePath), { recursive: true });
    fs.writeFileSync(filePath, JSON.stringify(config, null, 2), 'utf-8');
    return true;
  } catch (e) {
    console.error('Error writing youtube_account.json:', e);
    return false;
  }
}

export async function GET(request) {
  try {
    const { searchParams } = new URL(request.url);
    const code = searchParams.get('code');
    const error = searchParams.get('error');

    if (error) {
      return new NextResponse(
        `<html>
          <head>
            <title>인증 실패 - YouTube</title>
            <style>
              body { background-color: #0b0b0f; color: #f3f4f6; font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif; display: flex; align-items: center; justify-content: center; height: 100vh; margin: 0; }
              .card { background: rgba(255, 255, 255, 0.03); border: 1px solid rgba(239, 68, 68, 0.2); border-radius: 16px; padding: 2.5rem; text-align: center; max-width: 450px; box-shadow: 0 10px 30px rgba(0,0,0,0.5); backdrop-filter: blur(12px); }
              h1 { color: #ef4444; margin-top: 0; font-size: 1.5rem; }
              p { color: #9ca3af; line-height: 1.6; font-size: 0.95rem; }
              button { background: #3b82f6; border: none; color: white; padding: 0.75rem 1.5rem; border-radius: 8px; font-weight: 600; cursor: pointer; margin-top: 1.5rem; font-size: 0.9rem; transition: background 0.2s; }
              button:hover { background: #2563eb; }
            </style>
          </head>
          <body>
            <div class="card">
              <h1>⚠️ 유튜브 인증 실패</h1>
              <p>인증 도중 오류가 발생했습니다: ${error}</p>
              <button onclick="window.close()">창 닫기</button>
            </div>
          </body>
        </html>`,
        { headers: { 'Content-Type': 'text/html; charset=UTF-8' } }
      );
    }

    if (!code) {
      return new NextResponse(
        `<html>
          <head>
            <title>잘못된 접근</title>
            <style>
              body { background-color: #0b0b0f; color: #f3f4f6; font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif; display: flex; align-items: center; justify-content: center; height: 100vh; margin: 0; }
              .card { background: rgba(255, 255, 255, 0.03); border: 1px solid rgba(255,255,255,0.05); border-radius: 16px; padding: 2.5rem; text-align: center; max-width: 450px; box-shadow: 0 10px 30px rgba(0,0,0,0.5); }
              h1 { color: #f59e0b; margin-top: 0; font-size: 1.5rem; }
              p { color: #9ca3af; line-height: 1.6; }
            </style>
          </head>
          <body>
            <div class="card">
              <h1>⚠️ 잘못된 접근입니다.</h1>
              <p>인증 코드가 누락되었습니다. 다시 시도해 주세요.</p>
            </div>
          </body>
        </html>`,
        { headers: { 'Content-Type': 'text/html; charset=UTF-8' } }
      );
    }

    const config = loadConfig();
    const clientId = config.YOUTUBE_OAUTH_CLIENT_ID;
    const clientSecret = config.YOUTUBE_OAUTH_CLIENT_SECRET;

    if (!clientId || !clientSecret) {
      throw new Error('설정 파일에 Client ID 또는 Client Secret이 없습니다.');
    }

    const redirectUri = 'http://localhost:3000/api/upload-youtube/callback';

    // Exchange auth code for tokens
    const response = await fetch('https://oauth2.googleapis.com/token', {
      method: 'POST',
      headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
      body: new URLSearchParams({
        code,
        client_id: clientId,
        client_secret: clientSecret,
        redirect_uri: redirectUri,
        grant_type: 'authorization_code'
      })
    });

    if (!response.ok) {
      const errorText = await response.text();
      throw new Error(`구글 토큰 교환 실패: ${errorText}`);
    }

    const tokenData = await response.json();
    const { refresh_token, access_token } = tokenData;

    if (!refresh_token) {
      // NOTE: Google only returns refresh_token on the FIRST authorization.
      // If the user already authorized, refresh_token might be missing.
      // That's why we set prompt: 'consent' in the auth URL.
      console.warn('Warning: Refresh token was not returned. Access token received.');
    }

    // Save tokens in config
    if (refresh_token) {
      config.YOUTUBE_OAUTH_REFRESH_TOKEN = refresh_token;
    }
    if (access_token) {
      config.YOUTUBE_OAUTH_ACCESS_TOKEN = access_token;
    }
    saveConfig(config);

    // Show beautiful completion page that notifies the parent window
    return new NextResponse(
      `<html>
        <head>
          <title>인증 완료! - YouTube</title>
          <style>
            body { background-color: #0b0b0f; color: #f3f4f6; font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif; display: flex; align-items: center; justify-content: center; height: 100vh; margin: 0; }
            .card { background: rgba(255, 255, 255, 0.02); border: 1px solid rgba(0, 210, 255, 0.2); border-radius: 20px; padding: 3rem; text-align: center; max-width: 450px; box-shadow: 0 15px 35px rgba(0,0,0,0.6), 0 0 30px rgba(0,210,255,0.05); backdrop-filter: blur(15px); }
            h1 { color: #00d2ff; margin-top: 0; font-size: 1.7rem; font-weight: 700; text-shadow: 0 0 10px rgba(0,210,255,0.3); }
            p { color: #9ca3af; line-height: 1.6; font-size: 1rem; margin-bottom: 2rem; }
            .success-icon { font-size: 4rem; color: #00d2ff; margin-bottom: 1rem; animation: pulse 2s infinite; }
            button { background: linear-gradient(135deg, #00d2ff, #00a8ff); border: none; color: white; padding: 0.85rem 2rem; border-radius: 10px; font-weight: 700; cursor: pointer; font-size: 0.95rem; box-shadow: 0 4px 15px rgba(0,210,255,0.2); transition: all 0.3s; }
            button:hover { transform: translateY(-2px); box-shadow: 0 6px 20px rgba(0,210,255,0.3); }
            @keyframes pulse {
              0% { transform: scale(1); opacity: 1; }
              50% { transform: scale(1.05); opacity: 0.8; }
              100% { transform: scale(1); opacity: 1; }
            }
          </style>
          <script>
            // Tell the parent window to reload or update status
            try {
              if (window.opener) {
                window.opener.postMessage({ type: 'YOUTUBE_AUTH_SUCCESS' }, '*');
              }
            } catch(e) {
              console.error(e);
            }
          </script>
        </head>
        <body>
          <div class="card">
            <div class="success-icon">✓</div>
            <h1>유튜브 인증 성공!</h1>
            <p>쿠팡 파트너스 자동 쇼츠 업로드용 유튜브 API 권한 획득이 안전하게 완료되었습니다. 이 창을 닫고 계속 진행해 주세요.</p>
            <button onclick="window.close()">창 닫고 시작하기</button>
          </div>
        </body>
      </html>`,
      { headers: { 'Content-Type': 'text/html; charset=UTF-8' } }
    );

  } catch (error) {
    console.error('Callback handler error:', error);
    return new NextResponse(
      `<html>
        <head>
          <title>인증 실패 - YouTube</title>
          <style>
            body { background-color: #0b0b0f; color: #f3f4f6; font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif; display: flex; align-items: center; justify-content: center; height: 100vh; margin: 0; }
            .card { background: rgba(255, 255, 255, 0.03); border: 1px solid rgba(239, 68, 68, 0.2); border-radius: 16px; padding: 2.5rem; text-align: center; max-width: 450px; box-shadow: 0 10px 30px rgba(0,0,0,0.5); }
            h1 { color: #ef4444; margin-top: 0; font-size: 1.5rem; }
            p { color: #9ca3af; line-height: 1.6; }
            button { background: #3b82f6; border: none; color: white; padding: 0.75rem 1.5rem; border-radius: 8px; font-weight: 600; cursor: pointer; margin-top: 1.5rem; }
          </style>
        </head>
        <body>
          <div class="card">
            <h1>⚠️ 유튜브 인증 실패</h1>
            <p>토큰 교환 처리 중 서버 오류가 발생했습니다: ${error.message}</p>
            <button onclick="window.close()">창 닫기</button>
          </div>
        </body>
      </html>`,
      { headers: { 'Content-Type': 'text/html; charset=UTF-8' }, status: 500 }
    );
  }
}
