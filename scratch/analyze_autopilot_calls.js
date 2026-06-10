const fs = require('fs');
const path = require('path');

const routePath = path.join(__dirname, '..', 'viewer-app', 'app', 'api', 'autopilot', 'route.js');
const fileContent = fs.readFileSync(routePath, 'utf-8');

const lines = fileContent.split('\n');

console.log("Searching for Gemini API call functions...");
lines.forEach((line, idx) => {
  if (line.includes('generateContent') || line.includes('generateScriptWithGemini') || line.includes('runVisionCriticMultimodal') || line.includes('runPreUploadAnalysis') || line.includes('runProductUnderstandingAgent')) {
    console.log(`Line ${idx + 1}: ${line.trim()}`);
  }
});
