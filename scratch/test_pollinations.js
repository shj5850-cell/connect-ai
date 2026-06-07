async function test() {
  const prompt = 'cozy workspace, vertical, 9:16';
  const url = `https://image.pollinations.ai/prompt/${encodeURIComponent(prompt)}?nologo=true`;
  console.log('Fetching:', url);
  try {
    const res = await fetch(url);
    console.log('Status:', res.status);
    if (res.ok) {
      console.log('Success!');
    } else {
      console.log('Failed with status:', res.status);
      const text = await res.text();
      console.log('Error text:', text);
    }
  } catch (e) {
    console.error('Error:', e);
  }
}

test();
