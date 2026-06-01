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

export async function GET() {
  try {
    const config = loadConfig();
    const hasClientId = !!config.YOUTUBE_OAUTH_CLIENT_ID;
    const hasClientSecret = !!config.YOUTUBE_OAUTH_CLIENT_SECRET;
    const hasRefreshToken = !!config.YOUTUBE_OAUTH_REFRESH_TOKEN;

    return NextResponse.json({
      success: true,
      authenticated: hasClientId && hasClientSecret && hasRefreshToken,
      clientId: config.YOUTUBE_OAUTH_CLIENT_ID || '',
      clientSecret: config.YOUTUBE_OAUTH_CLIENT_SECRET ? '••••••••' : '',
      hasRefreshToken
    });
  } catch (error) {
    return NextResponse.json(
      { success: false, error: error.message },
      { status: 500 }
    );
  }
}

export async function POST(request) {
  try {
    const body = await request.json();
    const { action } = body;

    const config = loadConfig();

    if (action === 'save_credentials') {
      const { clientId, clientSecret } = body;
      if (!clientId || !clientSecret) {
        return NextResponse.json(
          { success: false, error: 'OAuth Client ID와 Client Secret을 모두 입력해 주세요.' },
          { status: 400 }
        );
      }

      config.YOUTUBE_OAUTH_CLIENT_ID = clientId.trim();
      config.YOUTUBE_OAUTH_CLIENT_SECRET = clientSecret.trim();
      saveConfig(config);

      // Generate OAuth Redirect URL
      const redirectUri = 'http://localhost:3000/api/upload-youtube/callback';
      const oauthUrl = `https://accounts.google.com/o/oauth2/v2/auth?` + 
        new URLSearchParams({
          client_id: config.YOUTUBE_OAUTH_CLIENT_ID,
          redirect_uri: redirectUri,
          response_type: 'code',
          scope: 'https://www.googleapis.com/auth/youtube.upload',
          access_type: 'offline',
          prompt: 'consent'
        }).toString();

      return NextResponse.json({ success: true, redirectUrl: oauthUrl });
    }

    if (action === 'upload') {
      const { videoUrl, title, description } = body;

      if (!videoUrl || !title) {
        return NextResponse.json(
          { success: false, error: '업로드할 비디오 파일 정보와 제목이 필요합니다.' },
          { status: 400 }
        );
      }

      // Convert video URL (e.g. /shorts/coupang_xxx.mp4) to absolute local path
      let videoPath = '';
      if (videoUrl.startsWith('/shorts/')) {
        videoPath = path.join(process.cwd(), 'public', videoUrl);
      } else {
        videoPath = videoUrl; // assume absolute path
      }

      if (!fs.existsSync(videoPath)) {
        return NextResponse.json(
          { success: false, error: `비디오 파일을 찾을 수 없습니다: ${videoPath}` },
          { status: 400 }
        );
      }

      const clientId = config.YOUTUBE_OAUTH_CLIENT_ID;
      const clientSecret = config.YOUTUBE_OAUTH_CLIENT_SECRET;
      const refreshToken = config.YOUTUBE_OAUTH_REFRESH_TOKEN;

      if (!clientId || !clientSecret || !refreshToken) {
        return NextResponse.json(
          { success: false, error: '유튜브 인증이 완료되지 않았습니다. 인증을 진행해 주세요.' },
          { status: 401 }
        );
      }

      console.log('Refreshing Google OAuth access token...');
      const tokenRes = await fetch('https://oauth2.googleapis.com/token', {
        method: 'POST',
        headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
        body: new URLSearchParams({
          client_id: clientId,
          client_secret: clientSecret,
          refresh_token: refreshToken,
          grant_type: 'refresh_token'
        })
      });

      if (!tokenRes.ok) {
        const tokenErr = await tokenRes.text();
        console.error('Refresh token error response:', tokenErr);
        return NextResponse.json(
          { success: false, error: '액세스 토큰 갱신에 실패했습니다. 유튜브 인증을 다시 진행해 주세요.' },
          { status: 401 }
        );
      }

      const tokenData = await tokenRes.json();
      const accessToken = tokenData.access_token;

      console.log('Initiating YouTube resumable upload session...');
      const fileSize = fs.statSync(videoPath).size;
      const metadata = {
        snippet: {
          title: title.slice(0, 100), // Max 100 chars
          description: description || '',
          categoryId: '22', // People & Blogs
          tags: ['쿠팡파트너스', '쇼츠', '추천템']
        },
        status: {
          privacyStatus: 'public', // direct public upload
          selfDeclaredMadeForKids: false
        }
      };

      const initiateRes = await fetch('https://www.googleapis.com/upload/youtube/v3/videos?uploadType=resumable&part=snippet,status', {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${accessToken}`,
          'Content-Type': 'application/json; charset=UTF-8',
          'X-Upload-Content-Length': fileSize.toString(),
          'X-Upload-Content-Type': 'video/mp4'
        },
        body: JSON.stringify(metadata)
      });

      if (!initiateRes.ok) {
        const errText = await initiateRes.text();
        console.error('YouTube initiate session error:', errText);
        return NextResponse.json(
          { success: false, error: `유튜브 세션 시작 실패: ${errText}` },
          { status: 500 }
        );
      }

      const uploadUrl = initiateRes.headers.get('Location');
      if (!uploadUrl) {
        return NextResponse.json(
          { success: false, error: '유튜브 업로드 세션 URL을 받지 못했습니다.' },
          { status: 500 }
        );
      }

      console.log('Uploading video file binary stream...');
      const fileBuffer = fs.readFileSync(videoPath);
      
      const uploadRes = await fetch(uploadUrl, {
        method: 'PUT',
        headers: {
          'Content-Length': fileSize.toString(),
          'Content-Type': 'video/mp4'
        },
        body: fileBuffer
      });

      if (!uploadRes.ok) {
        const errText = await uploadRes.text();
        console.error('YouTube video binary upload error:', errText);
        return NextResponse.json(
          { success: false, error: `유튜브 파일 업로드 전송 실패: ${errText}` },
          { status: 500 }
        );
      }

      const uploadData = await uploadRes.json();
      console.log('YouTube video upload successful! ID:', uploadData.id);

      return NextResponse.json({
        success: true,
        videoId: uploadData.id,
        videoUrl: `https://www.youtube.com/shorts/${uploadData.id}`
      });
    }

    return NextResponse.json(
      { success: false, error: '잘못된 액션 요청입니다.' },
      { status: 400 }
    );

  } catch (error) {
    console.error('YouTube Upload Handler Error:', error);
    return NextResponse.json(
      { success: false, error: error.message },
      { status: 500 }
    );
  }
}
