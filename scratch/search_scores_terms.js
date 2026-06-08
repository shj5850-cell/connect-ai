const fs = require('fs');
const path = require('path');

function walkDir(dir, callback) {
  fs.readdirSync(dir).forEach(f => {
    let dirPath = path.join(dir, f);
    let isDirectory = fs.statSync(dirPath).isDirectory();
    if (isDirectory) {
      if (f !== 'node_modules' && f !== '.next' && f !== '.git') {
        walkDir(dirPath, callback);
      }
    } else {
      callback(dirPath);
    }
  });
}

const workspaceRoot = "c:\\Users\\user\\Desktop\\명철\\개발";
walkDir(workspaceRoot, (filePath) => {
  if (filePath.endsWith('.js') || filePath.endsWith('.tsx') || filePath.endsWith('.jsx')) {
    const content = fs.readFileSync(filePath, 'utf-8');
    ['quality_score', 'revenue_score', 'Quality Score', 'Revenue Score'].forEach(term => {
      if (content.includes(term)) {
        console.log(`File: ${filePath} contains term "${term}"`);
        const lines = content.split('\n');
        lines.forEach((line, idx) => {
          if (line.includes(term)) {
            console.log(`  Line ${idx + 1}: ${line.trim()}`);
          }
        });
      }
    });
  }
});
