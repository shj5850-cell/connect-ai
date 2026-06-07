async function test() {
  const apiKey = process.env.GEMINI_API_KEY;
  if (!apiKey) {
    console.error('GEMINI_API_KEY is not defined in env!');
    return;
  }
  
  const urls = [
    `https://generativelanguage.googleapis.com/v1/models/gemini-1.5-flash:generateContent?key=${apiKey}`,
    `https://generativelanguage.googleapis.com/v1beta/models/gemini-1.5-flash:generateContent?key=${apiKey}`
  ];
  for (const url of urls) {
    console.log(`Testing URL: ${url.substring(0, 90)}...`);
    try {
      const res = await fetch(url, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          contents: [{ parts: [{ text: 'Hello, respond with exactly "OK"' }] }]
        })
      });
      console.log(`Status:`, res.status);
      const text = await res.text();
      console.log(`Response:`, text.substring(0, 300));
    } catch (e) {
      console.error(`Error:`, e);
    }
  }
}

test();
