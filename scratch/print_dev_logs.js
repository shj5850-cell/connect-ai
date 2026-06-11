const fs = require('fs');
const path = require('path');

const logPath = 'C:\\Users\\user\\.gemini\\antigravity-ide\\brain\\0cafbc9c-d80f-415d-9784-7066d364aad9\\.system_generated\\tasks\\task-163.log';

if (!fs.existsSync(logPath)) {
  console.error('Log file not found at:', logPath);
  process.exit(1);
}

const content = fs.readFileSync(logPath, 'utf-8');
const lines = content.split('\n');

console.log(`Total lines in dev server log: ${lines.length}`);
console.log('Filtering for [Autopilot - Trend Engine] and relevant logs from the end of the file...\n');

// Find the last 2000 lines or search from the end
const lastLines = lines.slice(-2000);
lastLines.forEach(line => {
  if (line.includes('[Autopilot') || line.includes('[Trend Engine]') || line.includes('Trend DNA') || line.includes('searchYoutubeMarket')) {
    console.log(line);
  }
});
