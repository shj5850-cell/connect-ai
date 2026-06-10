const fs = require('fs');
const path = require('path');

const logPath = 'C:\\Users\\user\\.gemini\\antigravity-ide\\brain\\0cafbc9c-d80f-415d-9784-7066d364aad9\\.system_generated\\tasks\\task-163.log';

function find() {
  if (!fs.existsSync(logPath)) {
    console.error("Log file not found");
    return;
  }

  const content = fs.readFileSync(logPath, 'utf-8');
  const lines = content.split('\n');

  let matchCount = 0;
  lines.forEach((line, idx) => {
    if (line.toLowerCase().includes('vision critic') || line.toLowerCase().includes('visioncritic')) {
      matchCount++;
      if (matchCount < 50) {
        console.log(`${idx}: ${line.trim()}`);
      }
    }
  });
  console.log(`Total matching lines: ${matchCount}`);
}

find();
