const fs = require('fs');
const path = require('path');

const envPath = path.join(__dirname, '..', 'viewer-app', '.env.local');
let apiKey = '';
if (fs.existsSync(envPath)) {
  const envContent = fs.readFileSync(envPath, 'utf-8');
  const match = envContent.match(/GEMINI_API_KEY\s*=\s*(.+)/);
  if (match) {
    apiKey = match[1].trim().replace(/['"]/g, '');
  }
}

if (!apiKey) {
  console.error("GEMINI_API_KEY not found in .env.local");
  process.exit(1);
}

const models = [
  'gemini-1.5-flash',
  'gemini-2.0-flash',
  'gemini-2.5-flash',
  'gemini-3.5-flash',
  'gemini-flash-latest'
];

async function testModels() {
  for (const model of models) {
    const url = `https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent?key=${apiKey}`;
    console.log(`Testing model: ${model}`);
    try {
      const response = await fetch(url, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          contents: [{ parts: [{ text: 'Hello, respond with exactly "OK"' }] }]
        })
      });
      console.log(`Status for ${model}: ${response.status}`);
      const text = await response.text();
      if (response.ok) {
        console.log(`Response: OK`);
      } else {
        console.log(`Error Response: ${text.substring(0, 200)}`);
      }
    } catch (err) {
      console.error(`Fetch failed for ${model}:`, err.message);
    }
    console.log('-----------------------------------');
  }
}

testModels();
