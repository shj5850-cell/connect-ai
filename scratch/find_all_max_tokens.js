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
  if (filePath.endsWith('.js') || filePath.endsWith('.ts') || filePath.endsWith('.tsx') || filePath.endsWith('.jsx')) {
    const content = fs.readFileSync(filePath, 'utf-8');
    if (content.includes("maxOutputTokens")) {
      console.log(`File: ${filePath}`);
      const lines = content.split('\n');
      lines.forEach((line, idx) => {
        if (line.includes("maxOutputTokens")) {
          console.log(`  Line ${idx + 1}: ${line.trim()}`);
        }
      });
    }
  }
});
