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

async function listModels() {
  const url = `https://generativelanguage.googleapis.com/v1beta/models?key=${apiKey}`;
  console.log(`Querying: ${url}`);
  try {
    const res = await fetch(url);
    console.log(`Status:`, res.status);
    const data = await res.json();
    if (data.models) {
      console.log('Available models:');
      data.models.forEach(m => {
        console.log(` - Name: ${m.name} | DisplayName: ${m.displayName} | SupportedMethods: ${m.supportedGenerationMethods.join(', ')}`);
      });
    } else {
      console.log('No models returned:', JSON.stringify(data));
    }
  } catch (e) {
    console.error('Error:', e.message);
  }
}

listModels();
