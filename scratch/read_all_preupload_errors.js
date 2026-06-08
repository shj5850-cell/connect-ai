const fs = require('fs');

const logPath = "C:\\Users\\user\\.gemini\\antigravity-ide\\brain\\6ca2731a-fafd-4f1a-aa1e-d71002104549\\.system_generated\\tasks\\task-315.log";

if (!fs.existsSync(logPath)) {
  console.error("Log file does not exist.");
  process.exit(1);
}

const content = fs.readFileSync(logPath, 'utf-8');
const lines = content.split('\n');

console.log(`Total log lines: ${lines.length}`);
let count = 0;
for (let i = 0; i < lines.length; i++) {
  if (lines[i].includes("Failed to run pre-upload analysis:")) {
    count++;
    console.log(`\n--- Error instance #${count} at line ${i} ---`);
    console.log(lines.slice(i, i + 15).join('\n'));
  }
}
