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

// Fetch YouTube Comments
export async function GET(request) {
  try {
    const { searchParams } = new URL(request.url);
    const useLive = searchParams.get('live') === 'true';

    if (!fs.existsSync(ACCOUNT_PATH)) {
      return NextResponse.json({ success: false, error: 'youtube_account.json 설정 파일이 없습니다.' });
    }

    const account = JSON.parse(fs.readFileSync(ACCOUNT_PATH, 'utf-8'));
    const apiKey = account.YOUTUBE_API_KEY;
    const channelId = account.MY_CHANNEL_ID;

    if (!apiKey || !channelId || !useLive) {
      // Fallback to parsed harvester logs or mock data if API credentials are not set or live is false
      const comments = getMockComments();
      return NextResponse.json({ success: true, comments, is_mock: true });
    }

    // Refresh OAuth Token to make sure we are authorized if needed, but for listing, simple API key or OAuth works.
    // We will use OAuth access token if available, otherwise API key.
    let accessToken = account.YOUTUBE_OAUTH_ACCESS_TOKEN;
    if (account.YOUTUBE_OAUTH_REFRESH_TOKEN) {
      accessToken = await refreshOAuthToken(account);
    }

    // Call YouTube API: commentThreads
    const url = `https://www.googleapis.com/youtube/v3/commentThreads?part=snippet&allThreadsRelatedToChannelId=${channelId}&maxResults=10&key=${apiKey}`;
    const headers = accessToken ? { Authorization: `Bearer ${accessToken}` } : {};

    const res = await fetch(url, { headers });
    if (!res.ok) {
      const errText = await res.text();
      console.warn('YouTube API failed, loading mock comments instead. Details:', errText);
      return NextResponse.json({ success: true, comments: getMockComments(), is_mock: true, error_log: errText });
    }

    const data = await res.json();
    const comments = data.items.map(item => {
      const topComment = item.snippet.topLevelComment.snippet;
      return {
        id: item.id,
        author: topComment.authorDisplayName,
        text: topComment.textDisplay,
        likes: topComment.likeCount,
        publishedAt: topComment.publishedAt,
        videoId: topComment.videoId,
        canReply: true,
        aiSuggestion: 'AI 답변을 생성하는 중...'
      };
    });

    // Generate AI suggestions for each comment asynchronously or on-the-fly
    for (const comment of comments) {
      comment.aiSuggestion = await generateAiReply(comment.text);
    }

    return NextResponse.json({ success: true, comments, is_mock: false });

  } catch (error) {
    console.error('Failed to get comments:', error);
    return NextResponse.json({ success: true, comments: getMockComments(), is_mock: true, error_details: error.message });
  }
}

// Reply to a YouTube Comment
export async function POST(request) {
  try {
    const { commentId, replyText } = await request.json();
    if (!commentId || !replyText) {
      return NextResponse.json({ success: false, error: 'commentId와 replyText가 필요합니다.' }, { status: 400 });
    }

    if (!fs.existsSync(ACCOUNT_PATH)) {
      return NextResponse.json({ success: false, error: 'youtube_account.json 설정 파일이 없습니다.' }, { status: 400 });
    }

    const account = JSON.parse(fs.readFileSync(ACCOUNT_PATH, 'utf-8'));
    
    // Check if it is a mock comment
    if (commentId.startsWith('mock_')) {
      // Simulate successful reply for mock comments
      return NextResponse.json({ 
        success: true, 
        message: '시뮬레이션 완료: 답글이 정상 등록되었습니다. (데모 모드)',
        reply: {
          id: `mock_reply_${Math.random().toString(36).substr(2, 9)}`,
          text: replyText,
          publishedAt: new Date().toISOString()
        }
      });
    }

    if (!account.YOUTUBE_OAUTH_REFRESH_TOKEN) {
      return NextResponse.json({ success: false, error: 'YouTube OAuth 설정(Client ID, Secret, Refresh Token)이 입력되지 않았습니다.' }, { status: 400 });
    }

    // Refresh OAuth Token
    const accessToken = await refreshOAuthToken(account);

    // Call YouTube API: comments.insert
    const replyUrl = 'https://www.googleapis.com/youtube/v3/comments?part=snippet';
    const replyRes = await fetch(replyUrl, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${accessToken}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        snippet: {
          parentId: commentId,
          textOriginal: replyText
        }
      })
    });

    if (!replyRes.ok) {
      const errText = await replyRes.text();
      throw new Error(`YouTube API Reply Error: ${errText}`);
    }

    const replyData = await replyRes.json();
    return NextResponse.json({ success: true, reply: replyData });

  } catch (error) {
    console.error('Failed to post reply:', error);
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
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

// AI Comment reply draft generation (Gemini -> Ollama -> templates)
async function generateAiReply(commentText) {
  const prompt = `당신은 유튜버 채널의 친절하고 센스있는 AI 비서 영숙입니다. 시청자의 댓글에 대해 진정성 있고 위트 있는 대댓글(답글)을 한 줄로 작성해 주세요. 이모지를 1~2개 섞어서 친근하게 써주세요.
  
시청자 댓글: "${commentText}"
AI 비서 영숙의 답글 초안:`;

  // Try Gemini API first (if key exists)
  if (process.env.GEMINI_API_KEY) {
    try {
      const response = await fetch(
        `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash:generateContent?key=${process.env.GEMINI_API_KEY}`,
        {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            contents: [{ parts: [{ text: prompt }] }],
            generationConfig: { maxOutputTokens: 100 }
          })
        }
      );
      if (response.ok) {
        const resJson = await response.json();
        const generated = resJson.contents?.[0]?.parts?.[0]?.text;
        if (generated) return generated.trim().replace(/^"|"$/g, '');
      }
    } catch (e) {
      console.warn('Gemini draft generation failed, falling back to Ollama/template:', e.message);
    }
  }

  // Try local Ollama (if configured)
  try {
    const account = JSON.parse(fs.readFileSync(ACCOUNT_PATH, 'utf-8'));
    const ollamaUrl = account.OLLAMA_URL || 'http://127.0.0.1:11434';
    const model = account.MODEL || 'qwen2.5:1.5b';

    const response = await fetch(`${ollamaUrl}/api/generate`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        model: model,
        prompt: prompt,
        stream: false,
        options: { num_predict: 100 }
      })
    });
    
    if (response.ok) {
      const data = await response.json();
      if (data.response) {
        return data.response.trim().replace(/^"|"$/g, '');
      }
    }
  } catch (e) {
    // ignore, fallback to default templates
  }

  // Smart Template fallback
  const lowerText = commentText.toLowerCase();
  if (lowerText.includes('감사') || lowerText.includes('고맙') || lowerText.includes('thank')) {
    return '시청해주셔서 정말 감사드립니다! 앞으로 더 유익한 영상으로 찾아뵐게요 😊❤️';
  }
  if (lowerText.includes('?') || lowerText.includes('어떻게') || lowerText.includes('질문')) {
    return '좋은 질문 감사드립니다! 질문주신 부분에 대해 꼼꼼하게 정리해서 다음 영상이나 고정댓글로 공유해 드릴게요! 💡';
  }
  if (lowerText.includes('대박') || lowerText.includes('최고') || lowerText.includes('꿀팁')) {
    return '좋게 봐주셔서 기쁩니다! 힘내서 더욱 참신하고 좋은 꿀팁들 많이 가져오겠습니다 👍✨';
  }
  return '따뜻한 댓글 남겨주셔서 정말 감사합니다! 행복한 하루 보내세요! 🎈🤖';
}

function getMockComments() {
  return [
    {
      id: 'mock_1',
      author: '김코딩',
      text: '쇼츠 영상 퀄리티가 대박이네요! 4컷으로 이야기를 완결성 있게 풀어내니까 몰입감이 엄청나요.',
      likes: 12,
      publishedAt: new Date(Date.now() - 30 * 60 * 1000).toISOString(),
      videoId: 'v123',
      canReply: true,
      aiSuggestion: '좋게 봐주셔서 기쁩니다! 힘내서 더욱 참신하고 좋은 꿀팁들 많이 가져오겠습니다 👍✨'
    },
    {
      id: 'mock_2',
      author: '이커머스맨',
      text: '수익화 모델 1차 분석 완료되었다고 하던데, 해외 PayPal 말고 국내 결제대행사(PG) 연동도 계획이 있으신가요?',
      likes: 8,
      publishedAt: new Date(Date.now() - 3 * 60 * 60 * 1000).toISOString(),
      videoId: 'v123',
      canReply: true,
      aiSuggestion: '좋은 질문 감사드립니다! 질문주신 부분에 대해 꼼꼼하게 정리해서 다음 영상이나 고정댓글로 공유해 드릴게요! 💡'
    },
    {
      id: 'mock_3',
      author: '테크러버',
      text: '혹시 에이전트들이 사용하는 백엔드 모델이 무엇인지 알 수 있을까요? 속도가 상당히 빠른 것 같습니다.',
      likes: 5,
      publishedAt: new Date(Date.now() - 6 * 60 * 60 * 1000).toISOString(),
      videoId: 'v124',
      canReply: true,
      aiSuggestion: '시청해주셔서 정말 감사드립니다! 앞으로 더 유익한 영상으로 찾아뵐게요 😊❤️'
    },
    {
      id: 'mock_4',
      author: '유튜브꿈나무',
      text: '쇼츠 제작을 일괄 자동화하면 채널 지수가 떨어지지는 않나요? 썸네일도 신경 써야 할 텐데요.',
      likes: 2,
      publishedAt: new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString(),
      videoId: 'v125',
      canReply: true,
      aiSuggestion: '좋은 의견 감사합니다! 자동화하더라도 인간의 검토와 썸네일 커스텀을 추가해 퀄리티를 유지하는 방향으로 돕고 있습니다 🌟'
    }
  ];
}
