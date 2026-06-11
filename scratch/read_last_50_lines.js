const fs = require('fs');
const path = "C:\\Users\\user\\.gemini\\antigravity-ide\\brain\\0cafbc9c-d80f-415d-9784-7066d364aad9\\.system_generated\\tasks\\task-163.log";

if (fs.existsSync(path)) {
  const content = fs.readFileSync(path, 'utf-8');
  const lines = content.split('\n');
  console.log(`Last 100 lines of task-163.log:`);
  console.log(lines.slice(-100).join('\n'));
} else {
  console.log("File not found at:", path);
}
