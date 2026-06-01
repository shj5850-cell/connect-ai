import { NextResponse } from 'next/server';
import { exec } from 'child_process';
import fs from 'fs';
import path from 'path';

export async function POST(request) {
  try {
    const { 
      keyword, 
      voice, 
      affiliateLink,
      imageSourceMode,
      directImageUrl,
      localImageBase64,
      localImageFileName
    } = await request.json();

    let directImagePath = '';
    if (localImageBase64 && localImageBase64.includes('base64,')) {
      try {
        const parts = localImageBase64.split(';base64,');
        const mimeType = parts[0].split(':')[1];
        const base64Data = parts[1];
        const buffer = Buffer.from(base64Data, 'base64');
        
        let ext = 'jpg';
        if (mimeType.includes('png')) ext = 'png';
        else if (mimeType.includes('webp')) ext = 'webp';
        else if (mimeType.includes('gif')) ext = 'gif';
        
        const uploadDir = path.join(process.cwd(), 'public', 'shorts', 'uploads');
        fs.mkdirSync(uploadDir, { recursive: true });
        
        const uploadFilename = `upload_${Date.now()}.${ext}`;
        const absoluteUploadPath = path.join(uploadDir, uploadFilename);
        fs.writeFileSync(absoluteUploadPath, buffer);
        directImagePath = absoluteUploadPath.replace(/\\/g, '/');
        console.log(`Saved base64 uploaded image to: ${directImagePath}`);
      } catch (e) {
        console.error('[Base64 Image Save Error]', e);
      }
    }

    if (!keyword || !keyword.trim()) {
      return NextResponse.json(
        { success: false, error: '쇼츠를 제작할 키워드를 입력해 주세요.' },
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

    const systemPrompt = `당신은 조회수를 폭발시킬 수 있는 숏폼(유튜브 쇼츠, 인스타그램 릴스) 콘텐츠 전문 기획자입니다.
입력받은 키워드에 대해 시청자들의 관심을 확 끌어당겨 30초 이내에 전달할 수 있는 극도의 효율적인 오디오 대본(스크립트)과 검색용 영어 키워드를 작성해 주세요.

지침:
1. **쇼츠 제목 (title)**: 직관적이고 자극적이며 클릭률을 높일 수 있는 15자 내외의 제목을 지어주세요.
2. **나레이션 대본 (script)**: 
   - 성우가 실제로 읽을 대본만 자연스러운 대화체로 작성해 주세요. (오디오나 연출 지시어는 포함하지 마세요)
   - 반드시 **30초 이내**로 다 읽을 수 있어야 하므로, 한국어 공백 포함 **110자에서 130자 내외**로 짧고 강렬하게 작성해 주세요.
   - 마지막에 시청자의 댓글 유도 또는 클릭 유도(Call-to-Action) 멘트를 한 줄 포함해 주세요 (예: "더 자세한 정보는 댓글창 최저가 링크를 확인하세요!").
3. **스톡 이미지 검색 키워드 (searchKeywords)**: 
   - 스크립트 내용에 가장 잘 부합하는 무료 스톡 이미지(Unsplash)를 검색할 수 있도록 **영어 단어 3개**를 배열 형태로 제공해 주세요. (예: ["beef", "korean bbq", "cooking"])

반드시 아래와 같은 JSON 형식으로만 응답해 주세요. 마크다운 기호(\`\`\`json 등)와 주석을 포함하지 않고 순수 JSON 코드만 리턴해야 합니다.
{
  "title": "쇼츠 제목",
  "script": "성우 나레이션 대본",
  "searchKeywords": ["keyword1", "keyword2", "keyword3"]
}`;

    const userPrompt = `${systemPrompt}

[사용자 입력 키워드]
키워드: ${keyword}
대본 톤앤매너: 친근하고 설득력 있는 말투`;

    let geminiUrl = '';
    const headers = { 'Content-Type': 'application/json' };
    let requestBody = {};

    // Standard Google AI Studio API configuration with gemini-flash-latest (1.5 Flash alias) for quota protection
    if (apiKey.startsWith('ya29.')) {
      const projectNumber = process.env.GEMINI_PROJECT_NUMBER || '773040580705';
      const region = 'us-central1';
      geminiUrl = `https://${region}-aiplatform.googleapis.com/v1/projects/${projectNumber}/locations/${region}/publishers/google/models/gemini-1.5-flash:generateContent`;
      headers['Authorization'] = `Bearer ${apiKey}`;
      requestBody = {
        contents: [{ role: 'user', parts: [{ text: userPrompt }] }],
        generationConfig: { temperature: 0.8, maxOutputTokens: 1024 }
      };
    } else {
      geminiUrl = `https://generativelanguage.googleapis.com/v1beta/models/gemini-flash-latest:generateContent?key=${apiKey}`;
      requestBody = {
        contents: [{ parts: [{ text: userPrompt }] }],
        generationConfig: { temperature: 0.8, topP: 0.95 }
      };
    }

    console.log(`Calling Gemini API for keyword: "${keyword}"...`);
    const response = await fetch(geminiUrl, {
      method: 'POST',
      headers,
      body: JSON.stringify(requestBody)
    });

    let shortsPlan = {
      title: `🚨 대박 추천! ${keyword} 솔직 꿀팁 후기`,
      script: `요즘 대세로 떠오르는 ${keyword}에 대해 알고 계셨나요? 직접 경험해 보니 진짜 기대 이상으로 너무 편리하고 퀄리티가 대박이었습니다. 남녀노소 누구나 후회 없을 선택이라고 장담합니다. 더 자세한 정보와 최저가 구매는 고정 댓글창 할인 링크를 지금 바로 클릭해서 확인해 보세요!`,
      searchKeywords: ["shopping", "useful", "popular"]
    };

    if (response.ok) {
      const resData = await response.json();
      let resText = resData.candidates?.[0]?.content?.parts?.[0]?.text;
      if (resText) {
        try {
          resText = resText.replace(/```json/g, '').replace(/```/g, '').trim();
          const parsed = JSON.parse(resText);
          if (parsed.script && parsed.searchKeywords) {
            shortsPlan = parsed;
            console.log('Successfully generated script plan from Gemini:', shortsPlan);
          }
        } catch (e) {
          console.error('[Gemini JSON Parse Error]', e);
        }
      }
    } else {
      console.error('[Gemini API Quota Error / Failure]', response.status, await response.text());
      console.log('Gemini API is out of quota or failed. Falling back to category-matched static script...');
      
      // Category matched fallback scripts if Gemini is completely blocked by quota limits
      const lowerKeyword = keyword.toLowerCase();
      if (/차돌박이|삼겹살|고기|갈비|등심|안심|육회|한우|돈육|우육|스테이크|대패|우삼겹|bbq|meat|beef|pork|음식|식품|맛있는/.test(lowerKeyword)) {
        shortsPlan = {
          title: `🚨 쿠팡 대란! 맛있는 ${keyword} 솔직 먹방 후기`,
          script: `입맛 없을 때 무조건 생각나는 꿀맛 메뉴, 바로 ${keyword} 입니다! 조리법도 간단하고 한 입 먹으면 고소한 육즙과 감칠맛이 진짜 미쳤습니다. 가성비까지 끝내주니 쟁여두고 드시는 걸 강력 추천합니다. 최저가 할인 정보와 구매는 댓글창의 고정 링크를 확인해 보세요!`,
          searchKeywords: ["meat", "korean bbq", "beef"]
        };
      } else if (/화장품|피부|뷰티|크림|스킨|로션|cosmetic|beauty/.test(lowerKeyword)) {
        shortsPlan = {
          title: `✨ 피부 미인 치트키! ${keyword} 솔직 리뷰`,
          script: `요즘 관리하는 사람들 사이에서 화제인 뷰티 템, 바로 ${keyword} 입니다. 바르자마자 끈적임 없이 촉촉하고 영양이 꽉 차서 하루 종일 빛나는 피부결을 느낄 수 있습니다. 늦기 전에 피부 관리 시작하세요! 할인 구매 링크는 고정 댓글창에 남겨두었습니다!`,
          searchKeywords: ["cosmetics", "skincare", "beauty"]
        };
      } else if (/컴퓨터|노트북|마우스|키보드|폰|가전|전자|IT|phone|laptop/.test(lowerKeyword)) {
        shortsPlan = {
          title: `💻 효율 극대화! 스마트 추천템 ${keyword} 분석`,
          script: `오늘 소개해 드릴 스마트 라이프 필수템은 바로 ${keyword} 입니다! 군더더기 없는 디자인은 기본이고 뛰어난 반응성과 내구성으로 일상의 질을 확 올려줍니다. 가성비도 역대급이니 지금 꼭 써보세요! 최저가 할인 링크는 댓글창에 남겨뒀습니다!`,
          searchKeywords: ["laptop", "gadget", "technology"]
        };
      }
    }

    // Append affiliate link to script if provided
    if (affiliateLink && affiliateLink.trim()) {
      shortsPlan.script += `\n🛒 구매 좌표: ${affiliateLink}`;
    }

    // Prepare temp config for Python script
    const timestamp = Date.now();
    const videoFilename = `stock_${timestamp}.mp4`;
    const outputDir = path.join(process.cwd(), 'public', 'shorts');
    fs.mkdirSync(outputDir, { recursive: true });
    
    const absoluteOutputPath = path.join(outputDir, videoFilename);
    const relativeVideoUrl = `/shorts/${videoFilename}`;

    const configPath = path.join(outputDir, `config_${timestamp}.json`);
    const inputData = {
      script: shortsPlan.script,
      voice: voice || 'female',
      search_keywords: shortsPlan.searchKeywords,
      output_path: absoluteOutputPath.replace(/\\/g, '/'),
      image_source_mode: imageSourceMode || 'stock_naver',
      direct_image_url: directImageUrl || '',
      direct_image_path: directImagePath || '',
      keyword: keyword
    };

    fs.writeFileSync(configPath, JSON.stringify(inputData, null, 2), 'utf-8');

    console.log(`Triggering video generation script for ${videoFilename}...`);
    const scriptPath = path.join(process.cwd(), 'scripts', 'generate_stock_shorts.py');

    // Execute python script
    return new Promise((resolve) => {
      exec(`python "${scriptPath}" "${configPath}"`, (error, stdout, stderr) => {
        // Clean up temp config file
        try {
          if (fs.existsSync(configPath)) {
            fs.unlinkSync(configPath);
          }
        } catch (e) {
          console.error('Error cleaning up temp json config:', e);
        }

        // Clean up uploaded image if exists
        try {
          if (directImagePath && fs.existsSync(directImagePath)) {
            fs.unlinkSync(directImagePath);
          }
        } catch (e) {}

        if (error) {
          console.error(`Python script error:`, error);
          console.error(`stderr: ${stderr}`);
          console.error(`stdout: ${stdout}`);
          
          // Retry with python3
          console.log('Retrying with python3...');
          fs.writeFileSync(configPath, JSON.stringify(inputData, null, 2), 'utf-8');
          
          exec(`python3 "${scriptPath}" "${configPath}"`, (py3Error, py3Stdout, py3Stderr) => {
            try {
              if (fs.existsSync(configPath)) {
                fs.unlinkSync(configPath);
              }
            } catch (e) {}

            try {
              if (directImagePath && fs.existsSync(directImagePath)) {
                fs.unlinkSync(directImagePath);
              }
            } catch (e) {}

            if (py3Error) {
              console.error(`Python3 script error:`, py3Error);
              console.error(`stderr: ${py3Stderr}`);
              resolve(
                NextResponse.json(
                  { 
                    success: false, 
                    error: '비디오 합성 스크립트 실행 실패', 
                    details: py3Stderr || py3Error.message 
                  },
                  { status: 500 }
                )
              );
            } else {
              console.log('Video rendered successfully with python3!');
              resolve(
                NextResponse.json({
                  success: true,
                  title: shortsPlan.title,
                  script: shortsPlan.script,
                  searchKeywords: shortsPlan.searchKeywords,
                  videoUrl: relativeVideoUrl
                })
              );
            }
          });
        } else {
          console.log('Video rendered successfully with python!');
          resolve(
            NextResponse.json({
              success: true,
              title: shortsPlan.title,
              script: shortsPlan.script,
              searchKeywords: shortsPlan.searchKeywords,
              videoUrl: relativeVideoUrl
            })
          );
        }
      });
    });

  } catch (error) {
    console.error('Generate Shorts API Handler Error:', error);
    return NextResponse.json(
      { success: false, error: error.message },
      { status: 500 }
    );
  }
}
