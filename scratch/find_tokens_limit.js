const fs = require('fs');
const path = require('path');

const routePath = path.join(__dirname, '..', 'viewer-app', 'app', 'api', 'autopilot', 'route.js');
if (!fs.existsSync(routePath)) {
  console.error("route.js not found at:", routePath);
  process.exit(1);
}

const content = fs.readFileSync(routePath, 'utf-8');
const lines = content.split('\n');

for (let i = 0; i < lines.length; i++) {
  if (lines[i].includes("maxOutputTokens")) {
    console.log(`Line ${i + 1}: ${lines[i].trim()}`);
    // Print context
    const start = Math.max(0, i - 3);
    const end = Math.min(lines.length, i + 4);
    console.log('--- Context ---');
    console.log(lines.slice(start, end).join('\n'));
    console.log('---------------\n');
  }
}
