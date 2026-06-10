const fs = require('fs');
const path = require('path');

const tasksDir = 'C:\\Users\\user\\.gemini\\antigravity-ide\\brain\\0cafbc9c-d80f-415d-9784-7066d364aad9\\.system_generated\\tasks';

function inspect() {
  const logPath = path.join(tasksDir, 'task-163.log');
  if (!fs.existsSync(logPath)) {
    console.error("Log file not found");
    return;
  }

  const content = fs.readFileSync(logPath, 'utf-8');
  const lines = content.split('\n');

  console.log("=== Sample 429 log lines ===");
  let count429 = 0;
  for (let i = 0; i < lines.length; i++) {
    if (lines[i].includes('Too Many Requests') || lines[i].includes('RESOURCE_EXHAUSTED')) {
      console.log(`Line ${i}: ${lines[i].trim()}`);
      console.log(`Context:`);
      for (let j = Math.max(0, i - 2); j <= Math.min(lines.length - 1, i + 5); j++) {
        console.log(`  ${j}: ${lines[j]}`);
      }
      console.log("------------------------");
      count429++;
      if (count429 > 5) break;
    }
  }

  console.log("=== Sample 503 log lines ===");
  let count503 = 0;
  for (let i = 0; i < lines.length; i++) {
    if (lines[i].includes('503') || lines[i].toLowerCase().includes('service unavailable')) {
      console.log(`Line ${i}: ${lines[i].trim()}`);
      console.log(`Context:`);
      for (let j = Math.max(0, i - 2); j <= Math.min(lines.length - 1, i + 5); j++) {
        console.log(`  ${j}: ${lines[j]}`);
      }
      console.log("------------------------");
      count503++;
      if (count503 > 5) break;
    }
  }
}

inspect();
