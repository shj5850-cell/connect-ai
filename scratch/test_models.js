const fs = require('fs');
const path = require('path');

// Parse .env.local
const envPath = path.join(__dirname, '../viewer-app/.env.local');
const dotenvContent = fs.readFileSync(envPath, 'utf-8');
const env = {};
dotenvContent.split('\n').forEach(line => {
  const match = line.match(/^\s*([^#=]+)\s*=\s*(.*)$/);
  if (match) {
    env[match[1].trim()] = match[2].trim();
  }
});

const apiKey = env.GEMINI_API_KEY;
if (!apiKey) {
  console.error('GEMINI_API_KEY not found in .env.local');
  process.exit(1);
}

const models = [
  'gemini-1.5-flash',
  'gemini-1.5-flash-latest',
  'gemini-2.0-flash',
  'gemini-2.0-flash-exp',
  'gemini-flash-latest'
];

async function testModel(model) {
  const url = `https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent?key=${apiKey}`;
  console.log(`Testing model: ${model}`);
  try {
    const res = await fetch(url, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        contents: [{ parts: [{ text: 'Respond with the word: SUCCESS' }] }],
        generationConfig: { 
          temperature: 0.1,
          maxOutputTokens: 100
        }
      })
    });
    console.log(`Model ${model} status:`, res.status);
    const text = await res.text();
    console.log(`Model ${model} response:`, text.substring(0, 300));
  } catch (e) {
    console.error(`Error for ${model}:`, e.message);
  }
  console.log('--------------------------------------------------');
}

async function run() {
  for (const model of models) {
    await testModel(model);
  }
}

run();
