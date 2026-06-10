const fs = require('fs');
const path = require('path');

const routePath = path.join(__dirname, '..', 'viewer-app', 'app', 'api', 'autopilot', 'route.js');
const fileContent = fs.readFileSync(routePath, 'utf-8');

const lines = fileContent.split('\n');

const lineNums = [2083, 2311, 2409];
lineNums.forEach(num => {
  console.log(`\nAround line ${num}:`);
  for (let i = num - 5; i <= num + 5; i++) {
    if (lines[i - 1] !== undefined) {
      console.log(`${i}: ${lines[i - 1]}`);
    }
  }
});
