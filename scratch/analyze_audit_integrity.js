const fs = require('fs');
const path = require('path');

const AUDIT_LOG_PATH = path.join(__dirname, 'audit_results.json');

if (!fs.existsSync(AUDIT_LOG_PATH)) {
  console.error(`File not found: ${AUDIT_LOG_PATH}`);
  process.exit(1);
}

const results = JSON.parse(fs.readFileSync(AUDIT_LOG_PATH, 'utf-8'));

console.log(`Analyzing ${results.length} runs...`);

const runReport = [];

results.forEach(run => {
  const index = run.index;
  const product = run.forcedParams.productTitle;
  const category = run.forcedParams.category;
  
  const scriptTitle = run.result.scriptData ? run.result.scriptData.title : '';
  const firstCutSub = (run.result.scriptData && run.result.scriptData.cuts && run.result.scriptData.cuts[0]) 
    ? run.result.scriptData.cuts[0].subtitle : '';
  
  // Check if script is fallback
  let isScriptFallback = false;
  if (scriptTitle === 'M3 맥북으로 AI 수익화 시작하는 법' && firstCutSub.includes('하루 10분')) {
    isScriptFallback = true;
  } else if (scriptTitle === '노트북 하나로 월 100만원 버는 법' && firstCutSub.includes('퇴근 후 딱 30분')) {
    isScriptFallback = true;
  } else if (scriptTitle === '피로회복 끝판왕 홍삼정 추천' && firstCutSub.includes('매일 아침 피곤')) {
    isScriptFallback = true;
  }

  // Check if evaluation is fallback
  const evalHook = run.result.preUploadAnalysis && run.result.preUploadAnalysis.evaluations 
    ? run.result.preUploadAnalysis.evaluations.hookStrength : '';
  const isEvalFallback = evalHook.includes('분석 오류로 기본 평가 대체') || evalHook.includes('데이터 수집 중');

  // Check if images are fallback
  const cuts = run.result.scriptData ? run.result.scriptData.cuts || [] : [];
  let fallbackImgCount = 0;
  cuts.forEach(cut => {
    const feedback = cut.vision_feedback || '';
    if (feedback.includes('스톡 이미지') || feedback.includes('AI 생성 오류') || feedback.includes('fallback') || feedback.includes('API key missing')) {
      fallbackImgCount++;
    }
  });
  const isImgFallback = fallbackImgCount > 0;

  // Calculate score
  let score = 0;
  if (typeof run.result.quality_score === 'number') {
    score = run.result.quality_score;
  } else if (run.result.preUploadAnalysis && run.result.preUploadAnalysis.scores) {
    const scores = run.result.preUploadAnalysis.scores;
    const sum = (scores.hookStrength || 0) + (scores.scriptContent || 0) + (scores.sceneVisuals || 0) + (scores.subtitleAesthetics || 0) + (scores.soundDesign || 0);
    let avg = sum / 5;
    if (run.result.preUploadAnalysis.similarityPenaltyApplied) {
      avg -= 15;
    }
    score = Math.round(avg);
  }

  // 1. Gemini Call Success Category
  let scriptGeminiSuccess = !isScriptFallback;
  let evalGeminiSuccess = !isEvalFallback;
  
  let geminiStatus = '';
  if (scriptGeminiSuccess && evalGeminiSuccess) {
    geminiStatus = 'Gemini Success';
  } else if (!scriptGeminiSuccess && !evalGeminiSuccess) {
    geminiStatus = '429 Fallback';
  } else {
    const scriptMsg = scriptGeminiSuccess ? 'Script:Success' : 'Script:Fallback';
    const evalMsg = evalGeminiSuccess ? 'Eval:Success' : 'Eval:Fallback';
    geminiStatus = `${scriptMsg}, ${evalMsg}`;
  }

  // 2. Fallback Usage Category
  let fallbackCategory = '';
  if (!isScriptFallback && !isEvalFallback) {
    fallbackCategory = 'Gemini Generated';
  } else if (isScriptFallback && isEvalFallback) {
    fallbackCategory = 'Fallback Template';
  } else {
    fallbackCategory = 'Mixed';
  }

  runReport.push({
    index,
    category,
    product,
    geminiStatus,
    fallbackCategory,
    isScriptFallback,
    isEvalFallback,
    isImgFallback,
    score
  });
});

// Calculate statistics
let geminiGeneratedCount = 0;
let fallbackTemplateCount = 0;
let mixedCount = 0;

let sumActualAiScore = 0;
let countActualAi = 0;
let sumAllScore = 0;

runReport.forEach(r => {
  sumAllScore += r.score;
  
  if (r.fallbackCategory === 'Gemini Generated') {
    geminiGeneratedCount++;
    sumActualAiScore += r.score;
    countActualAi++;
  } else if (r.fallbackCategory === 'Fallback Template') {
    fallbackTemplateCount++;
  } else if (r.fallbackCategory === 'Mixed') {
    mixedCount++;
  }
});

const avgAll = sumAllScore / runReport.length;
const avgActualAi = countActualAi > 0 ? sumActualAiScore / countActualAi : 0;

console.log("\n=================== RUN STATUS ===================");
runReport.forEach(r => {
  console.log(`Run ${r.index}: Gemini Status: ${r.geminiStatus} | Fallback: ${r.fallbackCategory} | Score: ${r.score} | Prod: ${r.product}`);
});

console.log("\n=================== SUMMARY ===================");
console.log(`A. Gemini Generated: ${geminiGeneratedCount}`);
console.log(`B. Fallback Template: ${fallbackTemplateCount}`);
console.log(`C. Mixed: ${mixedCount}`);
console.log(`Average (Actual AI only - Gemini Generated): ${avgActualAi.toFixed(2)}`);
console.log(`Average (Including Fallback): ${avgAll.toFixed(2)}`);
