const fs = require('fs');
const path = require('path');

const logPath = 'C:\\Users\\user\\.gemini\\antigravity-ide\\brain\\0cafbc9c-d80f-415d-9784-7066d364aad9\\.system_generated\\tasks\\task-163.log';

function analyze() {
  if (!fs.existsSync(logPath)) {
    console.error('Log file does not exist at:', logPath);
    return;
  }

  const logContent = fs.readFileSync(logPath, 'utf-8');
  const lines = logContent.split('\n');

  let trend_attempts = 0;
  let trend_429 = 0;
  let trend_503 = 0;
  let trend_success = 0;

  let script_attempts = 0;
  let script_429 = 0;
  let script_503 = 0;
  let script_success = 0;

  let vision_attempts = 0;
  let vision_429 = 0;
  let vision_503 = 0;
  let vision_success = 0;

  let qboard_attempts = 0;
  let qboard_429 = 0;
  let qboard_503 = 0;
  let qboard_success = 0;

  // Let's also count raw 429s and 503s from the whole file
  let total_429 = 0;
  let total_503 = 0;
  let total_aborts = 0;

  for (let i = 0; i < lines.length; i++) {
    const line = lines[i];

    if (line.includes('status 429') || line.includes('returned 429') || line.includes('API error: 429')) {
      total_429++;
    }
    if (line.includes('status 503') || line.includes('returned 503') || line.includes('API error: 503')) {
      total_503++;
    }
    if (line.includes('Fetch aborted due to') || line.includes('Fetch aborted')) {
      total_aborts++;
    }

    // Trend DNA Extraction
    if (line.includes('Running Trend DNA extraction...')) {
      trend_attempts++;
    }
    if (line.includes('[Trend Engine] Extract Trend DNA via Gemini failed: Error: Gemini API error: 429') || 
        (line.includes('[Trend Engine] Gemini returned 429') && lines[i-1] && lines[i-1].includes('Trend DNA'))) {
      trend_429++;
    }
    if (line.includes('[Trend Engine] Extract Trend DNA via Gemini failed: Error: Gemini API error: 503') ||
        (line.includes('[Trend Engine] Gemini returned 503') && lines[i-1] && lines[i-1].includes('Trend DNA'))) {
      trend_503++;
    }

    // Step 1: Script & Product Understanding
    if (line.includes('Step 1: Merged Product Understanding & Script Generation...')) {
      script_attempts++;
    }
    if (line.includes('generateScriptWithProductUnderstanding API failed: status 429') || 
        (line.includes('generateScriptWithProductUnderstanding') && line.includes('status 429'))) {
      script_429++;
    }
    if (line.includes('generateScriptWithProductUnderstanding API failed: status 503') || 
        (line.includes('generateScriptWithProductUnderstanding') && line.includes('status 503'))) {
      script_503++;
    }

    // Step 3: Batch Vision Critic
    if (line.includes('Step 3: Running Batch Multimodal Vision Critic...')) {
      vision_attempts++;
    }
    if (line.includes('[Vision Critic] Batch evaluation failed') && line.includes('AbortError')) {
      vision_503++; // Timeout/Abort is treated as 503/Unavailable error
    }

    // Step 4: Quality Board & Fact Checker
    if (line.includes('Step 4: Running Merged Quality Board, Relevance & Fact Checker...')) {
      qboard_attempts++;
    }
    if (line.includes('runMergedQualityBoardAndFactCheck API failed: status 429') || 
        (line.includes('runMergedQualityBoardAndFactCheck') && line.includes('status 429'))) {
      qboard_429++;
    }
    if (line.includes('runMergedQualityBoardAndFactCheck API failed: status 503') || 
        (line.includes('runMergedQualityBoardAndFactCheck') && line.includes('status 503'))) {
      qboard_503++;
    }
  }

  // Calculate successes
  trend_success = trend_attempts - trend_429 - trend_503;
  script_success = script_attempts - script_429 - script_503;
  vision_success = vision_attempts - vision_429 - vision_503;
  qboard_success = qboard_attempts - qboard_429 - qboard_503;

  if (trend_success < 0) trend_success = 0;
  if (script_success < 0) script_success = 0;
  if (vision_success < 0) vision_success = 0;
  if (qboard_success < 0) qboard_success = 0;

  console.log('========================================================');
  console.log('📊 GEMINI API CALL STATISTICS (LAST 24 HOURS)');
  console.log('========================================================');
  console.log(`1. Trend Analysis DNA Extraction:`);
  console.log(`   - Total Attempts: ${trend_attempts}`);
  console.log(`   - Successes:      ${trend_success}`);
  console.log(`   - 429 Failures:   ${trend_429}`);
  console.log(`   - 503 Failures:   ${trend_503}`);
  console.log(`2. Product Understanding & Script Gen (Merged):`);
  console.log(`   - Total Attempts: ${script_attempts}`);
  console.log(`   - Successes:      ${script_success}`);
  console.log(`   - 429 Failures:   ${script_429}`);
  console.log(`   - 503 Failures:   ${script_503}`);
  console.log(`3. Batch Multimodal Vision Critic:`);
  console.log(`   - Total Attempts: ${vision_attempts}`);
  console.log(`   - Successes:      ${vision_success}`);
  console.log(`   - Timeout/Aborts: ${vision_503}`);
  console.log(`4. Merged Quality Board & Fact Checker:`);
  console.log(`   - Total Attempts: ${qboard_attempts}`);
  console.log(`   - Successes:      ${qboard_success}`);
  console.log(`   - 429 Failures:   ${qboard_429}`);
  console.log(`   - 503 Failures:   ${qboard_503}`);
  console.log('--------------------------------------------------------');
  
  const total_attempts = trend_attempts + script_attempts + vision_attempts + qboard_attempts;
  const total_successes = trend_success + script_success + vision_success + qboard_success;
  
  console.log(`TOTAL AGGREGATED METRICS:`);
  console.log(`   - Total Gemini Call Attempts: ${total_attempts}`);
  console.log(`   - Successful API Calls:      ${total_successes}`);
  console.log(`   - 429 (Rate Limit/Quota):    ${total_429}`);
  console.log(`   - 503 (Unavailable/Demand):  ${total_503}`);
  console.log(`   - Aborted/Timeout (20s):     ${total_aborts}`);
  console.log('========================================================');
}

analyze();
