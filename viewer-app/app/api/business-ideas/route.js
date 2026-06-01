import { NextResponse } from 'next/server';
import { getSessionFiles } from '../../lib/api';
import fs from 'fs';
import path from 'path';

// Local high-value fallbacks if Gemini fails or is not set up
const fallbackIdeas = [
  {
    title: "AI 기반 유튜브 자동화 숏폼/릴스 제작 대행 사업",
    category: "유튜브 / SNS 사업",
    utilization: "Writer의 스크립트 초안과 YouTube 레오의 트렌드 기획력을 조합하여 자동으로 대량의 숏폼을 제작하고, 타 브랜드의 소셜 채널 운영을 대행합니다.",
    monetization: "채널당 월 80~150만원의 대행 관리 수수료 및 유튜브 조회수 수익 분배",
    action: "이번 세션에서 나온 스크립트를 바탕으로 30초짜리 템플릿 쇼츠 3개를 제작해 포트폴리오를 구성하세요."
  },
  {
    title: "경쟁사 ROI 분석 기반 가격 최적화 컨설팅 서비스",
    category: "비즈니스 컨설팅 / 솔루션",
    utilization: "현빈전략가의 가격 계획(10% 할인, 프로젝트별 상향) 및 Researcher의 경쟁사 ROI 데이터 분석법을 템플릿화하여 1인 기업들에게 가격 최적화 솔루션을 제공합니다.",
    monetization: "컨설팅 건당 50만원 또는 최적화로 상승한 매출의 10% 쉐어",
    action: "competitors.csv 및 분석된 매출 구조를 바탕으로 '가격 전략 제안서 PPT' 기본 템플릿을 완성하세요."
  },
  {
    title: "AI 자동화 챗봇 및 데이터 수집 에이전트 구축 대행",
    category: "IT 자동화 / 개발 사업",
    utilization: "코다리의 코드 자동화 기술 및 댓글 수집기 툴 스펙을 활용하여, 쇼핑몰이나 대형 채널의 댓글을 자동 수집하고 자동 응답을 처리해 주는 챗봇 에이전트를 구축해 줍니다.",
    monetization: "초기 구축 비용 150만원 + 월 유지 보수료 15만원",
    action: "댓글 수집기 코드 데모를 로컬에서 구동하여 실제 작동 화면을 1분짜리 녹화본으로 준비하세요."
  }
];

const fallbackFeedback = `## [2026-06-01 의사결정 피드백]
- **Market Researcher**: 이번 트렌드 분석 결과를 바탕으로, AI 자동화 툴 시장의 숏폼 수요 조사를 추가 진행하세요.
- **Business (현빈)**: 현빈이 제안한 10% 첫 구매 할인 모델과 프로젝트별 가격 상향안을 최종 승인합니다. 다음 세션에서 이 기준을 적용하세요.
- **Writer (작가)**: 승인된 할인 혜택과 가격 인상안의 정당성을 강조하는 소셜 미디어(유튜브/인스타) 숏폼 스크립트 초안을 완성하세요.
- **Developer (코다리)**: 데이터 수집 툴의 로컬 캐시 안정성 테스트를 마무리해 주세요.`;

export async function POST(request) {
  try {
    const { sessionId } = await request.json();

    if (!sessionId) {
      return NextResponse.json(
        { success: false, error: '세션 ID가 제공되지 않았습니다.' },
        { status: 400 }
      );
    }

    const companyDir = path.join(process.cwd(), '..', '_company');
    const sessionDir = path.join(companyDir, 'sessions', sessionId);
    const targetFilePath = path.join(sessionDir, '_business_ideas.json');

    // 1. If cached file exists, read and return it immediately
    if (fs.existsSync(targetFilePath)) {
      try {
        const cachedContent = fs.readFileSync(targetFilePath, 'utf8');
        const parsed = JSON.parse(cachedContent);
        
        // Handle backward compatibility (if cache file was just an array in previous version)
        if (Array.isArray(parsed)) {
          return NextResponse.json({ 
            success: true, 
            ideas: parsed, 
            feedbackTemplate: fallbackFeedback 
          });
        }
        
        return NextResponse.json({ 
          success: true, 
          ideas: parsed.ideas || fallbackIdeas, 
          feedbackTemplate: parsed.feedbackTemplate || fallbackFeedback 
        });
      } catch (e) {
        console.error('Failed to parse cached business ideas', e);
      }
    }

    const files = getSessionFiles(sessionId);
    if (!files || files.length === 0) {
      return NextResponse.json({ 
        success: true, 
        ideas: fallbackIdeas, 
        feedbackTemplate: fallbackFeedback 
      });
    }

    const apiKey = process.env.GEMINI_API_KEY;
    if (!apiKey) {
      const responseData = { ideas: fallbackIdeas, feedbackTemplate: fallbackFeedback };
      if (!fs.existsSync(sessionDir)) {
        fs.mkdirSync(sessionDir, { recursive: true });
      }
      fs.writeFileSync(targetFilePath, JSON.stringify(responseData, null, 2), 'utf8');
      return NextResponse.json({ success: true, ...responseData });
    }

    // 2. Format files context for prompt
    let filesContext = '';
    files.forEach(file => {
      if (file.name.startsWith('_')) return;
      filesContext += `### 파일명: ${file.name}\n\n`;
      filesContext += `${file.content}\n\n`;
      filesContext += `---\n\n`;
    });

    // 3. System and User Prompt
    const systemPrompt = `당신은 1인 기업 및 소셜 미디어(유튜브, 인스타그램 등), IT 자동화 창업 분야의 최고 수준의 비즈니스 인큐베이터이자 전략 컨설턴트입니다.
제시된 에이전트들의 세션 연구 결과 및 산출물을 분석하여, 사용자가 이 결과물을 활용해 "즉시 실천하여 돈을 벌 수 있는 구체적인 사업 아이템 리스트"와 에이전트들을 피드백해서 똑똑하게 진화시킬 수 있는 피드백 템플릿을 작성해 주세요.

지침:
- 사업 아이템은 1인 기업가 수준에서 즉시 실행 가능한 현실적인 아이템이어야 합니다.
- SNS 사업(인스타그램 릴스 대행, 자동화 계정 운영 등), 유튜브 사업(숏폼 공장, 자동 콘텐츠 기획 채널 등), 개발/서비스 자동화 사업 등 구체적인 카테고리를 명시해 주세요.
- 피드백 템플릿(feedbackTemplate)은 사장님이 그대로 복사하여 'decisions.md'에 붙여넣을 수 있게 에이전트들에게 지시할 명령어가 담긴 마크다운 포맷이어야 합니다. 세션 산출물을 근거로 해야 합니다.

반드시 아래와 같은 JSON 형식으로만 응답해 주세요. JSON 형식을 엄격히 지켜야 하며, 다른 서론이나 설명 없이 JSON 코드만 출력하세요.
{
  "ideas": [
    {
      "title": "아이템명",
      "category": "분야",
      "utilization": "세션 결과물 활용 방법",
      "monetization": "수익 구조",
      "action": "즉시 실행할 행동"
    }
  ],
  "feedbackTemplate": "## [날짜 의사결정 피드백]\\n- **에이전트명**: 구체적인 피드백 내용과 다음 행동 지시\\n- **에이전트명**: ..."
}`;

    const userPrompt = `${systemPrompt}\n\n아래는 세션 [${sessionId}]에서 에이전트들이 생성한 결과물 파일들입니다. 
이 데이터들을 종합하여 구체적인 사업 아이템 리스트와 피드백 템플릿을 작성해 주세요.

[에이전트 산출물 데이터 시작]
${filesContext}
[에이전트 산출물 데이터 끝]`;

    // 4. API Request
    let geminiUrl = '';
    const headers = { 'Content-Type': 'application/json' };
    let requestBody = {};

    if (apiKey.startsWith('ya29.')) {
      const projectNumber = process.env.GEMINI_PROJECT_NUMBER || '773040580705';
      const region = 'us-central1';
      geminiUrl = `https://${region}-aiplatform.googleapis.com/v1/projects/${projectNumber}/locations/${region}/publishers/google/models/gemini-2.5-flash:generateContent`;
      headers['Authorization'] = `Bearer ${apiKey}`;
      requestBody = {
        contents: [{ role: 'user', parts: [{ text: userPrompt }] }],
        generationConfig: { temperature: 0.7, maxOutputTokens: 2048 }
      };
    } else {
      geminiUrl = `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash:generateContent?key=${apiKey}`;
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

    let finalIdeas = fallbackIdeas;
    let finalFeedback = fallbackFeedback;

    if (response.ok) {
      const resData = await response.json();
      let text = resData.candidates?.[0]?.content?.parts?.[0]?.text;
      if (text) {
        try {
          text = text.replace(/```json/g, '').replace(/```/g, '').trim();
          const parsed = JSON.parse(text);
          if (parsed.ideas && Array.isArray(parsed.ideas)) {
            finalIdeas = parsed.ideas;
          }
          if (parsed.feedbackTemplate) {
            finalFeedback = parsed.feedbackTemplate;
          }
        } catch (e) {
          console.error('[Gemini API Parsing Error] fallback to static ideas and feedback', e);
        }
      }
    } else {
      console.error('[Gemini API Response Error] status:', response.status);
    }

    // 5. Cache result
    const responseData = { ideas: finalIdeas, feedbackTemplate: finalFeedback };
    if (!fs.existsSync(sessionDir)) {
      fs.mkdirSync(sessionDir, { recursive: true });
    }
    fs.writeFileSync(targetFilePath, JSON.stringify(responseData, null, 2), 'utf8');

    return NextResponse.json({ success: true, ...responseData });

  } catch (error) {
    console.error('[Business Ideas API Error]', error);
    return NextResponse.json({ success: true, ideas: fallbackIdeas, feedbackTemplate: fallbackFeedback });
  }
}
