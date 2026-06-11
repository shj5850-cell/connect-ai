import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const DB_PATH = path.join(__dirname, '..', '..', '..', '_company', 'trend_dna_db.json');
const MOCK_DB_PATH = path.join(__dirname, '..', '..', '..', '_company', 'trend_dna_mock_db.json');

// Helper to call Gemini in JSON format with automatic retry
async function callGemini(systemPrompt, userPrompt, retryCount = 1) {
  const apiKey = process.env.GEMINI_API_KEY;
  if (!apiKey) {
    throw new Error('GEMINI_API_KEY is not defined.');
  }

  const salt = Math.random().toString(36).substring(2, 15) + '-' + Date.now();
  const enhancedUserPrompt = `${userPrompt}\n\n[Request Salt: ${salt}]`;
  const enhancedSystemPrompt = `${systemPrompt}\n\n[Instruction: Every request is independent. Ignore all previous inputs. Request Salt: ${salt}]`;

  let geminiUrl = `https://generativelanguage.googleapis.com/v1beta/models/gemini-flash-latest:generateContent?key=${apiKey}`;
  let requestBody = {
    contents: [{ parts: [{ text: `${enhancedSystemPrompt}\n\n${enhancedUserPrompt}` }] }],
    generationConfig: {
      temperature: 0.2, // Lower temperature to keep analysis grounded in actual facts
      maxOutputTokens: 8192,
      responseMimeType: "application/json"
    }
  };

  try {
    // If using vertex bear token flow
    if (apiKey.startsWith('ya29.')) {
      const projectNumber = process.env.GEMINI_PROJECT_NUMBER || '773040580705project';
      const region = 'us-central1';
      geminiUrl = `https://${region}-aiplatform.googleapis.com/v1/projects/${projectNumber}/locations/${region}/publishers/google/models/gemini-1.5-flash:generateContent`;
      const headers = {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${apiKey}`
      };
      requestBody = {
        contents: [{ role: 'user', parts: [{ text: `${enhancedSystemPrompt}\n\n${enhancedUserPrompt}` }] }],
        generationConfig: { 
          temperature: 0.2, 
          maxOutputTokens: 8192,
          responseMimeType: "application/json"
        }
      };
      const response = await fetch(geminiUrl, { method: 'POST', headers, body: JSON.stringify(requestBody) });
      if (!response.ok) {
        if ((response.status === 503 || response.status === 429) && retryCount > 0) {
          console.warn(`[Trend Engine] Gemini returned ${response.status}. Retrying in 2s...`);
          await new Promise(r => setTimeout(r, 2000));
          return callGemini(systemPrompt, userPrompt, retryCount - 1);
        }
        throw new Error(`Gemini API error: ${response.status} ${await response.text()}`);
      }
      const resData = await response.json();
      let text = resData.candidates?.[0]?.content?.parts?.[0]?.text;
      text = text.replace(/```json/g, '').replace(/```/g, '').trim();
      return JSON.parse(text);
    }

    const response = await fetch(geminiUrl, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(requestBody)
    });

    if (!response.ok) {
      if ((response.status === 503 || response.status === 429) && retryCount > 0) {
        console.warn(`[Trend Engine] Gemini returned ${response.status}. Retrying in 2s...`);
        await new Promise(r => setTimeout(r, 2000));
        return callGemini(systemPrompt, userPrompt, retryCount - 1);
      }
      throw new Error(`Gemini API error: ${response.status} ${await response.text()}`);
    }

    const resData = await response.json();
    let text = resData.candidates?.[0]?.content?.parts?.[0]?.text;
    if (!text) throw new Error('No content returned from Gemini');
    text = text.replace(/```json/g, '').replace(/```/g, '').trim();
    return JSON.parse(text);
  } catch (err) {
    if (retryCount > 0 && (err.message.includes('503') || err.message.includes('UNAVAILABLE') || err.message.includes('429'))) {
      console.warn(`[Trend Engine] Gemini request failed: ${err.message}. Retrying in 2s...`);
      await new Promise(r => setTimeout(r, 2000));
      return callGemini(systemPrompt, userPrompt, retryCount - 1);
    }
    throw err;
  }
}

// Convert ISO 8601 duration (e.g. PT1M30S) to seconds
function parseISO8601Duration(durationString) {
  if (!durationString) return null;
  const regex = /PT(?:(\d+)H)?(?:(\d+)M)?(?:(\d+)S)?/;
  const matches = durationString.match(regex);
  if (!matches) return null;
  const hours = parseInt(matches[1] || 0, 10);
  const minutes = parseInt(matches[2] || 0, 10);
  const seconds = parseInt(matches[3] || 0, 10);
  return hours * 3600 + minutes * 60 + seconds;
}

/**
 * Perform multiple expanded searches on YouTube API and de-duplicate video listings.
 */
export async function searchYoutubeMarket(keyword) {
  const apiKey = process.env.YOUTUBE_API_KEY;
  if (!apiKey || apiKey.trim() === '') {
    console.warn('[Trend Engine] YOUTUBE_API_KEY is missing. Trend Engine disabled.');
    return { success: false, reason: 'API_KEY_MISSING', data: [] };
  }

  try {
    const queries = [
      keyword,
      `${keyword} 후기`,
      `${keyword} 추천`,
      `${keyword} 리뷰`,
      `${keyword} 사용법`,
      `${keyword} 단점`,
      `${keyword} 비교`
    ];

    const allVideosMap = new Map();
    const collectedAt = new Date().toISOString();

    for (const q of queries) {
      console.log(`[Trend Engine] Searching YouTube API for query: "${q}"...`);
      const url = `https://www.googleapis.com/youtube/v3/search?part=snippet&maxResults=8&q=${encodeURIComponent(q)}&type=video&key=${apiKey}`;
      const res = await fetch(url);
      if (!res.ok) {
        console.error(`[Trend Engine] YouTube search fail for query "${q}": ${res.status} ${await res.text()}`);
        continue;
      }
      const searchData = await res.json();
      const items = searchData.items || [];

      for (const item of items) {
        const videoId = item.id?.videoId;
        if (!videoId) continue;
        if (!allVideosMap.has(videoId)) {
          allVideosMap.set(videoId, {
            video_id: videoId,
            title: item.snippet?.title || null,
            channel_title: item.snippet?.channelTitle || null,
            published_at: item.snippet?.publishedAt || null,
            description: item.snippet?.description || null,
            thumbnail_url: item.snippet?.thumbnails?.high?.url || item.snippet?.thumbnails?.default?.url || null,
            duration: null,
            view_count: null,
            like_count: null,
            comment_count: null,
            search_keyword: q,
            collected_at: collectedAt
          });
        }
      }
    }

    const uniqueVideoIds = Array.from(allVideosMap.keys());
    console.log(`[Trend Engine] Found ${uniqueVideoIds.length} unique videos. Fetching details...`);

    if (uniqueVideoIds.length === 0) {
      return { success: true, data: [] };
    }

    // Chunk video details requests in groups of 50
    const chunkSize = 50;
    for (let i = 0; i < uniqueVideoIds.length; i += chunkSize) {
      const chunk = uniqueVideoIds.slice(i, i + chunkSize);
      const url = `https://www.googleapis.com/youtube/v3/videos?part=statistics,contentDetails&id=${chunk.join(',')}&key=${apiKey}`;
      const res = await fetch(url);
      if (!res.ok) {
        console.error(`[Trend Engine] Failed to fetch video statistics: ${res.status}`);
        continue;
      }
      const detailsData = await res.json();
      const detailsItems = detailsData.items || [];

      for (const detail of detailsItems) {
        const v = allVideosMap.get(detail.id);
        if (v) {
          v.duration = parseISO8601Duration(detail.contentDetails?.duration);
          v.view_count = detail.statistics?.viewCount ? parseInt(detail.statistics.viewCount, 10) : null;
          v.like_count = detail.statistics?.likeCount ? parseInt(detail.statistics.likeCount, 10) : null;
          v.comment_count = detail.statistics?.commentCount ? parseInt(detail.statistics.commentCount, 10) : null;
        }
      }
    }

    const finalResults = Array.from(allVideosMap.values());
    return { success: true, data: finalResults };
  } catch (err) {
    console.error('[Trend Engine] YouTube search routine failed:', err);
    return { success: false, reason: 'FETCH_FAILED', error: err.message, data: [] };
  }
}

/**
 * Summarize real search listings using Gemini strictly, without inventing fake videos.
 */
export async function extractTrendDNA(keyword, searchResults, isMock = false) {
  if (!searchResults || searchResults.length === 0) {
    return null;
  }

  // Strictly summarize provided results
  const videoSummaries = searchResults.map((v, i) => `
Video #${i+1}:
- Title: ${v.title}
- Channel: ${v.channel_title}
- Published At: ${v.published_at}
- Description: ${v.description}
- Views: ${v.view_count || 'Unknown'}
- Likes: ${v.like_count || 'Unknown'}
- Comments: ${v.comment_count || 'Unknown'}
- Duration: ${v.duration ? `${v.duration}s` : 'Unknown'}
`).join('\n');

  const systemPrompt = `당신은 세계 최고 권위의 유튜브 트렌드 데이터 분석가 AI입니다.
주어진 영상 정보 목록(실제 검색 결과)을 바탕으로, 시장 트렌드와 패턴을 분석하여 마케팅 DNA를 추출하고 시장 포화도를 측정하는 업무를 수행합니다.

[중요 규칙]
1. 절대 존재하지 않는 비디오나 가짜 조회수, 가짜 수치 등을 창작해내지 마십시오.
2. 분석 대상은 오직 제공되는 목록 내의 비디오 정보들로 제한합니다.
3. 영상 유형(Format Type) 비율을 정직하게 측정하십시오. (예: 리뷰/후기형, 광고형, 실험형 등)
4. 제목, Hook, 자막 등에서 반복 사용되어 경쟁이 극도로 심한 과포화 단어 및 표현들을 찾아내십시오.

반드시 아래 JSON 스키마 형식으로만 응답해야 합니다.
출력 JSON 스키마:
{
  "dna": {
    "titlePatterns": ["가장 많이 보이는 제목 형식/키워드 분석 1 (한 줄)", "패턴 2"],
    "hookPatterns": ["자주 쓰이는 오프닝 후크 스타일 1", "스타일 2"],
    "captionStyle": "상위 노출 비디오들이 주로 사용하는 자막/메시지 스타일 묘사",
    "thumbnailStyle": "추정되는 상위 썸네일 특징 분석",
    "ctaPatterns": ["주로 관찰되는 댓글 유도 또는 구매 링크 등의 CTA 방식"]
  },
  "saturation": {
    "overusedPhrases": [
      { "phrase": "과포화 단어/문구 1", "rate": 0.45 },
      { "phrase": "과포화 단어/문구 2", "rate": 0.3 }
    ],
    "riskScore": 75
  },
  "gapOpportunity": {
    "typesDistribution": {
      "review": 0.7,
      "ads": 0.2,
      "experiment": 0.1
    },
    "recommendedType": "이 시장에서 빈틈인 추천 유형 (예: 'experiment')",
    "reason": "시장에서 가장 부족하며 차별성을 보일 수 있는 구체적인 이유"
  }
}`;

  const userPrompt = `[분석할 유튜브 검색 결과 데이터 목록 - 키워드: ${keyword}]
${videoSummaries}

이 데이터를 기반으로 트렌드 DNA를 요약 분석해 주세요.`;

  try {
    const analysis = await callGemini(systemPrompt, userPrompt);
    const resultPayload = {
      keyword,
      updatedAt: new Date().toISOString(),
      isMock,
      dna: analysis.dna,
      saturation: analysis.saturation,
      gapOpportunity: analysis.gapOpportunity,
      rawVideosCount: searchResults.length
    };

    // Save to the appropriate JSON DB
    const targetPath = isMock ? MOCK_DB_PATH : DB_PATH;
    
    // Ensure dir exists
    const dir = path.dirname(targetPath);
    if (!fs.existsSync(dir)) {
      fs.mkdirSync(dir, { recursive: true });
    }

    let currentDB = {};
    if (fs.existsSync(targetPath)) {
      try {
        currentDB = JSON.parse(fs.readFileSync(targetPath, 'utf-8'));
      } catch (e) {
        currentDB = {};
      }
    }
    
    currentDB[keyword] = resultPayload;
    fs.writeFileSync(targetPath, JSON.stringify(currentDB, null, 2), 'utf-8');
    
    console.log(`[Trend Engine] Saved trend DNA for "${keyword}" to ${targetPath}`);
    return resultPayload;
  } catch (err) {
    console.error('[Trend Engine] Extract Trend DNA via Gemini failed:', err);
    return null;
  }
}

/**
 * Grade an AI script draft against real Trend DNA.
 */
export async function evaluateScriptNovelty(shortsPlan, trendDNA) {
  if (!trendDNA) return null;

  const scriptSnippet = shortsPlan.script || (shortsPlan.scenes ? shortsPlan.scenes.map(s => s.narration).join(' ') : '');
  const title = shortsPlan.titles && shortsPlan.titles.length > 0 ? shortsPlan.titles[0] : (shortsPlan.title || '');
  const hook = shortsPlan.scenes && shortsPlan.scenes.length > 0 ? shortsPlan.scenes[0].caption : '';

  const systemPrompt = `당신은 최고 권위의 유튜브 영상 심사관 AI입니다.
기획된 쇼츠 초안(제목, 도입부 훅, 전체 대본)이 기존 유튜브 시장 트렌드 DNA와 비교하여 얼마나 독창적인지 검증하고 심사하는 심판관입니다.

[분석 기준]
1. Hook 유사도: 오프닝 훅이 기존 트렌드 후크와 겹치거나 뻔한 앵글인지 확인 (0-100%)
2. 제목 유사도: 추천 제목이 기존 제목 패턴과 유사한 단어 위주인지 비교 (0-100%)
3. 대본 유사도: 전체 설명과 대본이 흔한 구성인지 체크 (0-100%)
4. 구조 유사도: 컷 전환이나 흐름이 기존과 붕어빵인지 대조 (0-100%)
5. 신규성 점수 (Novelty Score): 0~100점. (0~40: 복제 위험/반려, 40~70: 평범/경계, 70~100: 차별화 우수)
6. Reality Check: "이 영상이 실제 유튜브 시장에서 독보적인 차별성을 가질 가능성이 있는가?" 에 대한 솔직하고 가차없는 피드백 작성.

반드시 아래 JSON 스키마 형식으로만 응답해야 합니다.
출력 JSON 스키마:
{
  "hookSimilarity": 45,
  "titleSimilarity": 30,
  "scriptSimilarity": 50,
  "structureSimilarity": 40,
  "noveltyScore": 82,
  "realityCheck": {
    "verdict": "차별성 유망함/유사함 판정 의견",
    "score": 85,
    "advice": "차별성을 더욱 기르기 위한 피드백 또는 경고"
  }
}`;

  const userPrompt = `[유튜브 시장 트렌드 DNA 데이터]
- 제목 패턴: ${JSON.stringify(trendDNA.dna?.titlePatterns)}
- 후크 스타일: ${JSON.stringify(trendDNA.dna?.hookPatterns)}
- 주로 사용되는 문구 (포화 상태): ${JSON.stringify(trendDNA.saturation?.overusedPhrases)}

[작성된 쇼츠 초안]
- 영상 제목: ${title}
- 도입부 후킹 문장: ${hook}
- 전체 대본 내용: ${scriptSnippet}

위 초안의 유사도 및 신규성을 평가해 주세요.`;

  try {
    const analysis = await callGemini(systemPrompt, userPrompt);
    return analysis;
  } catch (err) {
    console.error('[Trend Engine] Script novelty evaluation failed:', err);
    return null;
  }
}
