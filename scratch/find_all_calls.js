const fs = require('fs');
const path = require('path');

const logPath = 'C:\\Users\\user\\.gemini\\antigravity-ide\\brain\\0cafbc9c-d80f-415d-9784-7066d364aad9\\.system_generated\\tasks\\task-163.log';

function find() {
  if (!fs.existsSync(logPath)) {
    console.error("Log file not found");
    return;
  }

  const content = fs.readFileSync(logPath, 'utf-8');
  const lines = content.split('\n');

  console.log(`Total lines in log: ${lines.length}`);

  const counts = {
    script_success: 0,
    script_429: 0,
    script_503: 0,
    vision_success: 0,
    vision_429: 0,
    vision_503: 0,
    preupload_success: 0,
    preupload_429: 0,
    preupload_503: 0,
    retry_429: 0
  };

  lines.forEach((line, idx) => {
    // 429 Retries in fetchGeminiWithRetry
    if (line.includes('[Gemini API] Got 429 Rate Limit')) {
      counts.retry_429++;
    }

    // Script generation successes and errors
    if (line.includes('[Autopilot] Script generated, now generating images...')) {
      counts.script_success++;
    }
    if (line.includes('Gemini script generation failed') && line.includes('status 429')) {
      counts.script_429++;
    }
    if (line.includes('Gemini script generation failed') && line.includes('status 503')) {
      counts.script_503++;
    }

    // Vision Critic successes and errors
    if (line.includes('[Vision Critic] Cut') && line.includes('Score:')) {
      counts.vision_success++;
    }
    if (line.includes('multimodal Vision Critic failed') || line.includes('Vision Critic] Multimodal evaluation failed')) {
      if (line.includes('429')) counts.vision_429++;
      else if (line.includes('503')) counts.vision_503++;
    }

    // Pre-upload Audit successes and errors
    if (line.includes('[Autopilot] Pre-Upload Analysis complete:')) {
      counts.preupload_success++;
    }
    if (line.includes('Failed to run pre-upload analysis') || line.includes('Quality Board pre-upload analysis failed')) {
      if (line.includes('status 429')) counts.preupload_429++;
      else if (line.includes('status 503')) counts.preupload_503++;
    }
  });

  console.log("=== COUNTS ===");
  console.log(JSON.stringify(counts, null, 2));

  // Let's print some lines about multimodal evaluation failures or success
  console.log("\n=== Sample Vision Critic or Pre-Upload lines ===");
  lines.forEach((line, idx) => {
    if (line.includes('Vision Critic') || line.includes('pre-upload') || line.includes('Pre-Upload')) {
      if (idx > 2000 && idx < 3000) {
        console.log(`${idx}: ${line.trim()}`);
      }
    }
  });
}

find();
