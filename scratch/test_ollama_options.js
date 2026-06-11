const axios = require('axios');

async function test() {
    const url = 'http://127.0.0.1:11434/api/chat';
    const payload = {
        model: 'myungchul-coder:latest',
        messages: [{ role: 'user', content: 'Say hello and tell me a joke.' }],
        stream: false,
        options: { num_ctx: 8192, num_predict: -1, temperature: 0.8 }
    };

    console.log("Calling Ollama with options...");
    try {
        const start = Date.now();
        const response = await axios.post(url, payload);
        console.log(`Success in ${Date.now() - start}ms:`, response.data.message.content);
    } catch (e) {
        console.error("Error:", e.message);
    }
}

test();
