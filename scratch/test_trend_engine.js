// Test script to verify YouTube Trend Intelligence Engine logic
const path = require('path');
require('dotenv').config({ path: path.join(__dirname, '..', 'viewer-app', '.env.local') });

// Since we are running in Node.js commonjs environment, let's dynamically import or simulate
// The main logic from trendEngine.js
const { searchYoutubeMarket, extractTrendDNA, evaluateScriptNovelty } = require('../viewer-app/app/lib/trendEngine.js');

async function testRun() {
  console.log('====================================');
  console.log('   Trend Engine Verification Test   ');
  console.log('====================================');

  const youtubeKey = process.env.YOUTUBE_API_KEY;
  console.log('1. YOUTUBE_API_KEY Existence Status:', youtubeKey ? 'EXISTS' : 'NOT FOUND');

  const keyword = '아이폰 15';

  // Test searchYoutubeMarket
  console.log('\n2. Testing searchYoutubeMarket...');
  const searchRes = await searchYoutubeMarket(keyword);
  console.log('Result Success:', searchRes.success);
  console.log('Result Reason:', searchRes.reason || 'None');
  console.log('Collected Videos Count:', searchRes.data ? searchRes.data.length : 0);

  if (!youtubeKey) {
    console.log('-> Verified: Disabled gracefully when API Key is absent.');
  }

  // Create mock videos list (Real Data Only rule verification)
  // We check if mock data is isolated and does not enter trend_dna_db.json
  console.log('\n3. Testing Mock Data Isolation (Real Data Only)...');
  const mockVideos = [
    {
      video_id: 'mock_123',
      title: '아이폰 15 극강 리뷰',
      channel_title: '테크튜브',
      published_at: new Date().toISOString(),
      description: '아이폰 15를 한 달 동안 사용해본 정직한 후기',
      thumbnail_url: 'http://example.com/thumb.jpg',
      duration: 180,
      view_count: 50000,
      like_count: 1200,
      comment_count: 450,
      search_keyword: keyword,
      collected_at: new Date().toISOString()
    }
  ];

  console.log('Extracting Mock DNA to check if it saves to trend_dna_mock_db.json...');
  const mockDNA = await extractTrendDNA(keyword, mockVideos, true); // true indicates mock DB
  console.log('Mock DNA Result Status:', mockDNA ? 'SUCCESS' : 'FAILED');

  const mockDbExists = require('fs').existsSync(path.join(__dirname, '..', '_company', 'trend_dna_mock_db.json'));
  console.log('Does trend_dna_mock_db.json exist?', mockDbExists ? 'YES (Correct)' : 'NO');
  
  const realDbPath = path.join(__dirname, '..', '_company', 'trend_dna_db.json');
  let realDbContainsMock = false;
  if (require('fs').existsSync(realDbPath)) {
    const content = JSON.parse(require('fs').readFileSync(realDbPath, 'utf-8'));
    if (content[keyword] && content[keyword].isMock) {
      realDbContainsMock = true;
    }
  }
  console.log('Does trend_dna_db.json contain mock data?', realDbContainsMock ? 'YES (Contaminated!)' : 'NO (Clean & Correct!)');

  // Test Novelty Assessment
  if (mockDNA) {
    console.log('\n4. Testing Similarity Check and Novelty Score...');
    const testShortsPlan = {
      title: '아이폰 15 안 사면 후회하는 이유',
      script: '아직도 아이폰 15 고민 중이신가요? 이 영상 하나로 한 번에 고민을 끝내 드리겠습니다.',
      scenes: [
        { cutIndex: 1, subtitle: '아이폰 15 안 사면 후회하는 이유', caption: '아이폰 15 안 사면 후회하는 이유', narration: '아직도 아이폰 15 고민 중이신가요?' }
      ]
    };

    const noveltyResult = await evaluateScriptNovelty(testShortsPlan, mockDNA);
    if (noveltyResult) {
      console.log('Novelty Score calculated:', noveltyResult.noveltyScore);
      console.log('Hook Similarity:', noveltyResult.hookSimilarity);
      console.log('Reality Check Verdict:', noveltyResult.realityCheck?.verdict);
    } else {
      console.log('Assessment returned null');
    }
  }
}

testRun().catch(console.error);
