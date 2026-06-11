const axios = require('axios');

async function testOllama() {
    const url = 'http://127.0.0.1:11434/api/chat';
    const payload = {
        model: 'myungchul-coder:latest',
        messages: [{ role: 'user', content: '안녕하세요! 자기소개를 간단히 해보세요.' }],
        stream: false
    };

    console.log("Calling Ollama myungchul-coder:latest...");
    try {
        const response = await axios.post(url, payload);
        console.log("Response:", JSON.stringify(response.data, null, 2));
    } catch (e) {
        console.error("Error:", e.message);
        if (e.response) {
            console.error("Details:", e.response.data);
        }
    }
}

testOllama();
