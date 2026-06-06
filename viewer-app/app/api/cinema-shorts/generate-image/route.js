import { NextResponse } from 'next/server';
import fs from 'fs';
import path from 'path';

const callGemini = async (apiKey, projectNumber, systemPrompt, userPrompt) => {
  const salt = Math.random().toString(36).substring(2, 15) + '-' + Date.now();
  const enhancedUserPrompt = `${userPrompt}\n\n[Request Salt: ${salt}]`;
  const enhancedSystemPrompt = `${systemPrompt}\n\n[Instruction: Every request is independent. Ignore all previous inputs or outputs. Request Salt: ${salt}]`;

  let geminiUrl = '';
  const headers = { 'Content-Type': 'application/json' };
  let requestBody = {};

  if (apiKey.startsWith('ya29.')) {
    const region = 'us-central1';
    geminiUrl = `https://${region}-aiplatform.googleapis.com/v1/projects/${projectNumber || '773040580705project'}/locations/${region}/publishers/google/models/gemini-1.5-flash:generateContent`;
    headers['Authorization'] = `Bearer ${apiKey}`;
    requestBody = {
      contents: [{ role: 'user', parts: [{ text: `${enhancedSystemPrompt}\n\n${enhancedUserPrompt}` }] }],
      generationConfig: { 
        temperature: 0.85, 
        maxOutputTokens: 2048,
        responseMimeType: "application/json"
      }
    };
  } else {
    geminiUrl = `https://generativelanguage.googleapis.com/v1beta/models/gemini-flash-latest:generateContent?key=${apiKey}`;
    requestBody = {
      contents: [{ parts: [{ text: `${enhancedSystemPrompt}\n\n${enhancedUserPrompt}` }] }],
      generationConfig: { 
        temperature: 0.85, 
        topP: 0.95, 
        maxOutputTokens: 2048,
        responseMimeType: "application/json"
      }
    };
  }

  const response = await fetch(geminiUrl, {
    method: 'POST',
    headers,
    body: JSON.stringify(requestBody)
  });

  if (!response.ok) {
    throw new Error(`Gemini API error: ${response.status} ${await response.text()}`);
  }

  const resData = await response.json();
  let resText = resData.candidates?.[0]?.content?.parts?.[0]?.text;
  if (!resText) {
    throw new Error('No content returned from Gemini');
  }

  resText = resText.replace(/```json/g, '').replace(/```/g, '').trim();
  return JSON.parse(resText);
};

export async function POST(request) {
  try {
    const { 
      prompt, 
      atmosphere, 
      stylePreset, 
      colorPreset,
      cutIndex, 
      allCutsContext,
      title
    } = await request.json();

    if (!prompt || !prompt.trim()) {
      return NextResponse.json(
        { success: false, error: '이미지를 생성할 프롬프트를 입력해 주세요.' },
        { status: 400 }
      );
    }

    const apiKey = process.env.GEMINI_API_KEY;
    if (!apiKey) {
      return NextResponse.json(
        { success: false, error: 'Gemini API Key가 설정되지 않았습니다.' },
        { status: 500 }
      );
    }

    // System prompt to translate, enhance and maintain visual consistency
    const systemPrompt = `당신은 Stable Diffusion 및 Flux 이미지 생성을 위한 고품질 영어 프롬프트 엔지니어이자 마케팅 비주얼 디렉터입니다.
사용자가 입력한 한국어 프롬프트와 영상 정보(제목, 분위기, 스타일 프리셋, 색감 프리셋) 및 4컷의 흐름 맥락(allCutsContext)이 제공됩니다.
당신은 이미지의 완성도가 최고 수준이 되도록 아래 가이드라인에 따라 영어 이미지 생성 프롬프트를 보완/확장하고, 전체 4컷 영상 내에서 시각적 일관성(캐릭터, 분위기, 색상 톤)이 유지될 수 있도록 키워드를 추가해야 합니다.

주의사항:
1. 출력은 반드시 아래 JSON 형식이어야 하며 다른 텍스트는 금지합니다.
{
  "enhancedPrompt": "Flux 또는 Stable Diffusion 이미지 생성을 위해 최종 가공된 영문 프롬프트 (가독성 높은 쉼표 구분 단어와 구절들의 조합)",
  "translation": "영문 프롬프트를 한국어로 번역한 설명",
  "tags": ["이 장면에 해당하는 핵심 영문 명사 단어/태그 2~3개 (예: [\"office\", \"corridor\"])"]
}

2. 영문 프롬프트 가이드라인:
- 분위기(${atmosphere}), 스타일(${stylePreset}), 색감(${colorPreset}) 키워드를 자연스럽게 영문 프롬프트에 녹여내십시오. (예: 'cinematic lighting, warm vintage film color tone, photorealistic, 8k resolution, award-winning cinematography')
- 쇼츠 비율(9:16) 세로형 구도에 알맞은 키워드를 추가하십시오. (예: 'vertical frame, portrait composition, eye-level shot')
- 일관성 유지: ${allCutsContext ? `이전 컷 정보(${allCutsContext})를 분석하여 등장인물의 묘사(머리 스타일, 옷 색상 등)나 주요 사물의 디자인 특징이 이번 ${cutIndex}번째 컷에서도 유지될 수 있도록 일관된 묘사 키워드를 삽입하십시오.` : '캐릭터나 중심 개체가 있는 경우 명확한 묘사를 포함하여 다른 컷들과 연결될 때 튀지 않도록 하십시오.'}
- 텍스트나 로고, 뒤틀림(deformed, distorted)을 피하는 품질 태그도 포함하십시오.`;

    const userPrompt = `[영상 정보]
제목: ${title || '미정'}
분위기: ${atmosphere || '시네마틱'}
스타일 프리셋: ${stylePreset || '기본'}
색감 프리셋: ${colorPreset || '기본'}
현재 제작 중인 컷 번호: Cut ${cutIndex || 1}

[4컷 전체 맥락]
${allCutsContext || '없음'}

[이번 컷 한국어 프롬프트]
${prompt}`;

    console.log(`[Cinema Image Gen] Enhancing prompt with Gemini...`);
    let geminiRes;
    try {
      geminiRes = await callGemini(apiKey, process.env.GEMINI_PROJECT_NUMBER, systemPrompt, userPrompt);
    } catch (geminiErr) {
      console.error('[Gemini Prompt Enhance Fail]', geminiErr);
      geminiRes = {
        enhancedPrompt: `${prompt}, high quality, cinematic lighting, 8k, photorealistic, vertical shot, matching ${atmosphere} style, 9:16 aspect ratio`,
        translation: 'Gemini 번역 실패로 기본 프롬프트 적용',
        tags: ['abstract', 'scenery']
      };
    }

    const enhancedPrompt = geminiRes.enhancedPrompt;
    console.log(`[Cinema Image Gen] Enhanced Prompt: ${enhancedPrompt}`);

    // Call Pollinations.ai to generate image with fallback chain
    const seed = Math.floor(Math.random() * 1000000);
    const outputDir = path.join(process.cwd(), 'public', 'shorts', 'cinema_images');
    fs.mkdirSync(outputDir, { recursive: true });
    
    const timestamp = Date.now();
    const filename = `img_${timestamp}.jpg`;
    const absolutePath = path.join(outputDir, filename);
    const relativeUrl = `/shorts/cinema_images/${filename}`;
    
    let buffer = null;
    let success = false;
    let errorDetails = '';
    
    const pollinationKey = process.env.POLLINATIONS_API_KEY || '';
    const headers = {};
    if (pollinationKey) {
      headers['Authorization'] = `Bearer ${pollinationKey}`;
    }

    // Attempt 1: model=sana (the free active model)
    let urlSana = `https://image.pollinations.ai/prompt/${encodeURIComponent(enhancedPrompt)}?model=sana`;
    if (pollinationKey) {
      urlSana += `&key=${pollinationKey}`;
    }
    console.log(`[Cinema Image Gen] Attempting URL 1 (sana): ${urlSana}`);
    try {
      const res = await fetch(urlSana, { headers });
      if (res.ok) {
        buffer = Buffer.from(await res.arrayBuffer());
        success = true;
        console.log(`[Cinema Image Gen] Generated successfully with model=sana`);
      } else {
        errorDetails += `sana model failed (status ${res.status}); `;
      }
    } catch (e) {
      errorDetails += `sana model error: ${e.message}; `;
    }
    
    // Attempt 2: model=flux (alternative free model attempt)
    if (!success) {
      let urlDefault = `https://image.pollinations.ai/prompt/${encodeURIComponent(enhancedPrompt)}?model=flux`;
      if (pollinationKey) {
        urlDefault += `&key=${pollinationKey}`;
      }
      console.log(`[Cinema Image Gen] Attempting URL 2 (flux): ${urlDefault}`);
      try {
        const res = await fetch(urlDefault, { headers });
        if (res.ok) {
          buffer = Buffer.from(await res.arrayBuffer());
          success = true;
          console.log(`[Cinema Image Gen] Generated successfully with model=flux`);
        } else {
          errorDetails += `flux model failed (status ${res.status}); `;
        }
      } catch (e) {
        errorDetails += `flux model error: ${e.message}; `;
      }
    }
    
    // Attempt 3: dynamic LoremFlickr fallback based on Gemini tags
    if (!success) {
      const tags = geminiRes.tags && geminiRes.tags.length > 0 ? geminiRes.tags.map(t => t.trim().replace(/\s+/g, '-')).join(',') : 'abstract,scenery';
      const loremFlickrUrl = `https://loremflickr.com/1080/1920/${encodeURIComponent(tags)}`;
      console.log(`[Cinema Image Gen] Pollinations failed (${errorDetails}). Falling back to LoremFlickr: ${loremFlickrUrl}`);
      try {
        const res = await fetch(loremFlickrUrl);
        if (res.ok) {
          buffer = Buffer.from(await res.arrayBuffer());
          success = true;
          console.log(`[Cinema Image Gen] Fallback to LoremFlickr successful with tags: ${tags}`);
        } else {
          errorDetails += `LoremFlickr fallback failed (status ${res.status}); `;
        }
      } catch (e) {
        errorDetails += `LoremFlickr fallback error: ${e.message}; `;
      }
    }

    // Attempt 4: high quality unsplash fallback
    if (!success) {
      const unsplashUrl = `https://images.unsplash.com/photo-1618005182384-a83a8bd57fbe?w=1080&h=1920&fit=crop`;
      console.log(`[Cinema Image Gen] LoremFlickr failed. Falling back to static Unsplash photo...`);
      try {
        const res = await fetch(unsplashUrl);
        if (res.ok) {
          buffer = Buffer.from(await res.arrayBuffer());
          success = true;
          console.log(`[Cinema Image Gen] Fallback to Unsplash successful`);
        } else {
          errorDetails += `Unsplash fallback failed (status ${res.status}); `;
        }
      } catch (e) {
        errorDetails += `Unsplash fallback error: ${e.message}; `;
      }
    }
    
    if (!success || !buffer) {
      throw new Error(`Failed to retrieve image from all providers. Details: ${errorDetails}`);
    }

    fs.writeFileSync(absolutePath, buffer);
    console.log(`[Cinema Image Gen] Image saved successfully to: ${absolutePath}`);

    return NextResponse.json({
      success: true,
      imageUrl: relativeUrl,
      localPath: absolutePath,
      enhancedPrompt: enhancedPrompt,
      translation: geminiRes.translation
    });

  } catch (error) {
    console.error('Cinema Image Gen API Error:', error);
    return NextResponse.json(
      { success: false, error: error.message || '이미지 생성 처리 중 오류가 발생했습니다.' },
      { status: 500 }
    );
  }
}
