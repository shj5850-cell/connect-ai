const fs = require('fs');
const path = require('path');

const resultsPath = path.join(__dirname, 'audit_results.json');
if (!fs.existsSync(resultsPath)) {
  console.error("audit_results.json not found at:", resultsPath);
  process.exit(1);
}

let data;
try {
  data = JSON.parse(fs.readFileSync(resultsPath, 'utf-8'));
} catch (e) {
  console.error("Failed to parse audit_results.json:", e.message);
  process.exit(1);
}

console.log(`==================================================`);
console.log(`🔍 Starting Audit Results Quality & Reliability Verification`);
console.log(`==================================================`);
console.log(`Total runs registered in JSON: ${data.length}`);

// 1. Index Presence Check (1 to 20)
const indices = data.map(r => r.index).sort((a, b) => a - b);
const missingIndices = [];
for (let i = 1; i <= 20; i++) {
  if (!indices.includes(i)) {
    missingIndices.push(i);
  }
}

console.log(`\n1. Index Presence:`);
if (missingIndices.length === 0) {
  console.log(`  🟢 OK: All indices 1 to 20 are present.`);
} else {
  console.log(`  🔴 FAILED: Missing indices: ${missingIndices.join(', ')}`);
}

// 2 & 3. Core Fields & Score Check
const failedStatusRuns = [];
const successfulRuns = [];
let defaultScoreCount = 0;
let analysisErrorCount = 0;
let successfulEvaluationCount = 0;
let fileMissingCount = 0;
let categoryMismatchCount = 0;
const titleCategoryViolations = [];
const duplicateTitles = {};
const duplicateHooks = {};

// Keywords map for Category-Title alignment heuristic
const categoryKeywords = {
  'AI': ['ai', '맥북', 'macbook', 'chatgpt', '블로그', '자동화'],
  '부업': ['부업', '창업', '수익', '돈 버는', '수익화', '오토 블로그', '툴킷'],
  '전자책': ['전자책', '템플릿', '이북', '공략집'],
  '커피': ['커피', '에스프레소', '카페', '드립백', '홈카페'],
  '건강': ['홍삼', '정관장', '에브리타임', '피로', '비타민', '영양제', '메가도스'],
  '반려견': ['강아지', '사료', '알레르기', '반려견', '마사지', '매트'],
  '청소업': ['청소기', '스팀', '물걸레', '친환경'],
  '투자': ['투자', '주식', '차트북', '밸류에이션', '배당주'],
  '자기계발': ['만다라트', '플래너', '습관', '다이어리', '목표'],
  '미스터리': ['미스터리', '음모론', '백과사전'],
  '백룸': ['백룸', '괴담', '소설집'],
  '생활꿀팁': ['다이소', '가성비', '정리', '수납함']
};

data.forEach(run => {
  const index = run.index;
  const params = run.forcedParams || {};
  const category = params.category || 'N/A';
  const productTitle = params.productTitle || 'N/A';
  const result = run.result || {};
  
  // Extract Title, Hook, Score, and Video Path
  const scriptData = result.scriptData || {};
  const title = scriptData.title || 'N/A';
  const cuts = scriptData.cuts || [];
  const hook = cuts[0] ? cuts[0].subtitle : 'N/A';
  
  // Video Path Check
  const videoUrl = result.videoUrl || '';
  let physicalFileExists = false;
  if (videoUrl) {
    const relativeClean = videoUrl.replace(/^\/shorts\//, 'shorts/');
    const absoluteVideoPath = fs.existsSync(path.join(process.cwd(), 'viewer-app', 'public', relativeClean))
      ? path.join(process.cwd(), 'viewer-app', 'public', relativeClean)
      : path.join(process.cwd(), 'public', relativeClean);
    physicalFileExists = fs.existsSync(absoluteVideoPath);
    if (!physicalFileExists) {
      fileMissingCount++;
    }
  }

  // Calculate Average Score
  const qa = result.preUploadAnalysis || {};
  const scores = qa.scores || {};
  let avgScore = 0;
  if (scores && Object.keys(scores).length > 0) {
    avgScore = Object.values(scores).reduce((a, b) => a + b, 0) / Object.keys(scores).length;
  }

  // Duplicate checks tracking
  if (title !== 'N/A') {
    duplicateTitles[title] = duplicateTitles[title] ? duplicateTitles[title] + 1 : 1;
  }
  if (hook !== 'N/A') {
    duplicateHooks[hook] = duplicateHooks[hook] ? duplicateHooks[hook] + 1 : 1;
  }

  // Category/Title alignment heuristic check
  if (category !== 'N/A' && title !== 'N/A') {
    const keywords = categoryKeywords[category] || [];
    const lowerTitle = title.toLowerCase();
    const lowerProduct = productTitle.toLowerCase();
    
    // Check if at least one category keyword exists in title or productTitle
    const matched = keywords.some(k => lowerTitle.includes(k) || lowerProduct.includes(k));
    if (!matched && keywords.length > 0) {
      categoryMismatchCount++;
      titleCategoryViolations.push({ index, category, productTitle, title });
    }
  }

  // Classify run types: Failed vs Successful evaluations
  const evaluations = qa.evaluations || {};
  const firstEvalText = Object.values(evaluations)[0] || '';
  const isAnalysisError = firstEvalText.includes("분석 오류로 기본 평가 대체") || firstEvalText.includes("데이터 없음");

  if (avgScore === 55.0 && isAnalysisError) {
    defaultScoreCount++;
    analysisErrorCount++;
  } else if (avgScore > 0) {
    successfulEvaluationCount++;
  }

  // Determine overall status
  const isFailed = result.status === 'error' || result.step === 'error' || !videoUrl;
  if (isFailed) {
    failedStatusRuns.push({ index, category, productTitle, error: result.error_message || 'No video URL generated' });
  } else {
    successfulRuns.push({ index, category, productTitle, avgScore, videoUrl, fileExists: physicalFileExists });
  }
});

console.log(`\n2. Field Completeness:`);
let fieldErrors = 0;
data.forEach(run => {
  const params = run.forcedParams || {};
  if (!params.category || !params.productTitle) {
    console.log(`  🔴 FAILED Category/ProductTitle: Run #${run.index}`);
    fieldErrors++;
  }
});
if (fieldErrors === 0) {
  console.log(`  🟢 OK: All runs have category and productTitle defined.`);
}

console.log(`\n3. Average Score & Evaluation Reliability:`);
console.log(`  - Successful evaluations: ${successfulEvaluationCount}`);
console.log(`  - Default 55.0 score substitutions: ${defaultScoreCount}`);
console.log(`  - Analysis error evaluations: ${analysisErrorCount}`);

console.log(`\n4. Physical Video File Check:`);
console.log(`  - Runs with videoUrl present: ${data.filter(r => r.result?.videoUrl).length}`);
console.log(`  - Missing physical video files: ${fileMissingCount}`);
if (fileMissingCount === 0) {
  console.log(`  🟢 OK: All generated video paths have physical files on disk.`);
} else {
  console.log(`  🔴 FAILED: ${fileMissingCount} video paths are missing physical files!`);
}

console.log(`\n5. Category-Title Alignment Check:`);
console.log(`  - Mismatch count: ${categoryMismatchCount}`);
if (categoryMismatchCount === 0) {
  console.log(`  🟢 OK: All titles align with their categories.`);
} else {
  console.log(`  🔴 WARNING: Mismatches detected:`);
  titleCategoryViolations.forEach(v => {
    console.log(`    * Run #${v.index} [Category: ${v.category}] Product: "${v.productTitle}" -> Title: "${v.title}"`);
  });
}

console.log(`\n6. Duplicate Titles & Hooks Check:`);
const repeatedTitles = Object.entries(duplicateTitles).filter(([_, count]) => count >= 2);
const repeatedHooks = Object.entries(duplicateHooks).filter(([_, count]) => count >= 2);

console.log(`  - Duplicate titles: ${repeatedTitles.length}`);
repeatedTitles.forEach(([t, count]) => console.log(`    * Title: "${t}" repeats ${count} times`));

console.log(`  - Duplicate hooks: ${repeatedHooks.length}`);
repeatedHooks.forEach(([h, count]) => console.log(`    * Hook: "${h}" repeats ${count} times`));

if (repeatedTitles.length === 0 && repeatedHooks.length === 0) {
  console.log(`  🟢 OK: No duplicate titles or hooks detected.`);
} else {
  console.log(`  🔴 WARNING: Repetitions detected!`);
}

console.log(`\n7. Separation of Successful and Failed Runs:`);
console.log(`  - Successful Runs (${successfulRuns.length}): ${successfulRuns.map(r => r.index).join(', ')}`);
console.log(`  - Failed Runs (${failedStatusRuns.length}): ${failedStatusRuns.map(r => r.index).join(', ')}`);
if (failedStatusRuns.length > 0) {
  failedStatusRuns.forEach(f => {
    console.log(`    * Run #${f.index} [${f.category} - ${f.productTitle}] Failed: ${f.error}`);
  });
}

console.log(`\n==================================================`);
console.log(`Verification completed!`);
console.log(`==================================================`);
