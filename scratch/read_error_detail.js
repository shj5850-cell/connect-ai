const fs = require('fs');

const logPath = "C:\\Users\\user\\.gemini\\antigravity-ide\\brain\\6ca2731a-fafd-4f1a-aa1e-d71002104549\\.system_generated\\tasks\\task-315.log";

if (!fs.existsSync(logPath)) {
  console.error("Log file does not exist.");
  process.exit(1);
}

const content = fs.readFileSync(logPath, 'utf-8');
const lines = content.split('\n');

let foundIndex = -1;
for (let i = lines.length - 1; i >= 0; i--) {
  if (lines[i].includes("--- RAW GEMINI RESPONSE ---")) {
    foundIndex = i;
    break;
  }
}

if (foundIndex === -1) {
  console.log("No RAW GEMINI RESPONSE found in logs.");
} else {
  console.log(`Total lines: ${lines.length}`);
  const start = Math.max(0, foundIndex - 2);
  const end = Math.min(lines.length, foundIndex + 20);
  console.log('--- Context around RAW GEMINI RESPONSE ---');
  console.log(lines.slice(start, end).join('\n'));
}
