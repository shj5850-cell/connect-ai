const fs = require('fs');
const path = require('path');
const axios = require('axios');

const agentId = 'secretary'; // let's test 영숙 (secretary)
const companyDir = 'c:\\Users\\user\\Desktop\\명철\\개발\\_company';
const ollamaUrl = 'http://127.0.0.1:11434';
const modelName = 'qwen2.5-coder:1.5b';

function getAgentGoal(id) {
    try {
        return fs.readFileSync(path.join(companyDir, '_agents', id, 'goal.md'), 'utf-8');
    } catch {
        return '';
    }
}

function readAgentSharedContext(id, opts) {
    const lean = opts?.lean === true;
    const identity = fs.readFileSync(path.join(companyDir, '_shared', 'identity.md'), 'utf-8');
    const companyGoals = fs.readFileSync(path.join(companyDir, '_shared', 'goals.md'), 'utf-8');
    const decisions = fs.readFileSync(path.join(companyDir, '_shared', 'decisions.md'), 'utf-8');
    const memory = fs.readFileSync(path.join(companyDir, '_agents', id, 'memory.md'), 'utf-8');
    const personalGoal = getAgentGoal(id);
    
    let ctx = '';
    if (personalGoal.trim()) ctx += `\n\n[당신의 개인 목표 (최우선)]\n${personalGoal.slice(0, 4000)}`;
    if (companyGoals.trim()) ctx += `\n\n[회사 공동 목표]\n${companyGoals.slice(0, 4000)}`;
    if (identity.trim()) ctx += `\n\n[회사 정체성]\n${identity.slice(0, 2000)}`;
    if (decisions.trim()) ctx += `\n\n[지난 의사결정 로그]\n${decisions.slice(lean ? -1200 : -3000)}`;
    if (memory.trim()) ctx += `\n\n[개인 메모리]\n${memory.slice(lean ? 0 : 0, lean ? 1500 : 4000)}`;
    return ctx;
}

function buildSpecialistPrompt(id) {
    return `당신은 ${id} 에이전트입니다. 한국어로 답변하세요.
끝에서 두 번째 줄: 📊 평가: <완료|진행중|대기> — <한 문장 이유>
마지막 줄: 📝 다음 단계: <한 줄, 구체적 액션>`;
}

async function runSingleTest(opts, ollamaOptions, label) {
    const sysPrompt = `${buildSpecialistPrompt(agentId)}\n${readAgentSharedContext(agentId, opts)}`;
    const userMsg = "[CEO의 지시]\n오늘의 일정을 확인하고 데일리 브리핑을 작성해주세요.\n\n[원 사용자 명령 참고]\n오늘 날짜는 2026-06-11입니다. 회사 목표(goals.md)와 지금까지의 의사결정 로그를 바탕으로 오늘 우리 회사가 우선순위로 처리해야 할 작업 3가지를 결정하고, 각 작업을 적절한 에이전트에게 분배하세요.";

    console.log(`\n===================================`);
    console.log(`[TEST: ${label}]`);
    console.log(`Prompt length: ${sysPrompt.length} chars`);
    console.log(`Ollama options:`, ollamaOptions);

    const payload = {
        model: modelName,
        messages: [
            { role: 'system', content: sysPrompt },
            { role: 'user', content: userMsg }
        ],
        stream: false,
        options: ollamaOptions
    };

    try {
        const start = Date.now();
        const response = await axios.post(`${ollamaUrl}/api/chat`, payload, { timeout: 40000 });
        console.log(`Success in ${Date.now() - start}ms`);
        const content = response.data.message.content;
        console.log(`Response length: ${content.length} chars`);
        console.log(`First 200 chars:\n${content.substring(0, 200)}`);
        console.log(`Last 200 chars:\n${content.substring(content.length - 200)}`);
    } catch (e) {
        console.error("Error:", e.message);
    }
}

async function runAll() {
    // Test 1: Normal context + num_ctx: 8192, num_predict: -1
    // (This was hanging or failing previously. We run it with a timeout)
    await runSingleTest({ lean: false }, { num_ctx: 8192, num_predict: -1, temperature: 0.8 }, "Normal Context + num_ctx 8192, num_predict -1");

    // Test 2: Lean context + num_ctx: 4096, num_predict: 2048
    await runSingleTest({ lean: true }, { num_ctx: 4096, num_predict: 2048, temperature: 0.8 }, "Lean Context + num_ctx 4096, num_predict 2048");

    // Test 3: Lean context + num_ctx: 8192, num_predict: -1
    await runSingleTest({ lean: true }, { num_ctx: 8192, num_predict: -1, temperature: 0.8 }, "Lean Context + num_ctx 8192, num_predict -1");

    // Test 4: Lean context + num_ctx: 8192, num_predict: 2048
    await runSingleTest({ lean: true }, { num_ctx: 8192, num_predict: 2048, temperature: 0.8 }, "Lean Context + num_ctx 8192, num_predict 2048");
}

runAll();
