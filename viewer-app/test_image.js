async function test() {
  const urls = [
    'https://image.pollinations.ai/prompt/cat?seed=123',
    'https://image.pollinations.ai/prompt/cat?nologo=true',
    'https://image.pollinations.ai/prompt/cat?private=true',
    'https://image.pollinations.ai/prompt/cat?model=sana&seed=123',
    'https://image.pollinations.ai/prompt/cat?model=sana&nologo=true',
    'https://image.pollinations.ai/prompt/cat?model=sana&private=true'
  ];
  for (const url of urls) {
    try {
      const res = await fetch(url);
      console.log(`${url} -> status: ${res.status}`);
    } catch (e) {
      console.log(`${url} -> error: ${e.message}`);
    }
  }
}
test();
