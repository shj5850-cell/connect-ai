const fs = require('fs');
const path = require('path');

const targetPath = path.join(__dirname, '../viewer-app/app/api/autopilot/route.js');
console.log('Reading from:', targetPath);

let content = fs.readFileSync(targetPath, 'utf8');

// Replace all instances of gemini-flash-latest with gemini-3.1-flash-lite
const updatedContent = content.replace(/gemini-flash-latest/g, 'gemini-3.1-flash-lite');

if (content !== updatedContent) {
  fs.writeFileSync(targetPath, updatedContent, 'utf8');
  console.log('Successfully updated model name in route.js!');
} else {
  console.log('Model name gemini-flash-latest not found or already replaced.');
}
