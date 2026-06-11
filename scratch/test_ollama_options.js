const axios = require('axios');

async function testWithOptions(options, label) {
    const url = 'http://127.0.0.1:11434/api/chat';
    const payload = {
        model: 'myungchul-coder:latest',
        messages: [{ role: 'user', content: 'Say hello and tell me a joke.' }],
        stream: false,
        options
    };

    console.log(`Calling Ollama with label: "${label}" and options:`, options);
    try {
        const start = Date.now();
        const response = await axios.post(url, payload, { timeout: 30000 });
        console.log(`[${label}] Success in ${Date.now() - start}ms:`, response.data.message.content.substring(0, 100));
    } catch (e) {
        console.error(`[${label}] Error:`, e.message);
    }
    console.log('---------------------------');
}

async function run() {
    // Test 1: No options
    await testWithOptions(undefined, "No Options");

    // Test 2: Only temperature
    await testWithOptions({ temperature: 0.8 }, "Only Temp");

    // Test 3: num_ctx: 4096, num_predict: 2048
    await testWithOptions({ num_ctx: 4096, num_predict: 2048, temperature: 0.8 }, "num_ctx 4096, num_predict 2048");

    // Test 4: num_ctx: 8192, num_predict: 2048
    await testWithOptions({ num_ctx: 8192, num_predict: 2048, temperature: 0.8 }, "num_ctx 8192, num_predict 2048");

    // Test 5: num_ctx: 8192, num_predict: -1
    await testWithOptions({ num_ctx: 8192, num_predict: -1, temperature: 0.8 }, "num_ctx 8192, num_predict -1");

    // Test 6: num_ctx: 4096, num_predict: -1
    await testWithOptions({ num_ctx: 4096, num_predict: -1, temperature: 0.8 }, "num_ctx 4096, num_predict -1");
}

run();
