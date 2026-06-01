import { NextResponse } from 'next/server';
import { getSessionFiles } from '../../lib/api';
import fs from 'fs';
import path from 'path';

export async function POST(request) {
  try {
    const { sessionId } = await request.json();

    if (!sessionId) {
      return NextResponse.json(
        { success: false, error: '세션 ID가 제공되지 않았습니다.' },
        { status: 400 }
      );
    }

    const files = getSessionFiles(sessionId);
    
    if (!files || files.length === 0) {
      return NextResponse.json(
        { success: false, error: `세션 '${sessionId}'에 해당하는 파일이 없습니다.` },
        { status: 404 }
      );
    }

    const apiKey = process.env.GEMINI_API_KEY;
    if (!apiKey) {
      return NextResponse.json(
        { success: false, error: '.env.local 파일에 GEMINI_API_KEY가 설정되어 있지 않습니다.' },
        { status: 500 }
      );
    }

    // 1. 에이전트들의 파일 내용을 하나의 텍스트로 병합
    let filesContext = '';
    files.forEach(file => {
      // 이미 생성된 고도화 파일은 프롬프트 소스에서 제외 (무한 루프 방지)
      if (file.name === '_refined_codex.md') return;
      
      filesContext += `### 파일명: ${file.name}\n\n`;
      filesContext += `${file.content}\n\n`;
      filesContext += `---\n\n`;
    });

    // 2. 통합 프롬프트 작성
    const systemPrompt = `당신은 에이전트들의 중간 연구 결과 및 산출물을 취합하여, 비즈니스 및 개발 요구사항에 부합하도록 고도화(Refinement)하고 구체적인 실체화(Realization) 방안을 수립하는 수석 AI 소프트웨어 아키텍트입니다. 
제공되는 여러 에이전트들의 세션 결과물을 꼼꼼히 분석하여 다음 항목을 담은 종합 실체화 보고서를 한글로 작성해 주세요:
1. **에이전트별 산출물 요약 및 분석**: 무엇을 수행했고 어떤 핵심 데이터를 도출했는지
2. **아이디어 및 전략 고도화**: 도출된 결과를 비즈니스적/수익화 관점에서 확장하고 살을 붙인 제안
3. **구체적 실체화 방안**: 구현해야 할 소프트웨어 구조, 필요한 스키마, 혹은 구체적인 액션 아이템/코드 예시
4. **다음 단계 계획 (Next Steps)**: 에이전트들이 다음에 이어서 해야 할 구체적인 태스크 제안

반드시 풍부하고 세부적이며 즉시 활용 가능한 형태로 Markdown 형식으로 작성해야 합니다.`;

    const userPrompt = `${systemPrompt}\n\n아래는 세션 [${sessionId}]에서 에이전트들이 생성한 결과물 파일들입니다. 
이 데이터들을 종합하여 고도화 및 실체화 계획을 작성해 주세요.

[에이전트 산출물 데이터 시작]
${filesContext}
[에이전트 산출물 데이터 끝]`;

    // 3. Google Gemini API 호출 (인증 키 타입에 따라 AI Studio 혹은 Vertex AI 분기 처리)
    let geminiUrl = '';
    const headers = {
      'Content-Type': 'application/json'
    };
    let requestBody = {};

    if (apiKey.startsWith('AQ')) {
      // GCP Vertex AI OAuth Access Token 방식
      const projectNumber = process.env.GEMINI_PROJECT_NUMBER || '773040580705';
      const region = 'us-central1'; // GCP Vertex AI 기본 리전
      geminiUrl = `https://${region}-aiplatform.googleapis.com/v1/projects/${projectNumber}/locations/${region}/publishers/google/models/gemini-1.5-flash:generateContent`;
      headers['Authorization'] = `Bearer ${apiKey}`;
      
      requestBody = {
        contents: [
          {
            role: 'user',
            parts: [{ text: userPrompt }]
          }
        ],
        generationConfig: {
          temperature: 0.7,
          maxOutputTokens: 8192
        }
      };
      console.log(`[Gemini API] GCP Vertex AI 엔드포인트를 호출합니다. (프로젝트 번호: ${projectNumber})`);
    } else {
      // 일반 구글 AI Studio API Key 방식
      geminiUrl = `https://generativelanguage.googleapis.com/v1beta/models/gemini-1.5-flash:generateContent?key=${apiKey}`;
      requestBody = {
        contents: [
          {
            parts: [{ text: userPrompt }]
          }
        ],
        generationConfig: {
          temperature: 0.7,
          topP: 0.95
        }
      };
      console.log('[Gemini API] Google AI Studio 엔드포인트를 호출합니다.');
    }

    const response = await fetch(geminiUrl, {
      method: 'POST',
      headers,
      body: JSON.stringify(requestBody)
    });

    if (!response.ok) {
      const errText = await response.text();
      let detailedError = `HTTP ${response.status}`;
      try {
        const errJson = JSON.parse(errText);
        // Vertex AI와 AI Studio의 에러 객체 구조 파싱
        if (errJson.error && errJson.error.message) {
          detailedError = errJson.error.message;
        } else if (Array.isArray(errJson) && errJson[0]?.error?.message) {
          detailedError = errJson[0].error.message;
        }
      } catch (e) {
        detailedError = errText || response.statusText;
      }
      
      console.error(`[Gemini API] API 호출 실패: ${response.status} - ${errText}`);
      return NextResponse.json(
        { success: false, error: `Gemini API 오류: ${detailedError} (코드: ${response.status})` },
        { status: response.status }
      );
    }

    const resData = await response.json();
    const refinedContent = resData.candidates?.[0]?.content?.parts?.[0]?.text;

    if (!refinedContent) {
      return NextResponse.json(
        { success: false, error: 'Gemini로부터 올바른 텍스트 응답을 받지 못했습니다. API 응답 형식을 확인해 주세요.' },
        { status: 500 }
      );
    }

    // 4. 고도화 결과를 세션 폴더에 _refined_codex.md로 저장
    const companyDir = path.join(process.cwd(), '..', '_company');
    const sessionDir = path.join(companyDir, 'sessions', sessionId);
    
    if (!fs.existsSync(sessionDir)) {
      fs.mkdirSync(sessionDir, { recursive: true });
    }

    const targetFilePath = path.join(sessionDir, '_refined_codex.md');
    fs.writeFileSync(targetFilePath, refinedContent, 'utf8');

    console.log(`[Gemini API] 고도화 완료 및 파일 저장 완료: ${targetFilePath}`);

    return NextResponse.json({
      success: true,
      message: 'Gemini 고도화 완료 및 파일 저장 완료',
      filename: '_refined_codex.md'
    });

  } catch (error) {
    console.error('[Gemini API Route Error]', error);
    return NextResponse.json(
      { success: false, error: error.message || '서버 내부 오류가 발생했습니다.' },
      { status: 500 }
    );
  }
}
