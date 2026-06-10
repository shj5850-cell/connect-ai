const fs = require('fs');
const path = require('path');

const tasksDir = 'C:\\Users\\user\\.gemini\\antigravity-ide\\brain\\0cafbc9c-d80f-415d-9784-7066d364aad9\\.system_generated\\tasks';

function countCorrectly() {
  const files = fs.readdirSync(tasksDir).filter(f => f.endsWith('.log'));
  
  let successCount = 0;
  let error429Count = 0;
  let error503Count = 0;
  
  // Track detailed success calls
  let scriptSuccess = 0;
  let visionSuccess = 0;
  let preuploadSuccess = 0;
  
  // Track detailed failures
  let script429 = 0;
  let script503 = 0;
  let vision429 = 0;
  let vision503 = 0;
  let preupload429 = 0;
  let preupload503 = 0;

  files.forEach(file => {
    const filePath = path.join(tasksDir, file);
    const content = fs.readFileSync(filePath, 'utf-8');
    const lines = content.split('\n');
    
    lines.forEach(line => {
      // 1. SUCCESS PATTERNS
      if (line.includes('[Autopilot] Script generated, now generating images...')) {
        scriptSuccess++;
        successCount++;
      }
      if (line.includes('[Vision Critic] Cut') && line.includes('Score:')) {
        visionSuccess++;
        successCount++;
      }
      if (line.includes('[Autopilot] Pre-Upload Analysis complete:')) {
        preuploadSuccess++;
        successCount++;
      }
      
      // 2. 429 PATTERNS (count unique call failures)
      if (line.includes('Gemini API failed: status 429')) {
        script429++;
        error429Count++;
      }
      if (line.includes('Pre-Upload Audit API failed: status 429')) {
        preupload429++;
        error429Count++;
      }
      if (line.includes('Multimodal evaluation failed') && line.includes('429')) {
        vision429++;
        error429Count++;
      }
      
      // 3. 503 PATTERNS (count unique call failures)
      if (line.includes('Gemini API failed: status 503')) {
        script503++;
        error503Count++;
      }
      if (line.includes('Pre-Upload Audit API failed: status 503')) {
        preupload503++;
        error503Count++;
      }
      if (line.includes('Multimodal evaluation failed') && line.includes('503')) {
        vision503++;
        error503Count++;
      }
    });
  });

  console.log("=== SUCCESS CALLS ===");
  console.log(`Script Success: ${scriptSuccess}`);
  console.log(`Vision Success: ${visionSuccess}`);
  console.log(`Pre-upload Success: ${preuploadSuccess}`);
  console.log(`Total Success: ${successCount}`);
  
  console.log("\n=== 429 CALLS ===");
  console.log(`Script 429: ${script429}`);
  console.log(`Vision 429: ${vision429}`);
  console.log(`Pre-upload 429: ${preupload429}`);
  console.log(`Total 429: ${error429Count}`);
  
  console.log("\n=== 503 CALLS ===");
  console.log(`Script 503: ${script503}`);
  console.log(`Vision 503: ${vision503}`);
  console.log(`Pre-upload 503: ${preupload503}`);
  console.log(`Total 503: ${error503Count}`);
}

countCorrectly();
