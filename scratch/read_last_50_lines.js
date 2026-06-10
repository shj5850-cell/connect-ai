const fs = require('fs');

const path = "C:\\Users\\user\\.gemini\\antigravity-ide\\brain\\2573e8c9-001b-4bc1-a615-7a35cb8e4aeb\\.system_generated\\tasks\\task-53.log";
if (fs.existsSync(path)) {
  const content = fs.readFileSync(path, 'utf-8');
  const lines = content.split('\n');
  console.log(`Last 50 lines of task-53.log:`);
  console.log(lines.slice(-50).join('\n'));
} else {
  console.log("File not found");
}
