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

export async function POST(req) {
  try {
    const { videoPath, title, description, coupangLink } = await req.json();

    if (!videoPath || !fs.existsSync(videoPath)) {
      return NextResponse.json({ success: false, error: '비디오 파일이 존재하지 않습니다.' }, { status: 400 });
    }

    if (!fs.existsSync(ACCOUNT_PATH)) {
      return NextResponse.json({ success: false, error: 'youtube_account.json 설정 파일이 없습니다.' }, { status: 400 });
    }

    const account = JSON.parse(fs.readFileSync(ACCOUNT_PATH, 'utf-8'));
    if (!account.YOUTUBE_OAUTH_REFRESH_TOKEN) {
      return NextResponse.json({ success: false, error: 'YouTube OAuth 설정(Client ID, Secret, Refresh Token)이 설정되어 있지 않습니다.' }, { status: 400 });
    }

    console.log(`[YouTube Uploader] Starting upload for video: ${videoPath}`);

    // 1. Refresh OAuth access token
    let accessToken;
    try {
      accessToken = await refreshOAuthToken(account);
    } catch (tokenErr) {
      console.error('Failed to refresh YouTube token:', tokenErr);
      return NextResponse.json({ success: false, error: `토큰 갱신 실패: ${tokenErr.message}` }, { status: 500 });
    }

    // 2. Upload video
    let videoId;
    try {
      videoId = await uploadToYoutube(accessToken, videoPath, title || 'Shorts Video', description || '');
      console.log(`[YouTube Uploader] Upload success! Video ID: ${videoId}`);
    } catch (uploadErr) {
      console.error('Failed to upload video to YouTube:', uploadErr);
      return NextResponse.json({ success: false, error: `유튜브 업로드 실패: ${uploadErr.message}` }, { status: 500 });
    }

    // 3. Post pinned comment
    let commentStatus = 'not_attempted';
    let commentMessage = '고정댓글 등록 안 함';

    const commentLink = coupangLink ? coupangLink.trim() : '{COUPANG_LINK}';
    const pinnedCommentText = `사용한 제품👇\n\n${commentLink}\n\n파트너스 활동의 일환으로\n수수료를 받을 수 있습니다.`;

    try {
      console.log(`[YouTube Uploader] Posting pinned comment to video: ${videoId}`);
      await postCommentToYoutube(accessToken, videoId, pinnedCommentText);
      commentStatus = 'success';
      commentMessage = '영상 및 고정댓글 업로드 완료!';
    } catch (commentErr) {
      console.error('Failed to post pinned comment to YouTube:', commentErr);
      commentStatus = 'failed';
      commentMessage = '영상 업로드 성공, 고정댓글 게시 실패';
    }

    // 4. Update the history.json to set pinned_comment_status if history contains this videoPath
    try {
      const historyPath = path.join(process.cwd(), 'public', 'shorts', 'history.json');
      if (fs.existsSync(historyPath)) {
        const history = JSON.parse(fs.readFileSync(historyPath, 'utf-8'));
        const matchedRecord = history.find(r => r.videoUrl && videoPath.endsWith(r.videoUrl.replace(/^\/shorts\//, '')));
        if (matchedRecord) {
          matchedRecord.youtubeVideoId = videoId;
          matchedRecord.isMockUpload = false;
          matchedRecord.pinned_comment_status = commentStatus;
          matchedRecord.upload_mode = 'product-driven';
          fs.writeFileSync(historyPath, JSON.stringify(history, null, 2), 'utf-8');
          console.log('[YouTube Uploader] Updated history.json with video ID and comment status.');
        }
      }
    } catch (histErr) {
      console.error('Failed to update history.json with upload info:', histErr);
    }

    return NextResponse.json({
      success: true,
      youtubeVideoId: videoId,
      commentStatus,
      message: commentMessage
    });

  } catch (error) {
    console.error('[YouTube Uploader] Route Error:', error);
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}

// Refresh Access Token
async function refreshOAuthToken(account) {
  const clientId = account.YOUTUBE_OAUTH_CLIENT_ID;
  const clientSecret = account.YOUTUBE_OAUTH_CLIENT_SECRET;
  const refreshToken = account.YOUTUBE_OAUTH_REFRESH_TOKEN;

  if (!clientId || !clientSecret || !refreshToken) {
    throw new Error('OAuth credentials missing in youtube_account.json');
  }

  const response = await fetch('https://oauth2.googleapis.com/token', {
    method: 'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
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
  const accessToken = data.access_token;

  if (accessToken) {
    account.YOUTUBE_OAUTH_ACCESS_TOKEN = accessToken;
    fs.writeFileSync(ACCOUNT_PATH, JSON.stringify(account, null, 2), 'utf-8');
  }
  return accessToken;
}

// Upload Video
async function uploadToYoutube(accessToken, videoFilePath, title, description) {
  const videoBuffer = fs.readFileSync(videoFilePath);
  const metadata = {
    snippet: {
      title,
      description,
      categoryId: '22'
    },
    status: {
      privacyStatus: 'private'
    }
  };

  const boundary = 'antigravity_autopilot_upload_boundary';
  const headerBuffer = Buffer.from(
    `\r\n--${boundary}\r\n` +
    `Content-Type: application/json; charset=UTF-8\r\n\r\n` +
    `${JSON.stringify(metadata)}\r\n` +
    `--${boundary}\r\n` +
    `Content-Type: video/mp4\r\n\r\n`
  );
  const footerBuffer = Buffer.from(`\r\n--${boundary}--\r\n`);
  const payload = Buffer.concat([headerBuffer, videoBuffer, footerBuffer]);

  const uploadUrl = 'https://www.googleapis.com/upload/youtube/v3/videos?uploadType=multipart&part=snippet,status';

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
    const errorText = await uploadRes.text();
    throw new Error(`YouTube API returned status ${uploadRes.status}: ${errorText}`);
  }

  const data = await uploadRes.json();
  return data.id;
}

// Post Comment
async function postCommentToYoutube(accessToken, videoId, commentText) {
  const commentUrl = 'https://www.googleapis.com/youtube/v3/commentThreads?part=snippet';
  
  const response = await fetch(commentUrl, {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${accessToken}`,
      'Content-Type': 'application/json'
    },
    body: JSON.stringify({
      snippet: {
        videoId: videoId,
        topLevelComment: {
          snippet: {
            textOriginal: commentText
          }
        }
      }
    })
  });

  if (!response.ok) {
    const errorText = await response.text();
    throw new Error(`YouTube API returned status ${response.status}: ${errorText}`);
  }
}
