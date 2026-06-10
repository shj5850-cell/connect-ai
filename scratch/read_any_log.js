const fs = require('fs');
const path = require('path');

const logPath = process.argv[2];
if (!logPath || !fs.existsSync(logPath)) {
  console.error("Log file does not exist:", logPath);
  process.exit(1);
}

const content = fs.readFileSync(logPath, 'utf-8');
const lines = content.split('\n');
console.log(`Total lines: ${lines.length}`);
console.log('--- Last 200 lines ---');
console.log(lines.slice(-200).join('\n'));
