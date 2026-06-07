async function test() {
  const apiKey = process.env.GEMINI_API_KEY;
  if (!apiKey) {
    console.error('GEMINI_API_KEY is not defined in env!');
    return;
  }
  
  const researcherPrompt = `Hello, respond with a JSON object containing "hello": "world".`;
  const url = `https://generativelanguage.googleapis.com/v1beta/models/gemini-flash-latest:generateContent?key=${apiKey}`;
  console.log('Testing JSON mode url:', url);
  try {
    const res = await fetch(url, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        contents: [{ parts: [{ text: researcherPrompt }] }],
        generationConfig: { 
          temperature: 0.25,
          maxOutputTokens: 2048,
          responseMimeType: "application/json"
        }
      })
    });
    console.log('Status:', res.status);
    const text = await res.text();
    console.log('Response:', text);
  } catch (e) {
    console.error('Error:', e);
  }
}

test();
