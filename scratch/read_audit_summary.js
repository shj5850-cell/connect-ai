const fs = require('fs');
const path = require('path');

const auditPath = 'c:\\Users\\user\\Desktop\\명철\\개발\\scratch\\audit_results.json';

function analyzeAudit() {
  if (!fs.existsSync(auditPath)) {
    console.error('audit_results.json not found!');
    return;
  }

  const data = JSON.parse(fs.readFileSync(auditPath, 'utf-8'));
  console.log(`Total Runs in Audit: ${data.length}`);

  const results = [];

  const macbookTitle = 'M3 맥북으로 AI 수익화 시작하는 법';
  const ebookTitle = '노트북 하나로 월 100만원 버는 법';
  const redGinsengTitle = '피로회복 끝판왕 홍삼정 추천';

  let geminiCount = 0;
  let fallbackCount = 0;
  let mixedCount = 0;

  // Track scores for quality score recalculation
  const geminiScores = [];
  const fallbackScores = [];
  const allScores = [];

  data.forEach((run, idx) => {
    const forced = run.forcedParams || {};
    const res = run.result || {};
    const script = res.scriptData || {};
    const preUpload = res.preUploadAnalysis || {};
    const scores = preUpload.scores || {};

    const reqTitle = forced.productTitle || '';
    const genTitle = script.title || '';

    // Calculate quality score average
    const scoreSum = (scores.hookStrength || 0) + (scores.scriptContent || 0) + (scores.sceneVisuals || 0) + (scores.subtitleAesthetics || 0) + (scores.soundDesign || 0);
    const scoreAvg = scoreSum > 0 ? scoreSum / 5 : null;

    let type = 'Gemini Generated';
    let geminiSuccess = true;

    // Check if it's fallback
    if (genTitle === macbookTitle || genTitle === ebookTitle || genTitle === redGinsengTitle) {
      type = 'Fallback Template';
      geminiSuccess = false;
      fallbackCount++;
      if (scoreAvg !== null) fallbackScores.push(scoreAvg);
    } else if (res.message && (res.message.includes('오류') || res.status === 'error')) {
      type = 'Failed';
      geminiSuccess = false;
    } else {
      // Check if it is a real custom generation or a fallback
      // If the generated title contains any word from the requested title, it is probably Gemini generated
      const words = reqTitle.split(' ').filter(w => w.length > 1);
      const isCustom = words.some(w => genTitle.includes(w)) || genTitle.includes(reqTitle.substring(0, 4));
      
      // Let's also check for "스톡 이미지 대체로 기본 검수 자동 통과" in cuts
      const cuts = script.cuts || [];
      const hasVisionError = cuts.some(c => c.vision_feedback && c.vision_feedback.includes('AI 생성 오류'));

      if (isCustom) {
        if (hasVisionError) {
          type = 'Mixed';
          mixedCount++;
          if (scoreAvg !== null) geminiScores.push(scoreAvg); // Mixed contains Gemini script
        } else {
          type = 'Gemini Generated';
          geminiCount++;
          if (scoreAvg !== null) geminiScores.push(scoreAvg);
        }
      } else {
        // Default to Fallback if it is not custom
        type = 'Fallback Template';
        geminiSuccess = false;
        fallbackCount++;
        if (scoreAvg !== null) fallbackScores.push(scoreAvg);
      }
    }

    if (scoreAvg !== null) allScores.push(scoreAvg);

    results.push({
      runNum: run.index || (idx + 1),
      productName: reqTitle,
      geminiSuccess,
      type,
      score: scoreAvg
    });
  });

  console.log('\n=================== RUN-BY-RUN AUDIT DETAILS ===================');
  results.forEach(r => {
    const scoreStr = r.score !== null ? `${r.score.toFixed(1)}` : 'N/A';
    console.log(`Run ${r.runNum}: Gemini ${r.geminiSuccess ? 'Success' : 'Fail (Fallback/Error)'} | Type: ${r.type.padEnd(17)} | Quality Score: ${scoreStr} | Product: "${r.productName}"`);
  });
  console.log('================================================================');

  const avgGeminiOnly = geminiScores.length > 0 ? (geminiScores.reduce((a, b) => a + b, 0) / geminiScores.length).toFixed(2) : 'N/A';
  const avgFallbackOnly = fallbackScores.length > 0 ? (fallbackScores.reduce((a, b) => a + b, 0) / fallbackScores.length).toFixed(2) : 'N/A';
  const avgAll = allScores.length > 0 ? (allScores.reduce((a, b) => a + b, 0) / allScores.length).toFixed(2) : 'N/A';

  console.log('\n=================== AUDIT RE-AGGREGATION ===================');
  console.log(`A. Actual Gemini Generated Videos:  ${geminiCount}`);
  console.log(`B. Fallback Template Videos:        ${fallbackCount}`);
  console.log(`C. Mixed Videos:                    ${mixedCount}`);
  console.log('------------------------------------------------------------');
  console.log(`Quality Score Recalculation:`);
  console.log(`- Actual AI (Gemini/Mixed) Average:  ${avgGeminiOnly} (Count: ${geminiScores.length})`);
  console.log(`- Fallback Template Only Average:   ${avgFallbackOnly} (Count: ${fallbackScores.length})`);
  console.log(`- Overall Average (Incl. Fallback):  ${avgAll} (Count: ${allScores.length})`);
  console.log('============================================================');
}

analyzeAudit();
