import { NextResponse } from 'next/server';
import { getSessions, getSessionFiles } from '../../lib/api';
import fs from 'fs';
import path from 'path';

const fallbackIdentity = {
  identity: "AI 트렌드 연구 및 소셜 콘텐츠 자동화 수익 모델을 설계하는 가상 에이전트 협업 기업",
  focus: [
    "AI 자동화 사업 아이템 발굴 및 트렌드 경쟁사 ROI 분석",
    "소셜 미디어(유튜브, 인스타그램) 채널 활성화를 위한 콘텐츠 기획 최적화",
    "수익 모델 다각화를 위한 최적의 요금제 설계 및 마케팅 전략 수립"
  ],
  suggestion: "에이전트들이 도출한 AI 아이템 분석 결과를 토대로 1차 수익 모델(구독 또는 대행)의 핵심 기획을 시작하세요."
};

export async function GET(request) {
  try {
    const sessions = getSessions();
    if (sessions.length === 0) {
      return NextResponse.json({ success: true, ...fallbackIdentity });
    }

    const latestSession = sessions[0];
    const companyDir = path.join(process.cwd(), '..', '_company');
    const cacheFilePath = path.join(companyDir, 'sessions', latestSession, '_dynamic_identity.json');

    // 1. If cache exists for the latest session, read and return it
    if (fs.existsSync(cacheFilePath)) {
      try {
        const cached = JSON.parse(fs.readFileSync(cacheFilePath, 'utf8'));
        return NextResponse.json({ success: true, ...cached });
      } catch (e) {
        console.error('Failed to parse cached dynamic identity', e);
      }
    }

    const files = getSessionFiles(latestSession);
    if (!files || files.length === 0) {
      return NextResponse.json({ success: true, ...fallbackIdentity });
    }

    const apiKey = process.env.GEMINI_API_KEY;
    if (!apiKey) {
      // Save and return fallback
      fs.writeFileSync(cacheFilePath, JSON.stringify(fallbackIdentity, null, 2), 'utf8');
      return NextResponse.json({ success: true, ...fallbackIdentity });
    }

    // 2. Build files context from latest session
    let filesContext = '';
    files.forEach(file => {
      if (file.name.startsWith('_')) return;
      filesContext += `### 파일명: ${file.name}\n\n`;
      filesContext += `${file.content}\n\n`;
      filesContext += `---\n\n`;
    });

    // 3. Prompts
    const systemPrompt = `당신은 1인 AI 기업의 수석 브랜드 디렉터이자 비즈니스 전략가입니다.
제시된 최신 세션의 에이전트들의 결과물과 활동 내용을 요약/분석하여, '맹칠컴퍼니'의 실시간 기업 정체성과 현재 집중하고 있는 비즈니스 방향성을 정의해 주세요.

지침:
1. **현재 기업 정체성 (identity)**: 에이전트들의 최근 활동을 아우르는 1문장의 세련되고 전문적인 기업 정체성 선언문 (예: '트렌드 분석 및 SNS 자동화에 기반한 콘텐츠 마케팅 혁신 기업', 'AI 기반의 커뮤니티 데이터 분석 및 수익 모델 최적화 솔루션 기업' 등)
2. **현재 비즈니스 포커스 (focus)**: 현재 에이전트들의 작업을 바탕으로 지금 이 순간 가장 핵심적으로 추진하고 있는 비즈니스 목표 2~3가지
3. **사장님을 위한 핵심 제안 (suggestion)**: 사장님이 이 정체성을 실체화하기 위해 바로 내려야 할 주요 의사결정의 방향

반드시 아래와 같은 JSON 형식으로만 응답해 주세요. JSON 형식을 엄격히 지켜야 하며, 다른 설명 없이 JSON 코드만 출력하세요.
{
  "identity": "1문장 브랜드 정체성 선언문",
  "focus": [
    "비즈니스 포커스 1",
    "비즈니스 포커스 2"
  ],
  "suggestion": "사장님을 위한 제안"
}`;

    const userPrompt = `${systemPrompt}\n\n아래는 최신 세션 [${latestSession}]에서 에이전트들이 수행한 결과물들입니다. 이를 기반으로 맹칠컴퍼니의 실시간 정체성과 포커스를 뽑아주세요.

[최신 세션 데이터]
${filesContext}`;

    // 4. Call API
    let geminiUrl = '';
    const headers = { 'Content-Type': 'application/json' };
    let requestBody = {};

    if (apiKey.startsWith('AQ')) {
      const projectNumber = process.env.GEMINI_PROJECT_NUMBER || '773040580705';
      const region = 'us-central1';
      geminiUrl = `https://${region}-aiplatform.googleapis.com/v1/projects/${projectNumber}/locations/${region}/publishers/google/models/gemini-1.5-flash:generateContent`;
      headers['Authorization'] = `Bearer ${apiKey}`;
      requestBody = {
        contents: [{ role: 'user', parts: [{ text: userPrompt }] }],
        generationConfig: { temperature: 0.7, maxOutputTokens: 1024 }
      };
    } else {
      geminiUrl = `https://generativelanguage.googleapis.com/v1beta/models/gemini-1.5-flash:generateContent?key=${apiKey}`;
      requestBody = {
        contents: [{ parts: [{ text: userPrompt }] }],
        generationConfig: { temperature: 0.7, topP: 0.95 }
      };
    }

    const response = await fetch(geminiUrl, {
      method: 'POST',
      headers,
      body: JSON.stringify(requestBody)
    });

    let finalIdentity = fallbackIdentity;

    if (response.ok) {
      const resData = await response.json();
      let text = resData.candidates?.[0]?.content?.parts?.[0]?.text;
      if (text) {
        try {
          text = text.replace(/```json/g, '').replace(/```/g, '').trim();
          const parsed = JSON.parse(text);
          if (parsed.identity && parsed.focus && Array.isArray(parsed.focus)) {
            finalIdentity = parsed;
          }
        } catch (e) {
          console.error('[Gemini API parsing error] fallback to static identity', e);
        }
      }
    } else {
      console.error('[Gemini API response error] status:', response.status);
    }

    // Cache the result in the latest session folder
    const sessionDir = path.dirname(cacheFilePath);
    if (!fs.existsSync(sessionDir)) {
      fs.mkdirSync(sessionDir, { recursive: true });
    }
    fs.writeFileSync(cacheFilePath, JSON.stringify(finalIdentity, null, 2), 'utf8');

    return NextResponse.json({ success: true, ...finalIdentity });

  } catch (error) {
    console.error('[Dynamic Identity API Error]', error);
    return NextResponse.json({ success: true, ...fallbackIdentity });
  }
}
