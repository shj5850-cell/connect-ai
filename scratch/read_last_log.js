const fs = require('fs');

function readLastLinesAudit() {
  const logPath = 'C:\\Users\\user\\.gemini\\antigravity-ide\\brain\\6ca2731a-fafd-4f1a-aa1e-d71002104549\\.system_generated\\tasks\\task-962.log';
  if (!fs.existsSync(logPath)) {
    console.error('Log file does not exist at:', logPath);
    return;
  }
  const content = fs.readFileSync(logPath, 'utf-8');
  const lines = content.split('\n');
  console.log(`Total lines: ${lines.length}`);
  const last100 = lines.slice(-100);
  console.log('--- Last 100 lines of task-962 log ---');
  console.log(last100.join('\n'));
}

readLastLinesAudit();
