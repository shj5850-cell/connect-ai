const fs = require('fs');
const path = require('path');

const AUDIT_RUNS = [
  { category: 'AI', productTitle: 'AI 자동화 마스터 클래스 수강권', styleDna: 'Motivation', usedStyle: 'Cinematic', hookType: '호기심형', shotPattern: 'C형 (균등형)' },
  { category: '부업', productTitle: '무자본 1인 창업 올인원 패키지', styleDna: 'Minimal', usedStyle: 'Photorealistic', hookType: '숫자형', shotPattern: 'A형 (빌드업)' },
  { category: '전자책', productTitle: '월 100만원 수익형 전자책 템플릿', styleDna: 'Curiosity', usedStyle: 'Luxury Commercial', hookType: '비밀형', shotPattern: 'B형 (임팩트)' },
  { category: '커피', productTitle: '가성비 홈카페 에스프레소 머신', styleDna: 'ASMR', usedStyle: 'Minimal', hookType: '실험형', shotPattern: 'D형 (빠른 템포)' },
  { category: '건강', productTitle: '정관장 홍삼정 에브리타임', styleDna: 'Emotional', usedStyle: 'Documentary', hookType: '충격형', shotPattern: 'E형 (느린 호흡)' },
  { category: '반려견', productTitle: '유기농 저알러지 강아지 사료', styleDna: 'Storytelling', usedStyle: 'Anime', hookType: '스토리형', shotPattern: 'C형 (균등형)' },
  { category: '청소업', productTitle: '친환경 무선 스팀 물걸레 청소기', styleDna: 'Life Hack', usedStyle: 'Retro', hookType: '비교형', shotPattern: 'A형 (빌드업)' },
  { category: '투자', productTitle: '주식 초보자를 위한 밸류에이션 차트북', styleDna: 'Luxury Tech', usedStyle: '3D Render', hookType: '논란형', shotPattern: 'B형 (임팩트)' },
  { category: '자기계발', productTitle: '습관 형성 100일 만다라트 플래너', styleDna: 'Motivation', usedStyle: 'Hyperrealistic', hookType: '반전형', shotPattern: 'D형 (빠른 템포)' },
  { category: '미스터리', productTitle: '세계 미스터리 & 음모론 백과사전', styleDna: 'Horror', usedStyle: 'Dark Horror', hookType: '공포형', shotPattern: 'E형 (느린 호흡)' },
  { category: '백룸', productTitle: '백룸 괴담 단편 소설집', styleDna: 'Backrooms', usedStyle: 'Dark Horror', hookType: '공포형', shotPattern: 'C형 (균등형)' },
  { category: '생활꿀팁', productTitle: '다이소 가성비 리빙 정리 수납함', styleDna: 'Life Hack', usedStyle: 'Minimal', hookType: '숫자형', shotPattern: 'A형 (빌드업)' },
  { category: 'AI', productTitle: 'ChatGPT 활용 블로그 자동화 솔루션', styleDna: 'Luxury Tech', usedStyle: 'Cinematic', hookType: '비밀형', shotPattern: 'B형 (임팩트)' },
  { category: '부업', productTitle: '쿠팡 파트너스 오토 블로그 툴킷', styleDna: 'Curiosity', usedStyle: 'Photorealistic', hookType: '실험형', shotPattern: 'C형 (균등형)' },
  { category: '전자책', productTitle: '하루 5분 투입 월 50만원 전자책 공략집', styleDna: 'Motivation', usedStyle: 'Luxury Commercial', hookType: '숫자형', shotPattern: 'A형 (빌드업)' },
  { category: '커피', productTitle: '스페셜티 드립백 커피 테이스터 세트', styleDna: 'ASMR', usedStyle: 'Minimal', hookType: '호기심형', shotPattern: 'D형 (빠른 템포)' },
  { category: '건강', productTitle: '고농축 비타민C 메가도스 영양제', styleDna: 'Product Review', usedStyle: 'Documentary', hookType: '반전형', shotPattern: 'E형 (느린 호흡)' },
  { category: '반려견', productTitle: '반려견 관절 건강 전용 마사지 매트', styleDna: 'Storytelling', usedStyle: 'Hyperrealistic', hookType: '스토리형', shotPattern: 'C형 (균등형)' },
  { category: '자기계발', productTitle: '목표 달성 다이어리 및 플래너 패키지', styleDna: 'Minimal', usedStyle: 'Cinematic', hookType: '충격형', shotPattern: 'A형 (빌드업)' },
  { category: '투자', productTitle: '미국 배당주 투자 로드맵 소책자', styleDna: 'Luxury Tech', usedStyle: '3D Render', hookType: '숫자형', shotPattern: 'B형 (임팩트)' }
];

const BASE_URL = 'http://localhost:3000';
const AUDIT_LOG_PATH = path.join(__dirname, 'audit_results.json');

async function sleep(ms) {
  return new Promise(resolve => setTimeout(resolve, ms));
}

async function runSingleAutopilot(params, index) {
  console.log(`\n==================================================`);
  console.log(`[Run ${index + 1}/20] Starting Category: ${params.category}, Product: ${params.productTitle}`);
  console.log(`==================================================`);

  // Start Autopilot
  const startRes = await fetch(`${BASE_URL}/api/autopilot`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(params)
  });

  if (!startRes.ok) {
    const errorText = await startRes.text();
    throw new Error(`Failed to start autopilot: ${errorText}`);
  }

  const startData = await startRes.json();
  console.log('Autopilot trigger response:', startData.message);

  // Poll status
  let attempts = 0;
  while (true) {
    await sleep(5000); // Poll every 5s
    attempts++;
    
    let data;
    try {
      const statusRes = await fetch(`${BASE_URL}/api/autopilot`);
      if (!statusRes.ok) {
        console.warn(`[Poll Warning] HTTP status: ${statusRes.status}`);
        continue;
      }
      data = await statusRes.json();
    } catch (e) {
      console.warn(`[Poll Error] Failed to fetch status: ${e.message}`);
      continue;
    }
    
    if (data.status === 'completed') {
      console.log(`\n[Run ${index + 1} Success] completed in ${attempts * 5} seconds!`);
      return data;
    } else if (data.status === 'error' || data.step === 'error' || data.error_message) {
      console.error(`\n[Run ${index + 1} Error] Autopilot reported failure:`, data.error_message || data.message);
      throw new Error(data.error_message || data.message || 'Unknown autopilot error');
    } else {
      // Log progress
      if (attempts % 3 === 0) {
        console.log(`Progress: ${data.progress}% | Step: ${data.step} | Message: ${data.message}`);
      }
    }
  }
}

async function runAudit() {
  console.log(`Starting Phase 5: Real Output Quality Audit of 20 Shorts Videos...`);
  
  let results = [];
  if (fs.existsSync(AUDIT_LOG_PATH)) {
    try {
      results = JSON.parse(fs.readFileSync(AUDIT_LOG_PATH, 'utf-8'));
      console.log(`Loaded ${results.length} existing results from ${AUDIT_LOG_PATH}`);
    } catch (e) {
      console.warn('Failed to parse existing audit results, starting fresh:', e.message);
    }
  }

  for (let i = 0; i < AUDIT_RUNS.length; i++) {
    const runParams = AUDIT_RUNS[i];
    
    // Skip if already completed in previous attempt
    const alreadyDone = results.find(r => r.index === i + 1);
    if (alreadyDone) {
      console.log(`[Run ${i + 1}/20] Already completed: ${runParams.category} / ${runParams.productTitle}. Skipping.`);
      continue;
    }

    let retryCount = 0;
    const maxRetries = 2;
    let completedData = null;

    while (retryCount <= maxRetries && !completedData) {
      try {
        completedData = await runSingleAutopilot(runParams, i);
      } catch (e) {
        retryCount++;
        console.error(`Attempt ${retryCount} failed: ${e.message}`);
        if (retryCount <= maxRetries) {
          console.log(`Retrying run ${i + 1} in 10 seconds...`);
          await sleep(10000);
        } else {
          console.error(`Run ${i + 1} failed permanently after ${maxRetries} retries.`);
        }
      }
    }

    if (completedData) {
      results.push({
        index: i + 1,
        forcedParams: runParams,
        result: completedData
      });
      // Save progress incrementally
      fs.writeFileSync(AUDIT_LOG_PATH, JSON.stringify(results, null, 2), 'utf-8');
      console.log(`[Saved] Incremental audit progress written to ${AUDIT_LOG_PATH}`);
    }
    
    // Cool down between videos
    await sleep(2000);
  }

  console.log(`\n==================================================`);
  console.log(`ALL 20 SHORTS RUNS PROCESS COMPLETED!`);
  console.log(`Total successful completions: ${results.length}/20`);
  console.log(`==================================================`);
}

runAudit().catch(err => {
  console.error('Audit script crashed:', err);
});
