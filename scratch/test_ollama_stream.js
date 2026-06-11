const axios = require('axios');

async function testOllamaStream() {
    const url = 'http://127.0.0.1:11434/api/chat';
    const payload = {
        model: 'myungchul-coder:latest',
        messages: [{ role: 'user', content: '안녕하세요! 자기소개를 간단히 해보세요.' }],
        stream: true
    };

    console.log("Calling Ollama myungchul-coder:latest with stream: true...");
    try {
        const response = await axios.post(url, payload, { responseType: 'stream' });
        response.data.on('data', chunk => {
            console.log("CHUNK:", chunk.toString());
        });
        response.data.on('end', () => {
            console.log("Stream ended.");
        });
    } catch (e) {
        console.error("Error:", e.message);
    }
}

testOllamaStream();
