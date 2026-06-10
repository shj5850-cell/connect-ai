const fs = require('fs');
const path = require('path');

const logPath = 'C:\\Users\\user\\.gemini\\antigravity-ide\\brain\\0cafbc9c-d80f-415d-9784-7066d364aad9\\.system_generated\\tasks\\task-163.log';

function analyze() {
  if (!fs.existsSync(logPath)) {
    console.error("Log file not found");
    return;
  }

  const content = fs.readFileSync(logPath, 'utf-8');
  const lines = content.split('\n');

  let imageGenFailCount = 0;
  let pollinationFailCount = 0;
  let fallbackSuccessCount = 0;

  lines.forEach((line, idx) => {
    if (line.includes('Failed to generate/critique image') || line.includes('Image generation failed')) {
      imageGenFailCount++;
      if (imageGenFailCount < 20) {
        console.log(`GenFail ${idx}: ${line.trim()}`);
      }
    }
    if (line.includes('Pollinations API returned status') || line.includes('Pollinations failed')) {
      pollinationFailCount++;
    }
    if (line.includes('Immediate fallback image used due to API failure') || line.includes('스톡 이미지 대체로 기본 검수 자동 통과')) {
      fallbackSuccessCount++;
    }
  });

  console.log(`\n=== Image Analysis ===`);
  console.log(`Failed to generate/critique image logs: ${imageGenFailCount}`);
  console.log(`Pollinations API failures: ${pollinationFailCount}`);
  console.log(`Fallback images used: ${fallbackSuccessCount}`);
}

analyze();
