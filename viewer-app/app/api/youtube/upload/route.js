import { NextResponse } from 'next/server';
import path from 'path';
import fs from 'fs';

const ACCOUNT_PATH = path.join(
  process.cwd(),
  '..',
  '_company',
  '_agents',
  'youtube',
  'tools',
  'youtube_account.json'
);

export async function POST(request) {
  try {
    const { videoUrl, title, description } = await request.json();

    if (!videoUrl) {
      return NextResponse.json({ success: false, error: 'videoUrl이 필요합니다.' }, { status: 400 });
    }

    // Resolve absolute path to video file
    let cleanUrl = videoUrl;
    if (cleanUrl.startsWith('/')) {
      cleanUrl = cleanUrl.substring(1);
    }
    const absoluteVideoPath = path.join(process.cwd(), 'public', cleanUrl);

    if (!fs.existsSync(absoluteVideoPath)) {
      return NextResponse.json({ 
        success: false, 
        error: `비디오 파일을 찾을 수 없습니다: ${absoluteVideoPath}` 
      }, { status: 400 });
    }

    if (!fs.existsSync(ACCOUNT_PATH)) {
      return NextResponse.json({ 
        success: true, 
        is_mock: true, 
        message: '시뮬레이션 완료: youtube_account.json이 없어 가상으로 업로드 완료 처리했습니다. (데모 모드)' 
      });
    }

    const account = JSON.parse(fs.readFileSync(ACCOUNT_PATH, 'utf-8'));
    
    // Check if OAuth refresh token is available
    if (!account.YOUTUBE_OAUTH_REFRESH_TOKEN) {
      return NextResponse.json({
        success: true,
        is_mock: true,
        message: '시뮬레이션 완료: YouTube OAuth 토큰이 설정되지 않아 가상 업로드 처리했습니다. 에이전트 튜너에서 OAuth 설정을 추가하면 실제 유튜브 채널로 업로드됩니다.'
      });
    }

    console.log(`Starting YouTube Upload for ${absoluteVideoPath}...`);

    // 1. Refresh access token
    const accessToken = await refreshOAuthToken(account);

    // 2. Read video file
    const videoBuffer = fs.readFileSync(absoluteVideoPath);
    
    // 3. Prepare metadata and multipart body
    const metadata = {
      snippet: {
        title: title || 'AI Cinematic Short Video',
        description: description || 'Generated automatically by Connect AI Agents.',
        categoryId: '22' // People & Blogs
      },
      status: {
        privacyStatus: 'private' // Default to private for safety
      }
    };

    const boundary = 'antigravity_upload_boundary';
    
    // Build multipart raw body
    const headerBuffer = Buffer.from(
      `\r\n--${boundary}\r\n` +
      `Content-Type: application/json; charset=UTF-8\r\n\r\n` +
      `${JSON.stringify(metadata)}\r\n` +
      `--${boundary}\r\n` +
      `Content-Type: video/mp4\r\n\r\n`
    );
    
    const footerBuffer = Buffer.from(`\r\n--${boundary}--\r\n`);
    
    // Concat buffers for full payload
    const payload = Buffer.concat([headerBuffer, videoBuffer, footerBuffer]);

    const uploadUrl = 'https://www.googleapis.com/upload/youtube/v3/videos?uploadType=multipart&part=snippet,status';
    
    console.log('Sending payload to YouTube Upload API...');
    const uploadRes = await fetch(uploadUrl, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${accessToken}`,
        'Content-Type': `multipart/related; boundary=${boundary}`,
        'Content-Length': payload.length.toString()
      },
      body: payload
    });

    if (!uploadRes.ok) {
      const errText = await uploadRes.text();
      throw new Error(`YouTube Upload HTTP Error: ${errText}`);
    }

    const data = await uploadRes.json();
    console.log('YouTube Upload successful!', data.id);

    return NextResponse.json({
      success: true,
      videoId: data.id,
      is_mock: false,
      message: 'YouTube Shorts 비디오가 성공적으로 업로드되었습니다! (현재 비공개 상태)'
    });

  } catch (error) {
    console.error('Failed to upload video to YouTube:', error);
    return NextResponse.json({ 
      success: false, 
      error: `유튜브 업로드 실패: ${error.message}` 
    }, { status: 500 });
  }
}

// Refresh OAuth Access Token helper
async function refreshOAuthToken(account) {
  const clientId = account.YOUTUBE_OAUTH_CLIENT_ID;
  const clientSecret = account.YOUTUBE_OAUTH_CLIENT_SECRET;
  const refreshToken = account.YOUTUBE_OAUTH_REFRESH_TOKEN;

  if (!clientId || !clientSecret || !refreshToken) {
    throw new Error('OAuth credentials missing in youtube_account.json');
  }

  const response = await fetch('https://oauth2.googleapis.com/token', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/x-www-form-urlencoded'
    },
    body: new URLSearchParams({
      client_id: clientId,
      client_secret: clientSecret,
      refresh_token: refreshToken,
      grant_type: 'refresh_token'
    })
  });

  if (!response.ok) {
    const errText = await response.text();
    throw new Error(`OAuth token refresh failed: ${errText}`);
  }

  const data = await response.json();
  const newAccessToken = data.access_token;

  // Save new access token back to file if changed
  if (newAccessToken && newAccessToken !== account.YOUTUBE_OAUTH_ACCESS_TOKEN) {
    account.YOUTUBE_OAUTH_ACCESS_TOKEN = newAccessToken;
    fs.writeFileSync(ACCOUNT_PATH, JSON.stringify(account, null, 2), 'utf-8');
  }

  return newAccessToken;
}
