const fs = require('fs');
const path = require('path');

const tasksDir = 'C:\\Users\\user\\.gemini\\antigravity-ide\\brain\\0cafbc9c-d80f-415d-9784-7066d364aad9\\.system_generated\\tasks';

function analyzeLogs() {
  if (!fs.existsSync(tasksDir)) {
    console.error("Tasks directory not found");
    return;
  }

  const files = fs.readdirSync(tasksDir).filter(f => f.endsWith('.log'));
  console.log(`Analyzing logs in ${tasksDir}...`);

  let totalSuccess = 0;
  let total429 = 0;
  let total503 = 0;
  let otherErrors = 0;

  files.forEach(file => {
    const filePath = path.join(tasksDir, file);
    const content = fs.readFileSync(filePath, 'utf-8');
    const lines = content.split('\n');

    lines.forEach(line => {
      // Look for 429
      if (line.includes('429') || line.toLowerCase().includes('rate limit') || line.includes('RESOURCE_EXHAUSTED') || line.toLowerCase().includes('quota exceeded')) {
        total429++;
        console.log(`[429] ${file}: ${line.trim()}`);
      }
      // Look for 503
      else if (line.includes('503') || line.toLowerCase().includes('service unavailable')) {
        total503++;
        console.log(`[503] ${file}: ${line.trim()}`);
      }
      // Look for success or calls
      else if (line.includes('Gemini API call') || line.includes('generateContent') || line.includes('generateScriptWithGemini') || line.includes('runVisionCriticMultimodal')) {
        // If it failed, check status code
        if (line.toLowerCase().includes('fail') || line.toLowerCase().includes('error')) {
          otherErrors++;
          console.log(`[ERR] ${file}: ${line.trim()}`);
        } else {
          // Success
          totalSuccess++;
          console.log(`[SUCC] ${file}: ${line.trim()}`);
        }
      }
    });
  });

  console.log("\n=================== ANALYSIS RESULTS ===================");
  console.log(`Success Gemini Calls: ${totalSuccess}`);
  console.log(`429 Gemini Calls: ${total429}`);
  console.log(`503 Gemini Calls: ${total503}`);
  console.log(`Other Errors: ${otherErrors}`);
}

analyzeLogs();
