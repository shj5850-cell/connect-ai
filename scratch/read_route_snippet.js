const fs = require('fs');
const path = require('path');

const targetPath = path.join(__dirname, '..', 'viewer-app', 'app', 'api', 'autopilot', 'route.js');
const startLine = parseInt(process.argv[2]) || 1;
const endLine = parseInt(process.argv[3]) || 200;

if (!fs.existsSync(targetPath)) {
  console.error("File does not exist:", targetPath);
  process.exit(1);
}

const content = fs.readFileSync(targetPath, 'utf8');
const lines = content.split('\n');

console.log(`Total lines: ${lines.length}`);
console.log(`Showing lines ${startLine} to ${Math.min(endLine, lines.length)}`);

for (let i = startLine - 1; i < Math.min(endLine, lines.length); i++) {
  console.log(`${i + 1}: ${lines[i]}`);
}
