import { NextResponse } from 'next/server';
import path from 'path';
import fs from 'fs';
import { runPythonScript } from '@/app/lib/pythonRunner';
import { exec } from 'child_process';
import { HOOK_LIBRARY, VISUAL_STYLES, SHOT_PATTERNS, STYLE_DNA_LIST, calculateSimilarity, antiCloneModify } from '../../lib/CreativeDiversityEngine';

const STATUS_PATH = path.join(process.cwd(), 'public', 'shorts', 'autopilot_status.json');
const HISTORY_PATH = path.join(process.cwd(), 'public', 'shorts', 'history.json');
const ACCOUNT_PATH = path.join(
  process.cwd(),
  '..',
  '_company',
  '_agents',
  'youtube',
  'tools',
  'youtube_account.json'
);

function updateStatus(step, message, progress, details = {}) {
  try {
    fs.mkdirSync(path.dirname(STATUS_PATH), { recursive: true });
    fs.writeFileSync(
      STATUS_PATH,
      JSON.stringify({
        status: progress === 100 ? 'completed' : 'running',
        step,
        message,
        progress,
        updated_at: new Date().toISOString(),
        ...details
      }, null, 2),
      'utf-8'
    );
  } catch (e) {
    console.error('Failed to update autopilot status file:', e);
  }
}

export async function GET() {
  try {
    if (fs.existsSync(STATUS_PATH)) {
      const data = JSON.parse(fs.readFileSync(STATUS_PATH, 'utf-8'));
      return NextResponse.json(data);
    }
    return NextResponse.json({ status: 'idle', message: '자동화 가동 대기 중', progress: 0 });
  } catch (e) {
    return NextResponse.json({ status: 'error', error: e.message });
  }
}

export async function POST() {
  // Start the autopilot asynchronously so the request returns immediately and the user can poll
  runAutopilotProcess();
  
  return NextResponse.json({ 
    success: true, 
    message: '비즈니스 완전 자동화(Autopilot)가 백엔드에서 기동되었습니다.' 
  });
}

async function runAutopilotProcess() {
  const timestamp = Date.now();
  console.log('[Autopilot] Started Autopilot loop...');
  updateStatus('product_matching', '1단계: 수익성 극대화 상품 분석 및 매칭 중...', 10);

  try {
    // 1. Run monetization tool to find best product
    const monToolPath = path.join(
      process.cwd(),
      '..',
      '_company',
      '_agents',
      'business',
      'tools',
      'monetization_tool.py'
    );
    
    if (fs.existsSync(monToolPath)) {
      try {
        await runPythonScript(monToolPath);
      } catch (e) {
        console.warn('Monetization script failed, but we will continue with defaults:', e.message);
      }
    }

    // Read top product (fallback to Macbook Air M3)
    let productTitle = '맥북 에어 M3 15인치 (AI 런타임 최적)';
    let affiliateLink = 'https://link.coupang.com/a/macbook_m3';
    let keyword = '초간단 AI 꿀팁 - 맥북 에어 M3 15인치 (AI 런타임 최적)';
    
    const dbPath = path.join(process.cwd(), '..', '_company', '_shared', 'monetization_db.json');
    if (fs.existsSync(dbPath)) {
      try {
        const db = JSON.parse(fs.readFileSync(dbPath, 'utf-8'));
        const log = db.monetization_log;
        if (Array.isArray(log) && log.length > 0) {
          const latest = log[log.length - 1];
          if (latest && Array.isArray(latest.top_picks) && latest.top_picks.length > 0) {
            const top = latest.top_picks[0];
            productTitle = top.product_name;
            keyword = `${top.topic} 꿀팁 - ${top.product_name}`;
            affiliateLink = `https://link.coupang.com/a/mock_${top.product_name.toLowerCase().replace(/[^a-z0-9]/g, '_')}`;
          }
        }
      } catch (e) {
        console.error('Failed to parse monetization db:', e);
      }
    }

    console.log(`[Autopilot] Target product: ${productTitle}`);
    updateStatus('script_generation', '2단계: AI 대본 및 화면 연출 프롬프트 창작 중...', 30);

    // 2. Generate 4-cut script using Gemini or fallback (with retry loop for Quality Board audit)
    let scriptData = null;
    const apiKey = process.env.GEMINI_API_KEY;
    let preUploadAnalysis = null;
    let imagePaths = [];
    const outputImgDir = path.join(process.cwd(), 'public', 'shorts', 'cinema_images');
    fs.mkdirSync(outputImgDir, { recursive: true });

    let usedStyle = '';
    let hookType = '';
    let shotPattern = '';
    let isExperiment = false;
    let styleDna = 'Motivation';
    let similarityScore = 0;
    let diversityScore = 100;
    let customFont = 'Pretendard-Bold';
    let customCaptionStyle = 'minimal';
    let customCaptionPosition = 'bottom';
    let forceScrambledParams = false;
    let similarityPenalty = 0;
    let selectedSuccessVids = [];

    let styleDnaList = [];
    const styleDnaDbPath = path.join(process.cwd(), '..', '_company', '_shared', 'style_dna_db.json');
    if (fs.existsSync(styleDnaDbPath)) {
      try {
        const db = JSON.parse(fs.readFileSync(styleDnaDbPath, 'utf-8'));
        styleDnaList = db.style_dna_list || [];
      } catch (e) {
        console.error('Failed to parse style_dna_db.json:', e);
      }
    }

    let successDnaList = [];
    const successDnaDbPath = path.join(process.cwd(), '..', '_company', '_shared', 'success_dna_db.json');
    if (fs.existsSync(successDnaDbPath)) {
      try {
        const db = JSON.parse(fs.readFileSync(successDnaDbPath, 'utf-8'));
        successDnaList = db.success_dna_list || [];
      } catch (e) {
        console.error('Failed to parse success_dna_db.json:', e);
      }
    }

    let revenueDnaList = [];
    const revenueDnaDbPath = path.join(process.cwd(), '..', '_company', '_shared', 'revenue_dna_db.json');
    if (fs.existsSync(revenueDnaDbPath)) {
      try {
        const db = JSON.parse(fs.readFileSync(revenueDnaDbPath, 'utf-8'));
        revenueDnaList = db.revenue_dna_list || [];
      } catch (e) {
        console.error('Failed to parse revenue_dna_db.json:', e);
      }
    }

    let failureDnaList = [];
    const failureDnaDbPath = path.join(process.cwd(), '..', '_company', '_shared', 'failure_dna_db.json');
    if (fs.existsSync(failureDnaDbPath)) {
      try {
        const db = JSON.parse(fs.readFileSync(failureDnaDbPath, 'utf-8'));
        failureDnaList = db.failure_dna_list || [];
      } catch (e) {
        console.error('Failed to parse failure_dna_db.json:', e);
      }
    }

    let finalScoreAvg = 0;
    let retryCount = 0;
    const maxRetries = 3;

    while (retryCount <= maxRetries) {
      if (retryCount > 0) {
        console.log(`[Autopilot] Quality Board score <= 70 or clone alert. Regenerating content... (Retry attempt ${retryCount}/${maxRetries})`);
        updateStatus('script_generation', `품질 보드 심사 또는 유사도 통과 실패로 재시도 중... (${retryCount}/${maxRetries}회)`, 30 + retryCount * 5);
      }

      imagePaths = []; // Reset image paths

      isExperiment = Math.random() < 0.2;

      // Select Style DNA based on Experiment status (only if not forced by clone scrambling retry)
      if (!forceScrambledParams) {
        if (isExperiment || styleDnaList.length === 0) {
          styleDna = STYLE_DNA_LIST[Math.floor(Math.random() * STYLE_DNA_LIST.length)];
        } else {
          const uniqueStyles = [...new Set(styleDnaList.map(item => item.style))];
          if (uniqueStyles.length > 0) {
            styleDna = uniqueStyles[Math.floor(Math.random() * uniqueStyles.length)];
          } else {
            styleDna = STYLE_DNA_LIST[Math.floor(Math.random() * STYLE_DNA_LIST.length)];
          }
        }

        usedStyle = VISUAL_STYLES[Math.floor(Math.random() * VISUAL_STYLES.length)];
        const selectedHook = HOOK_LIBRARY[Math.floor(Math.random() * HOOK_LIBRARY.length)];
        hookType = selectedHook.type;
        const selectedPattern = SHOT_PATTERNS[Math.floor(Math.random() * SHOT_PATTERNS.length)];
        shotPattern = selectedPattern.name;
      } else {
        // Reset force flag so next iterations can select normally if needed
        forceScrambledParams = false;
      }

      if (apiKey) {
        try {
          const selfImprovementGuidelines = getSelfImprovementGuidelines();
          const revenueDnaGuidelines = getRevenueDnaGuidelines();
          const failureDnaGuidelines = getFailureDnaGuidelines();
          const agentIntelligenceGuidelines = getAgentIntelligenceGuidelines();
          
          // Select 3 to 5 random success DNAs
          selectedSuccessVids = [];
          if (successDnaList.length > 0) {
            const shuffled = [...successDnaList].sort(() => 0.5 - Math.random());
            const numToSelect = Math.min(shuffled.length, Math.floor(Math.random() * 3) + 3); // 3, 4, or 5
            selectedSuccessVids = shuffled.slice(0, numToSelect);
          }
          const successDnaGuidelines = getSuccessDnaGuidelines(selectedSuccessVids);
          
          let combinedGuidelines = '';
          if (isExperiment) {
            console.log('[Autopilot] AUTO EXPERIMENT ACTIVE: Bypassing success/revenue DNA rules.');
            combinedGuidelines = `\n[💡 자가 실험 모드 가동: 기존 성공 공식을 무시하고 완전히 새로운 컨셉을 탐험하십시오]\n` + failureDnaGuidelines + agentIntelligenceGuidelines;
          } else {
            combinedGuidelines = `
[📢 대본 작성 가중치 비율 지침 (작가 필독)]
당신은 대본을 작성할 때 반드시 다음 4가지 성과 요소를 지정된 가중치 비율에 맞추어 완벽히 반영해야 합니다:
1. **성공 DNA 패턴 (Success DNA)**: 50% 가중치. 과거에 조회수가 높았던 대본 구성, 어조, 장면 아이디어를 가장 적극적으로 모방하고 강화할 것.
2. **수익화 DNA 패턴 (Revenue DNA)**: 25% 가중치. 고수익 및 고ROI를 유발한 최적 카피 패턴 및 상품 매칭 전환 문구를 벤치마킹할 것.
3. **실패 DNA 패턴 (Failure DNA)**: 15% 가중치. 아래 실패 원인(도입부 설명조 진행, 지루함 등)을 적극적 회피(Constraint)할 것.
4. **에이전트 최근 교훈 (Agent Intelligence)**: 10% 가중치. 에이전트 인텔리전스의 성장 학습 포인트를 준수할 것.

` + successDnaGuidelines + revenueDnaGuidelines + failureDnaGuidelines + agentIntelligenceGuidelines;
            
            // In non-experiment mode, read from successful templates/style DNA
            if (styleDnaList.length > 0) {
              combinedGuidelines += `\n[🧠 STYLE DNA REFERENCE]
- 과거에 성공한 스타일 DNA 패턴을 참고하십시오: ${styleDnaList.slice(-5).map(item => `"${item.style}" (조회수: ${item.views})`).join(', ')}\n`;
            }
          }

          const diversityGuidelines = `
\n[🎨 CREATIVE DIVERSITY SPECIFICATION (창의적 다양성 지침)]
- 당신은 이번 영상에 반드시 다음 스타일 DNA 컨셉을 핵심 주제로 반영해야 합니다: **Style DNA: ${styleDna}**
  (이 DNA 컨셉의 고유한 감성, 스토리 요소, 혹은 정보 전달 방식을 대본 기획에 우선 적용하십시오.)
- 당신은 이번 영상에 반드시 다음 스타일 화풍을 적용해야 합니다: **Visual Style: ${usedStyle}**
  (이 화풍을 Flux prompt 영어 키워드에 적절히 혼합하여 최고 품질로 묘사하십시오. 예: 'in ${usedStyle} style')
- 당신은 이번 영상의 첫 컷(1컷) 도입부 자막에 반드시 다음 후킹 유형을 적용해야 합니다: **Hook Type: ${hookType} (${selectedHook.description})**
  (이에 부합하는 아주 강력한 한글 3초 후킹 문구를 1컷 자막으로 쓰십시오)
- 당신은 이번 영상의 컷별 길이(duration)를 반드시 다음 패턴으로 기재해야 합니다: **Shot Pattern: ${shotPattern}**
  - 1컷 길이: ${selectedPattern.durations[0]}초
  - 2컷 길이: ${selectedPattern.durations[1]}초
  - 3컷 길이: ${selectedPattern.durations[2]}초
  - 4컷 길이: ${selectedPattern.durations[3]}초
`;
          combinedGuidelines += diversityGuidelines;

          console.log('[Autopilot] Injecting guidelines (Self-Improvement + Revenue DNA + Failure DNA + Agent Intelligence Memory + Diversity Specification) into writer agent prompt...');
          scriptData = await generateScriptWithGemini(apiKey, productTitle, combinedGuidelines);
        } catch (e) {
          console.warn('Gemini script generation failed, falling back to static script:', e.message);
          scriptData = generateFallbackScript(productTitle);
        }
      } else {
        scriptData = generateFallbackScript(productTitle);
      }

      console.log('[Autopilot] Script generated, now generating images...');
      updateStatus('image_generation', `3단계: 4컷 AI 이미지 생성 중 (0/4)...`, 45);

      // 3. Generate 4 images with individual multimodal Vision Critic retry loop
      let failedToGenerateImages = false;
      const visionFeedbackLogs = [];

      for (let i = 0; i < 4; i++) {
        const cut = scriptData.cuts[i];
        let passedVisionCheck = false;
        let imgAttempt = 0;
        const maxImgAttempts = 3;
        let bestImagePath = '';
        let bestScore = 0;
        let bestFeedback = '';

        while (imgAttempt < maxImgAttempts && !passedVisionCheck) {
          imgAttempt++;
          updateStatus(
            'image_generation',
            `3단계: 4컷 AI 이미지 생성 및 검수 중 (Cut ${i + 1}/4, 시도 ${imgAttempt}/${maxImgAttempts})...`,
            45 + i * 10 + imgAttempt * 2
          );

          const filename = `img_auto_${timestamp}_r${retryCount}_cut_${i + 1}_att_${imgAttempt}.jpg`;
          const absolutePath = path.join(outputImgDir, filename);
          const relativePath = absolutePath.replace(/\\/g, '/');

          try {
            const buffer = await downloadAiImage(cut.prompt);
            fs.writeFileSync(absolutePath, buffer);

            // Run Multimodal Vision Critic Check
            if (apiKey) {
              // Convert previous image's relative path to absolute path for file system read
              const prevRelativePath = i > 0 ? scriptData.cuts[i - 1].image_path : null;
              const prevImgPath = prevRelativePath ? path.join(process.cwd(), 'public', prevRelativePath.replace(/^\/shorts\//, 'shorts/')) : null;
              
              console.log(`[Autopilot] Running Multimodal Vision Critic for Cut ${i + 1}, Attempt ${imgAttempt}...`);
              const critique = await runVisionCriticMultimodal(apiKey, absolutePath, cut.prompt, prevImgPath, i + 1);
              console.log(`[Vision Critic] Cut ${i + 1} Score: ${critique.score}, Feedback: ${critique.feedback}`);

              if (critique.score > bestScore) {
                bestScore = critique.score;
                bestImagePath = relativePath;
                bestFeedback = critique.feedback;
              }

              if (critique.score >= 70) {
                passedVisionCheck = true;
                scriptData.cuts[i].image_path = relativePath;
                scriptData.cuts[i].vision_score = critique.score;
                scriptData.cuts[i].vision_feedback = critique.feedback;
                imagePaths.push(relativePath);
                visionFeedbackLogs.push({ cutIndex: i + 1, score: critique.score, feedback: critique.feedback, attempt: imgAttempt });
              } else {
                console.log(`[Vision Critic] Cut ${i + 1} failed check (score ${critique.score} < 70). Retrying image generation...`);
              }
            } else {
              // No API key, skip vision critic and accept
              passedVisionCheck = true;
              scriptData.cuts[i].image_path = relativePath;
              scriptData.cuts[i].vision_score = 75;
              scriptData.cuts[i].vision_feedback = 'Gemini API Key 미설정으로 자동 통과';
              imagePaths.push(relativePath);
              visionFeedbackLogs.push({ cutIndex: i + 1, score: 75, feedback: 'API key missing', attempt: imgAttempt });
            }

          } catch (e) {
            console.error(`Failed to generate/critique image for Cut ${i + 1}, Attempt ${imgAttempt}:`, e);
            if (imgAttempt === maxImgAttempts) {
              const searchKeyword = cut.searchKeyword || cut.keywords || productTitle || 'abstract';
              try {
                const fallbackBuf = await downloadFallbackImage(searchKeyword);
                fs.writeFileSync(absolutePath, fallbackBuf);
                scriptData.cuts[i].image_path = relativePath;
                scriptData.cuts[i].vision_score = 70;
                scriptData.cuts[i].vision_feedback = '스톡 이미지 대체로 기본 검수 통과';
                imagePaths.push(relativePath);
                visionFeedbackLogs.push({ cutIndex: i + 1, score: 70, feedback: 'Fallback image used', attempt: imgAttempt });
                passedVisionCheck = true;
              } catch (errFallback) {
                console.error('Fallback image failed as well:', errFallback);
                failedToGenerateImages = true;
              }
            }
          }
        }

        // If after max attempts we didn't pass but have a best attempt image, use it!
        if (!passedVisionCheck && bestImagePath) {
          console.log(`[Vision Critic] Cut ${i + 1} did not reach 70 points after ${maxImgAttempts} attempts. Using best attempt (score ${bestScore}).`);
          scriptData.cuts[i].image_path = bestImagePath;
          scriptData.cuts[i].vision_score = bestScore;
          scriptData.cuts[i].vision_feedback = bestFeedback + ' (기준점 미달이나 최대 시도 도달로 차선책 채택)';
          imagePaths.push(bestImagePath);
          visionFeedbackLogs.push({ cutIndex: i + 1, score: bestScore, feedback: bestFeedback, attempt: maxImgAttempts });
          passedVisionCheck = true;
        }

        if (!passedVisionCheck) {
          failedToGenerateImages = true;
          break;
        }
      }

      if (failedToGenerateImages) {
        console.warn('[Autopilot] Failed to generate/pass vision check for some images, retrying entire loop...');
        retryCount++;
        continue;
      }


      // Run Quality Board pre-upload analysis (acting as the Quality Board)
      if (apiKey) {
        try {
          console.log('[Autopilot] Running Quality Board Pre-Upload Performance Evaluation...');
          preUploadAnalysis = await runPreUploadAnalysis(apiKey, productTitle, scriptData);
          console.log('[Autopilot] Pre-Upload Analysis complete:', JSON.stringify(preUploadAnalysis.scores));
          
          // Inject actual Multimodal Vision Critic scores into Quality Board's sceneVisuals score
          const visionScores = scriptData.cuts.map(c => c.vision_score || 70);
          const visionAvg = visionScores.reduce((a, b) => a + b, 0) / visionScores.length;
          if (preUploadAnalysis && preUploadAnalysis.scores) {
            preUploadAnalysis.scores.sceneVisuals = Math.round(visionAvg);
          }

          const scores = preUploadAnalysis.scores;
          const scoreSum = scores.hookStrength + scores.scriptContent + scores.sceneVisuals + scores.subtitleAesthetics + scores.soundDesign;
          finalScoreAvg = scoreSum / 5.0;
          console.log(`[Autopilot] Quality Board Average Score (with actual Vision Critic): ${finalScoreAvg.toFixed(1)}`);

          // Creative Diversity Engine - Similarity check
          let recentRecords = [];
          if (fs.existsSync(HISTORY_PATH)) {
            try {
              recentRecords = JSON.parse(fs.readFileSync(HISTORY_PATH, 'utf-8')).slice(0, 20);
            } catch (e) {
              console.error('[Diversity] Failed to read history for similarity check:', e);
            }
          }
          
          const newMeta = {
            style_dna: styleDna,
            used_style: usedStyle,
            hook_type: hookType,
            shot_pattern: shotPattern,
            scriptData: scriptData
          };
          
          similarityScore = calculateSimilarity(newMeta, recentRecords);
          diversityScore = 100 - similarityScore;
          console.log(`[Diversity] Calculated Similarity Score: ${similarityScore}%, Diversity Score: ${diversityScore}%`);
          
          if (similarityScore >= 70) {
            console.log(`[Anti-Clone] Clone alert! Similarity >= 70%. Scrambling parameters and triggering script regeneration...`);
            similarityPenalty = 15;
            const modifications = antiCloneModify(scriptData, usedStyle, hookType, shotPattern, styleDna);
            
            // Set scrambled parameters to force regeneration in next retry loop
            customFont = modifications.font;
            customCaptionStyle = modifications.captionStyle;
            customCaptionPosition = modifications.captionPosition;
            usedStyle = modifications.style;
            hookType = modifications.hookType;
            shotPattern = modifications.shotPattern;
            styleDna = modifications.styleDna;
            
            forceScrambledParams = true;
            retryCount++;
            continue; // Force script regeneration loop
          } else {
            customFont = 'Pretendard-Bold';
            customCaptionStyle = 'minimal';
            customCaptionPosition = 'bottom';
          }

          if (finalScoreAvg > 70) {
            break; // Quality score passes, exit retry loop!
          }
        } catch (e) {
          console.error('[Autopilot] Quality Board pre-upload analysis failed:', e);
          finalScoreAvg = 75; // Fail-safe average
          break;
        }
      } else {
        finalScoreAvg = 75; // Fail-safe
        break;
      }

      retryCount++;
    }

    if (finalScoreAvg <= 70 && retryCount > maxRetries) {
      throw new Error(`품질 심사 결과 70점 이하(평균 ${finalScoreAvg.toFixed(1)}점)로 3회 재시도했으나 품질 기준을 통과하지 못했습니다. 작업을 중단합니다.`);
    }

    // Apply similarity penalty if triggered
    finalScoreAvg -= similarityPenalty;
    if (preUploadAnalysis && preUploadAnalysis.scores) {
      preUploadAnalysis.similarityPenaltyApplied = similarityPenalty > 0;
    }

    updateStatus('video_rendering', '4단계: AI 성우 나레이션 및 BGM 비디오 렌더링 중...', 75);

    // 4. Render Video using generate_cinema_shorts.py
    const videoFilename = `cinema_shorts_auto_${timestamp}.mp4`;
    const outputDir = path.join(process.cwd(), 'public', 'shorts');
    const absoluteOutputPath = path.join(outputDir, videoFilename);
    const relativeVideoUrl = `/shorts/${videoFilename}`;

    const configPath = path.join(outputDir, `cinema_config_auto_${timestamp}.json`);
    
    const inputData = {
      cuts: scriptData.cuts.map((c, idx) => ({
        cutIndex: idx + 1,
        subtitle: c.subtitle,
        description: c.description,
        prompt: c.prompt,
        cameraMovement: c.cameraMovement || 'zoom in',
        duration: c.duration || 5,
        keywords: c.keywords || 'AI',
        image_path: imagePaths[idx],
        video_path: '',
        isVideo: false
      })),
      bgm_style: '시네마틱 앰비언트',
      bgm_volume: 15,
      bgm_upload_path: '',
      output_path: absoluteOutputPath.replace(/\\/g, '/'),
      template_style: '감성 광고형',
      color_preset: 'warm',
      caption_style: customCaptionStyle,
      caption_position: customCaptionPosition,
      font_name: customFont,
      transition_effect: '페이드',
      voice: 'female'
    };

    fs.writeFileSync(configPath, JSON.stringify(inputData, null, 2), 'utf-8');

    const scriptPath = path.join(process.cwd(), 'scripts', 'generate_cinema_shorts.py');

    await new Promise((resolve, reject) => {
      exec(`python "${scriptPath}" "${configPath}"`, (error, stdout, stderr) => {
        try {
          if (fs.existsSync(configPath)) fs.unlinkSync(configPath);
        } catch (e) {}

        if (error) {
          exec(`python3 "${scriptPath}" "${configPath}"`, (py3Error, py3Stdout, py3Stderr) => {
            try {
              if (fs.existsSync(configPath)) fs.unlinkSync(configPath);
            } catch (e) {}
            if (py3Error) reject(new Error(py3Stderr || py3Error.message));
            else resolve();
          });
        } else {
          resolve();
        }
      });
    });

    console.log('[Autopilot] Video rendered successfully!');
    updateStatus('youtube_upload', '5단계: 유튜브 채널로 쇼츠 비디오 자동 전송 중...', 90);

    // 5. Upload Video to YouTube (under Private status) - 80 points check
    let youtubeVideoId = 'MOCK_VIDEO_ID';
    let isMockUpload = true;
    let uploadMsg = '시뮬레이션 완료: 데모 모드로 업로드 처리를 완료했습니다.';

    if (finalScoreAvg < 80) {
      uploadMsg = `품질 보드 심사 점수가 80점 미만(평균 ${finalScoreAvg.toFixed(1)}점)으로 유튜브 자동 업로드가 차단(보류)되었습니다.`;
      console.log(`[Autopilot] YouTube upload blocked: Average score ${finalScoreAvg.toFixed(1)} is under 80.`);
    } else if (fs.existsSync(ACCOUNT_PATH)) {
      try {
        const account = JSON.parse(fs.readFileSync(ACCOUNT_PATH, 'utf-8'));
        if (account.YOUTUBE_OAUTH_REFRESH_TOKEN) {
          youtubeVideoId = await uploadToYoutube(absoluteOutputPath, `${scriptData.title} #Shorts`, scriptData.cuts.map(c => c.subtitle).join('\n'));
          isMockUpload = false;
          uploadMsg = '유튜브 쇼츠 채널에 정상적으로 게시되었습니다! (비공개 상태)';
        }
      } catch (uploadErr) {
        console.error('YouTube upload failed, falling back to mock upload status:', uploadErr);
      }
    }

    // 6. Complete Autopilot
    const resultDetails = {
      id: timestamp.toString(),
      videoUrl: relativeVideoUrl,
      youtubeVideoId,
      isMockUpload,
      uploadMessage: uploadMsg,
      productTitle,
      affiliateLink,
      commentText: `오늘 영상에서 활약한 [${productTitle}] 최저가 좌표입니다 ➔ ${affiliateLink}`,
      created_at: new Date().toISOString(),
      scriptData: scriptData,
      topic: productTitle.replace(/[\(\[\{\/].*$/, '').trim(),
      preUploadAnalysis,
      postUploadAnalysis: null,
      views: 0,
      likeRate: 0,
      commentCount: 0,
      avgRetention: 0,
      successFactors: '',
      failureFactors: '',
      selfImprovementApplied: true,
      diversity_score: diversityScore,
      similarity_score: similarityScore,
      style_dna: styleDna,
      used_style: usedStyle,
      hook_type: hookType,
      shot_pattern: shotPattern,
      is_experiment: isExperiment,
      custom_font: customFont,
      custom_caption_style: customCaptionStyle,
      custom_caption_position: customCaptionPosition,
      used_success_dna: selectedSuccessVids.map(v => ({ id: v.id, title: v.title })),
      used_failure_dna: failureDnaList.slice(-10).map(v => ({ id: v.id, title: v.title })),
      used_revenue_dna: revenueDnaList.slice(-10).map(v => ({ id: v.id, title: v.title }))
    };

    saveToHistory(resultDetails);
    updateStatus('completed', '완전 자동화 완료!', 100, resultDetails);

    console.log('[Autopilot] Autopilot process completed successfully!');

  } catch (error) {
    console.error('[Autopilot] Process Failed:', error);
    updateStatus('error', `오류 발생으로 일시정지됨: ${error.message}`, 0, {
      error_message: error.message
    });
  }
}

// Retrieve revenue DNA from DB to inject into generation prompts
function getRevenueDnaGuidelines() {
  try {
    const dnaPath = path.join(process.cwd(), '..', '_company', '_shared', 'revenue_dna_db.json');
    if (fs.existsSync(dnaPath)) {
      const db = JSON.parse(fs.readFileSync(dnaPath, 'utf-8'));
      const list = db.revenue_dna_list || [];
      if (list.length > 0) {
        let dnaGuide = `\n[🔥 검증된 수익화 영상 DNA (반드시 아래 고수익 및 고ROI 패턴을 벤치마킹하여 구매 전환을 극대화하는 카피를 작성하십시오)]\n`;
        list.slice(-10).forEach((item, idx) => {
          dnaGuide += `${idx + 1}. 제목: "${item.title}" | 3초 후킹 카피: "${item.title}" | Money Score: ${item.money_score}점 | ROI: ${item.roi}%\n`;
        });
        return dnaGuide;
      }
    }
  } catch (e) {
    console.error('Failed to read revenue DNA DB:', e);
  }
  return '';
}

// Retrieve failure DNA from DB to inject as constraints in generation prompts
function getFailureDnaGuidelines() {
  try {
    const dnaPath = path.join(process.cwd(), '..', '_company', '_shared', 'failure_dna_db.json');
    if (fs.existsSync(dnaPath)) {
      const db = JSON.parse(fs.readFileSync(dnaPath, 'utf-8'));
      const list = db.failure_dna_list || [];
      if (list.length > 0) {
        let dnaGuide = `\n[⚠️ 피해야 할 검증된 실패 영상 DNA (아래 실패 패턴 및 원인을 철저히 피해서 대본을 기획하십시오)]\n`;
        list.slice(-10).forEach((item, idx) => {
          dnaGuide += `${idx + 1}. 제목: "${item.title}" | 실패 요인 및 이탈 원인: ${item.failureFactors}\n`;
        });
        return dnaGuide;
      }
    }
  } catch (e) {
    console.error('Failed to read failure DNA DB:', e);
  }
  return '';
}

// Retrieve top/bottom patterns for self-improvement rules
function getSelfImprovementGuidelines() {
  try {
    if (!fs.existsSync(HISTORY_PATH)) {
      return '과거 데이터가 없습니다. 기본 최적화 규칙을 활용하여 첫 영상을 작성하십시오.';
    }
    const history = JSON.parse(fs.readFileSync(HISTORY_PATH, 'utf-8'));
    if (!Array.isArray(history) || history.length < 2) {
      return '과거 영상 수가 적어 패턴을 추출하기 어렵습니다. 기본 최적화 규칙을 적용합니다.';
    }

    // Process view counts for sorting
    const scoredItems = history.map(item => {
      let views = 0;
      if (item.postUploadAnalysis && typeof item.postUploadAnalysis.views === 'number') {
        views = item.postUploadAnalysis.views;
      } else if (typeof item.views === 'number') {
        views = item.views;
      } else if (item.postUploadAnalysis && item.postUploadAnalysis.answers && typeof item.postUploadAnalysis.answers.views === 'number') {
        views = item.postUploadAnalysis.answers.views;
      }
      return { ...item, calculatedViews: views };
    });

    // Sort by views
    const sorted = [...scoredItems].sort((a, b) => b.calculatedViews - a.calculatedViews);
    const top10 = sorted.slice(0, 10);
    const bottom10 = [...scoredItems].sort((a, b) => a.calculatedViews - b.calculatedViews).slice(0, 10);

    let guide = `당신은 과거 성공 및 실패 패턴을 교훈 삼아 자기개선(Self-Improvement)하는 콘텐츠 전략가입니다. 아래는 과거에 제작된 영상들의 상세 성과 정보입니다. 상위 영상의 성공 패턴은 한층 강화하고, 하위 영상의 실패 패턴은 제거하십시오.\n\n`;
    
    guide += `[과거 상위 영상 패턴 (성공 요인 - 적극 강화할 것)]\n`;
    top10.forEach((item, idx) => {
      const title = item.scriptData?.title || '제목 없음';
      const hook = item.scriptData?.cuts?.[0]?.subtitle || '후크 문구 없음';
      const success = item.postUploadAnalysis?.successFactors || item.successFactors || '시각적 매력도가 높고 도입부 호기심 자극이 강력함';
      guide += `${idx + 1}. 제목: "${title}" | 도입부 후킹: "${hook}" | 성공 요인: ${success}\n`;
    });

    guide += `\n[과거 하위 영상 패턴 (실패 요인 - 철저히 회피/제거할 것)]\n`;
    bottom10.forEach((item, idx) => {
      const title = item.scriptData?.title || '제목 없음';
      const hook = item.scriptData?.cuts?.[0]?.subtitle || '후크 문구 없음';
      const failure = item.postUploadAnalysis?.failureFactors || item.failureFactors || '설명조 위주로 구성되어 호기심 유발 부족, 후킹 강도 약함';
      guide += `${idx + 1}. 제목: "${title}" | 도입부 후킹: "${hook}" | 실패 원인: ${failure}\n`;
    });

    guide += `\n[지침]:
1. 상위 영상들의 성공 공식을 벤치마킹하여 제목과 도입부 후크 문장을 기획하세요.
2. 하위 영상들의 실패 원인(설명 위주의 지루함, 시각적 단조로움, 자막 시선 유도 실패 등)이 절대로 발생하지 않도록 개선하여 설계하세요.`;

    return guide;
  } catch (e) {
    console.error('Failed to generate self-improvement guidelines:', e);
    return '과거 데이터 파싱 에러. 기본 최적화 규칙을 적용하십시오.';
  }
}

// Perform Pre-Upload AI Auditing acting as the Shorts Research Director
async function runPreUploadAnalysis(apiKey, productTitle, scriptData) {
  const researcherPrompt = `당신은 쇼츠 연구소 책임자(Researcher)입니다.
당신의 목표는 영상을 만드는 것이 아니라, 제작된 영상의 구성 요소들을 철저히 데이터와 패턴 관점에서 냉철하게 평가하는 것입니다.
칭찬하지 마십시오. 문제점을 찾으십시오.
주관적 의견보다 데이터와 패턴을 우선합니다.

새로 제작된 영상의 상세 정보가 아래에 제공됩니다. 이 영상을 5가지 영역으로 평가하여 0~100점의 점수를 부여하고, 쇼츠 책임자로서의 6가지 핵심 질문에 성실히 답변하십시오.

[평가 대상 영상 정보]
- 상품명: ${productTitle}
- 영상 제목: ${scriptData.title}
- 컷별 구성:
${scriptData.cuts.map((c, idx) => `컷 ${idx + 1}:
  - 자막/나레이션: ${c.subtitle}
  - 화면 연출: ${c.description}
  - 이미지 프롬프트: ${c.prompt}
  - 연출 키워드: ${c.keywords}
`).join('\n')}

평가 기준:
1. 후킹 강도: 첫 1초, 3초, 5초 시점에 시청자가 멈출 이유가 있는지, 궁금증이 발생하는지, 감정 자극이 있는지 평가
2. 대본 분석: 내용의 이해도, 몰입도, 감정 변화, 반전 요소, 정보의 가치가 충분한지 평가
3. 장면 분석: 대본과 장면 연출의 일치도, 시각적 품질 묘사, 장면 다양성, 시선 집중도가 높은지 평가
4. 자막 분석: 모바일 최적화 가독성, 강조 표현의 적절성, 시선 유도 효과 평가
5. 사운드 분석: BGM 스타일 및 톤의 적합성, 나레이션과 자막 매칭의 자연스러움 평가

출력은 반드시 다른 부연 설명이나 마크다운 태그 없이 아래 JSON 규격이어야 합니다:
{
  "scores": {
    "hookStrength": 80,
    "scriptContent": 85,
    "sceneVisuals": 75,
    "subtitleAesthetics": 70,
    "soundDesign": 80
  },
  "evaluations": {
    "hookStrength": "후킹 평가 내용 (1~2문장)",
    "scriptContent": "대본 평가 내용 (1~2문장)",
    "sceneVisuals": "장면 평가 내용 (1~2문장)",
    "subtitleAesthetics": "자막 평가 내용 (1~2문장)",
    "soundDesign": "사운드 평가 내용 (1~2문장)"
  },
  "answers": {
    "q1_hook_stop": "왜 이 영상은 시청자가 멈출 것 같은가? (구체적인 이유 분석)",
    "q2_dropoff": "왜 이 영상에서 이탈이 발생할 것인가? (취약한 컷 및 요소 지적)",
    "q3_diff_from_viral": "인기 쇼츠와 비교했을 때 가장 큰 차이 3가지 (줄글 또는 리스트 형태로 서술)",
    "q4_must_fix": "다음 영상에서 반드시 수정해야 하는 요소 (1순위 지적)",
    "q5_expected_views": 1200,
    "q6_multiplier_10x": "조회수를 10배 올리려면 무엇을 바꿔야 하는가?"
  }
}`;

  try {
    const response = await fetch(
      `https://generativelanguage.googleapis.com/v1beta/models/gemini-flash-latest:generateContent?key=${apiKey}`,
      {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          contents: [{ parts: [{ text: researcherPrompt }] }],
          generationConfig: { 
            temperature: 0.25,
            maxOutputTokens: 2048,
            responseMimeType: "application/json"
          }
        })
      }
    );

    if (!response.ok) {
      throw new Error(`Gemini API pre-upload analysis failed: ${response.statusText}`);
    }

    const resJson = await response.json();
    const text = resJson.candidates?.[0]?.content?.parts?.[0]?.text;
    if (!text) throw new Error('Empty response for pre-upload analysis');
    
    const cleaned = text.replace(/```json/g, '').replace(/```/g, '').trim();
    return JSON.parse(cleaned);
  } catch (e) {
    console.error('Failed to run pre-upload analysis:', e);
    return {
      scores: { hookStrength: 50, scriptContent: 50, sceneVisuals: 50, subtitleAesthetics: 50, soundDesign: 50 },
      evaluations: { hookStrength: '분석 오류로 기본 평가 대체', scriptContent: '분석 오류로 기본 평가 대체', sceneVisuals: '분석 오류로 기본 평가 대체', subtitleAesthetics: '분석 오류로 기본 평가 대체', soundDesign: '분석 오류로 기본 평가 대체' },
      answers: {
        q1_hook_stop: '데이터 수집 중',
        q2_dropoff: '데이터 수집 중',
        q3_diff_from_viral: '데이터 수집 중',
        q4_must_fix: '데이터 수집 중',
        q5_expected_views: 500,
        q6_multiplier_10x: '데이터 수집 중'
      }
    };
  }
}

// Multimodal Vision Critic Agent
async function runVisionCriticMultimodal(apiKey, imagePath, promptText, prevImagePath = null, cutIndex = 1) {
  if (!fs.existsSync(imagePath)) {
    return { score: 50, feedback: '이미지 파일이 존재하지 않아 검수가 불가능합니다.' };
  }

  const base64Data = fs.readFileSync(imagePath).toString("base64");
  const currentPart = {
    inlineData: {
      data: base64Data,
      mimeType: "image/jpeg"
    }
  };

  const parts = [];
  
  let instructions = `당신은 맹칠컴퍼니의 비주얼 검수 에이전트인 Vision Critic(눈길)입니다.
새로 생성된 AI 이미지와 이미지 생성 프롬프트를 비교하여 품질을 엄격히 채점하고 피드백을 제공해야 합니다.
칭찬하지 마십시오. 문제점과 뭉개진 부분, 왜곡된 부분을 찾아내십시오.

[검사 항목]
1. 프롬프트 일치도 (Prompt Alignment): 이미지 생성 프롬프트에 명시된 핵심 피사체, 각도, 색상이 이미지에 정확히 묘사되었는지 여부
2. 객체 정확도 (Object Accuracy): 인물의 손가락 개수 왜곡, 부자연스러운 신체 구조, 글자 렌더링 오류, 찌그러진 사물 등이 있는지 여부
3. 분위기 일치도 (Mood Alignment): 프롬프트에서 요구한 조명, 연출, 분위기와 일치하는지 여부
4. 스타일 일치도 (Style/Aesthetic Quality): 상용 광고 수준(Commercial-grade)의 우수한 품질과 미학적 완성도를 갖췄는지 여부
`;

  if (prevImagePath && fs.existsSync(prevImagePath)) {
    const prevBase64 = fs.readFileSync(prevImagePath).toString("base64");
    parts.push({
      inlineData: {
        data: prevBase64,
        mimeType: "image/jpeg"
      }
    });
    instructions += `\n5. 영상 연속성 (Continuity/Consistency): 제공된 두 개의 이미지 중 첫 번째 이미지는 이전 컷(이전 장면)이고, 두 번째 이미지는 현재 장면입니다. 두 이미지 사이의 주인공 외모, 옷 스타일, 전반적인 화풍(Illustration, Photo 등)이 일관되게 연결되는지 여부`;
  }

  instructions += `\n\n[제공 정보]
- 현재 컷 번호: ${cutIndex}
- 이미지 생성 프롬프트: "${promptText}"

출력은 다른 부연설명이나 마크다운 태그 없이 반드시 아래 규격의 JSON이어야 합니다:
{
  "score": 85,
  "feedback": "전반적으로 우수하나 인물의 오른쪽 손가락 끝부분이 약간 뭉개져 보입니다. 조명과 프롬프트 일치도는 매우 훌륭합니다."
}`;

  parts.unshift({ text: instructions });
  parts.push(currentPart);

  try {
    const response = await fetch(
      `https://generativelanguage.googleapis.com/v1beta/models/gemini-1.5-flash:generateContent?key=${apiKey}`,
      {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          contents: [{ parts }],
          generationConfig: { 
            temperature: 0.15,
            maxOutputTokens: 1024,
            responseMimeType: "application/json"
          }
        })
      }
    );

    if (!response.ok) {
      throw new Error(`Gemini Multimodal API call failed: ${response.statusText}`);
    }

    const resJson = await response.json();
    const text = resJson.candidates?.[0]?.content?.parts?.[0]?.text;
    if (!text) throw new Error('Empty multimodal response from Gemini');
    
    const cleaned = text.replace(/```json/g, '').replace(/```/g, '').trim();
    return JSON.parse(cleaned);
  } catch (e) {
    console.error(`[Vision Critic] Multimodal evaluation failed for Cut ${cutIndex}:`, e);
    return {
      score: 75,
      feedback: `검사 에러로 대체됨: ${e.message}`
    };
  }
}


// Generate script using Gemini with Self-Improvement Guidelines
async function generateScriptWithGemini(apiKey, productTitle, selfImprovementGuidelines = '') {
  const systemPrompt = `당신은 맹칠컴퍼니의 콘텐츠 기획자 에이전트(Writer)입니다.
수익화 상품인 "${productTitle}"을 유튜브 쇼츠(9:16) 영상을 통해 매력적으로 홍보할 수 있는 4컷 구성 대본을 기획해야 합니다.
출력은 반드시 다른 텍스트 없이 아래 JSON 규격이어야 합니다:
{
  "title": "쇼츠 영상 제목 (한글 20자 이내)",
  "cuts": [
    {
      "subtitle": "해당 컷에 적용할 짧고 강렬한 자막/나레이션 문장. 반드시 15자 내외의 한국어 단문으로 작성하고 끝부분에 맥락에 적합한 시각적 이모지(예: 💰, 🔥, 🚨, 👀 등)를 딱 1개 붙여 모바일 숏폼 자막 가독성과 전달력을 극대화할 것 (예: '방구석에서 돈 버는 비밀 👀')",
      "description": "화면 연출 및 비주얼 설명",
      "prompt": "Flux AI 이미지 생성을 위한 최고 품질의 사진사 수준 영어 프롬프트. 규격: 'Professional [style] photography, [detailed subject description], [composition & framing], [camera lens & settings], [lighting conditions], [color palette & mood], vertical 9:16 framing, highly aesthetic, commercial-grade, 8k, no text, no captions, no watermarks, clean composition, no distorted anatomy, no weird fingers' (인물이나 클로즈업 샷 위주로 자막과 직결되는 핵심 비주얼을 정밀 묘사하고 절대 글자가 렌더링되지 않게 할 것)",
      "searchKeyword": "Pexels 등 스톡 사이트에서 고품질 사진을 찾기 위한 명확하고 정교한 영어 검색어 (2~3단어의 단조로운 명사/형용사 조합, 예: 'laptop desk', 'smiling man', 'healthy food', 'woman writing'). 절대 텍스트나 복잡한 문장을 쓰지 말고 스톡에서 매칭 확률이 높은 핵심 단어만 사용하십시오.",
      "cameraMovement": "zoom in 또는 zoom out 또는 panning",
      "duration": 5,
      "keywords": "강조 키워드"
    }
  ]
}
주의사항: cuts 배열의 크기는 반드시 정확히 4개여야 합니다.

${selfImprovementGuidelines ? `\n[자기 개선 규칙 적용]\n${selfImprovementGuidelines}` : ''}`;

  const response = await fetch(
    `https://generativelanguage.googleapis.com/v1beta/models/gemini-flash-latest:generateContent?key=${apiKey}`,
    {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        contents: [{ parts: [{ text: `${systemPrompt}\n\n상품명: ${productTitle}` }] }],
        generationConfig: { 
          temperature: 0.85, 
          maxOutputTokens: 2048,
          responseMimeType: "application/json"
        }
      })
    }
  );

  if (!response.ok) {
    throw new Error(`Gemini API failed: ${response.statusText}`);
  }

  const resJson = await response.json();
  const text = resJson.candidates?.[0]?.content?.parts?.[0]?.text;
  if (!text) throw new Error('Empty text from Gemini');
  
  const cleaned = text.replace(/```json/g, '').replace(/```/g, '').trim();
  const scriptData = JSON.parse(cleaned);
  if (!scriptData || !Array.isArray(scriptData.cuts) || scriptData.cuts.length !== 4) {
    throw new Error('Gemini response did not contain exactly 4 cuts in the cuts array');
  }
  return scriptData;
}

// Fallback script if Gemini is missing/fails
function generateFallbackScript(productTitle) {
  if (productTitle.includes('마스터북') || productTitle.includes('전자책') || productTitle.includes('책')) {
    return {
      title: '노트북 하나로 월 100만원 버는 법',
      cuts: [
        {
          subtitle: '퇴근 후 딱 30분, 방구석에서 돈 버는 비밀이 있습니다.',
          description: '어두운 방 안, 모던한 스탠드 조명 아래 아늑한 데스크 위 노트북 화면이 켜져 있는 구도',
          prompt: 'Professional commercial photography, cozy dark room with a warm desk lamp lighting a modern laptop, screen glowing, highly aesthetic, minimalist composition, 8k',
          searchKeyword: 'cozy laptop desk setup warm light',
          cameraMovement: 'zoom in',
          duration: 5,
          keywords: '방구석 부업'
        },
        {
          subtitle: '특별한 기술 없이도 AI 마스터북 하나면 바로 수익 자동화가 가능합니다.',
          description: '태블릿이나 노트북 화면에 세련된 디자인의 이북(e-book) 표지가 보이는 클로즈업 뷰',
          prompt: 'Professional product photography, modern tablet showing an elegant e-book cover design on a clean wooden table, shallow depth of field, soft studio lighting, f/1.8, 8k',
          searchKeyword: 'tablet reading ebook aesthetic',
          cameraMovement: 'fixed',
          duration: 5,
          keywords: 'AI 마스터북'
        },
        {
          subtitle: '대기업 직장인들이 남몰래 하는 AI 부업 치트키, 지금 공개합니다.',
          description: '카페 창가에서 여유롭게 커피를 마시며 미소 짓는 직장인의 클로즈업 뷰',
          prompt: 'Professional lifestyle portrait, young professional smiling holding a coffee cup next to a laptop in a bright cafe, soft natural light, depth of field, 8k',
          searchKeyword: 'young professional smiling portrait cafe',
          cameraMovement: 'slow motion',
          duration: 5,
          keywords: '부업 치트키'
        },
        {
          subtitle: '월 100만원 파이프라인 만드는 전자책 정보, 고정 댓글 링크를 확인하세요!',
          description: '햇살이 드는 아늑한 거실 테이블에 커피와 태블릿이 놓여 있는 모던하고 행복한 분위기',
          prompt: 'Professional interior photography, bright modern living room table with coffee and tablet showing clean UI, warm morning sunlight, vertical framing, 8k',
          searchKeyword: 'bright cozy table setup aesthetic',
          cameraMovement: 'zoom out',
          duration: 5,
          keywords: '고정댓글 링크'
        }
      ]
    };
  }

  if (productTitle.includes('홍삼') || productTitle.includes('정관장')) {
    return {
      title: '피로회복 끝판왕 홍삼정 추천',
      cuts: [
        {
          subtitle: '매일 아침 피곤하고 지치는 직장인들 필독하세요!',
          description: '피곤해 지쳐 모니터 앞에서 하품하는 남성의 모습, 모던 데스크 조명',
          prompt: 'Cinematic vertical photo, photorealistic, 8k, tired young businessman yawning in office front of computer, dramatic side lighting, warm colors',
          searchKeyword: 'tired office worker desk',
          cameraMovement: 'zoom in',
          duration: 5,
          keywords: '피로회복'
        },
        {
          subtitle: '가장 간편하게 활력을 충전하는 법, 바로 홍삼정 에브리타임입니다.',
          description: '홍삼 스틱 패키지가 데스크 위에 놓여 있는 깔끔한 연출',
          prompt: 'Cinematic close-up, photorealistic, premium red ginseng extract stick on table, soft clean background, vertical framing',
          searchKeyword: 'red ginseng product shot',
          cameraMovement: 'fixed',
          duration: 5,
          keywords: '활력충전'
        },
        {
          subtitle: '6년근 홍삼 농축액이 면역력 증진과 피로 개선에 탁월한 효과를 줍니다.',
          description: '홍삼 한 스푼이 부드럽게 꿀물처럼 흘러내리는 건강미 넘치는 클로즈업',
          prompt: 'Macro shot of rich brown viscous healthy ginseng extract dripping down slowly, golden light, organic luxury concept, 8k',
          searchKeyword: 'herbal extract drip macro',
          cameraMovement: 'slow motion',
          duration: 5,
          keywords: '면역력'
        },
        {
          subtitle: '지금 지친 나를 위한 에너지 충전, 고정댓글 링크를 확인하세요!',
          description: '아침 햇살 아래 활기찬 표정으로 커피숍에서 활짝 웃는 건강한 직장인',
          prompt: 'Cinematic portrait, happy healthy korean worker smiling, glowing energetic skin, bright morning sun, 8k resolution, vertical format',
          searchKeyword: 'happy energetic person portrait',
          cameraMovement: 'zoom out',
          duration: 5,
          keywords: '에너지충전'
        }
      ]
    };
  }

  // Macbook M3 (Default)
  return {
    title: 'M3 맥북으로 AI 수익화 시작하는 법',
    cuts: [
      {
        subtitle: '하루 10분, 노트북 하나로 돈 버는 AI 자동화 비법, 알고 계신가요?',
        description: '모던하고 심플한 작업실 데스크 위, 화면에 코드와 그래프가 띄워진 고급 맥북 에어 노트북이 열려 있고 은은한 조명이 비추는 뷰',
        prompt: 'Cinematic vertical photo, photorealistic, 8k, modern minimalist workspace, premium sleek space gray laptop open on desk, screen showing code, warm dramatic lighting',
        searchKeyword: 'sleek space gray laptop desk',
        cameraMovement: 'zoom in',
        duration: 5,
        keywords: 'AI 자동화'
      },
      {
        subtitle: '고성능 컴퓨터가 없어도 맥북 에어 M3 하나면 완벽하게 가동됩니다.',
        description: '맥북 알루미늄 키보드 위에서 타이핑하는 손과 모니터에서 차트가 역동적으로 계산되는 클로즈업 뷰',
        prompt: 'Cinematic close-up, photorealistic, typing on aluminum laptop keyboard, neon glow reflecting on fingers, screen showing fast processing charts',
        searchKeyword: 'typing on laptop keyboard close up',
        cameraMovement: 'fixed',
        duration: 5,
        keywords: '맥북 에어 M3'
      },
      {
        subtitle: 'M3 칩의 강력한 뉴럴 엔진이 나만의 AI 에이전트를 초고속으로 기동시킵니다.',
        description: '파란색과 보라색 전류가 흐르며 빛나는 입체적인 미래형 뉴럴 AI 마이크로칩 회로도',
        prompt: 'Abstract high-tech microchip glowing with blue and violet energy lines, circuit board, futuristic, 8k resolution, cinematic lighting',
        searchKeyword: 'glowing technology microchip abstract',
        cameraMovement: 'zoom in',
        duration: 5,
        keywords: '뉴럴 엔진'
      },
      {
        subtitle: '지금 가장 합리적인 M3 맥북으로 AI 부업을 개시해 보세요. 댓글 링크 확인!',
        description: '따뜻한 햇살이 들어오는 카페 창가에서 노트북 화면을 보며 미소 짓고 있는 젊은 1인 창업가의 행복한 포트레이트',
        prompt: 'Cinematic portrait, young entrepreneur smiling, looking at laptop screen in cozy warm cafe, soft sunset light filtering through window, photorealistic, 8k',
        searchKeyword: 'young smiling entrepreneur portrait',
        cameraMovement: 'zoom out',
        duration: 5,
        keywords: '부업 시작'
      }
    ]
  };
}

// Download image helper from Pollinations.ai
async function downloadAiImage(prompt) {
  const enhancedPrompt = `${prompt}, high quality, cinematic lighting, 8k, photorealistic, vertical shot, 9:16 aspect ratio`;
  const url = `https://image.pollinations.ai/prompt/${encodeURIComponent(enhancedPrompt)}?nologo=true`;
  
  const pollinationKey = process.env.POLLINATIONS_API_KEY || '';
  let headers = {};
  if (pollinationKey) {
    headers['Authorization'] = `Bearer ${pollinationKey}`;
  }

  let response = await fetch(url, { headers });
  if (!response.ok && pollinationKey) {
    console.warn(`Pollinations failed with key (status ${response.status}), retrying without key...`);
    headers = {};
    response = await fetch(url, { headers });
  }

  if (!response.ok) {
    throw new Error(`Pollinations API returned status: ${response.status}`);
  }
  return Buffer.from(await response.arrayBuffer());
}

async function getPexelsImage(keyword) {
  const pexelsKey = process.env.PEXELS_API_KEY;
  if (!pexelsKey) return null;
  try {
    const cleanKw = keyword.replace(/[^a-zA-Z0-9\s]/g, '').trim();
    const url = `https://api.pexels.com/v1/search?query=${encodeURIComponent(cleanKw)}&orientation=portrait&per_page=5`;
    console.log(`[Pexels] Searching for: ${cleanKw}`);
    const res = await fetch(url, { headers: { 'Authorization': pexelsKey } });
    if (res.ok) {
      const data = await res.json();
      if (Array.isArray(data.photos) && data.photos.length > 0) {
        const randomIndex = Math.floor(Math.random() * Math.min(data.photos.length, 3));
        const photoUrl = data.photos[randomIndex].src.large2x || data.photos[randomIndex].src.portrait;
        console.log(`[Pexels] Found image: ${photoUrl}`);
        const imgRes = await fetch(photoUrl);
        if (imgRes.ok) return Buffer.from(await imgRes.arrayBuffer());
      }
    }
  } catch (e) {
    console.error('[Pexels] Error fetching image:', e);
  }
  return null;
}

const CURATED_IMAGES = {
  ebook: [
    'https://images.unsplash.com/photo-1544716278-ca5e3f4abd8c?w=1080&h=1920&fit=crop',
    'https://images.unsplash.com/photo-1516321318423-f06f85e504b3?w=1080&h=1920&fit=crop',
    'https://images.unsplash.com/photo-1522202176988-66273c2fd55f?w=1080&h=1920&fit=crop',
    'https://images.unsplash.com/photo-1498050108023-c5249f4df085?w=1080&h=1920&fit=crop',
    'https://images.unsplash.com/photo-1531403009284-440f080d1e12?w=1080&h=1920&fit=crop'
  ],
  health: [
    'https://images.unsplash.com/photo-1506126613408-eca07ce68773?w=1080&h=1920&fit=crop',
    'https://images.unsplash.com/photo-1512621776951-a57141f2eefd?w=1080&h=1920&fit=crop',
    'https://images.unsplash.com/photo-1540420773420-3366772f4999?w=1080&h=1920&fit=crop',
    'https://images.unsplash.com/photo-1517838277536-f5f99be501cd?w=1080&h=1920&fit=crop',
    'https://images.unsplash.com/photo-1571019613454-1cb2f99b2d8b?w=1080&h=1920&fit=crop'
  ]
};

async function getCuratedImage(keyword) {
  const kw = keyword.toLowerCase();
  let list = [];
  if (kw.includes('book') || kw.includes('laptop') || kw.includes('desk') || kw.includes('work') || kw.includes('e-book') || kw.includes('부업') || kw.includes('전자책') || kw.includes('노트북')) {
    list = CURATED_IMAGES.ebook;
  } else if (kw.includes('ginseng') || kw.includes('health') || kw.includes('diet') || kw.includes('fit') || kw.includes('energy') || kw.includes('홍삼') || kw.includes('건강') || kw.includes('피로')) {
    list = CURATED_IMAGES.health;
  }
  if (list.length > 0) {
    const url = list[Math.floor(Math.random() * list.length)];
    console.log(`[Curated Pool] Matching keyword "${keyword}" to curated URL: ${url}`);
    try {
      const res = await fetch(url);
      if (res.ok) return Buffer.from(await res.arrayBuffer());
    } catch (e) {
      console.error('[Curated Pool] Failed to download curated image:', e);
    }
  }
  return null;
}

async function getLoremFlickrImage(keyword) {
  try {
    const words = keyword.replace(/[^a-zA-Z0-9\s]/g, '').trim().split(/\s+/);
    const filtered = words.filter(w => w.length > 2 && !['and', 'with', 'the', 'for', 'you', 'your'].includes(w.toLowerCase()));
    const cleanKw = (filtered.length > 0 ? filtered : words).slice(0, 2).join(',');
    const url = `https://loremflickr.com/1080/1920/${encodeURIComponent(cleanKw)}`;
    console.log(`[LoremFlickr] Fetching keyword-relevant image for: ${cleanKw}`);
    const res = await fetch(url);
    if (res.ok) return Buffer.from(await res.arrayBuffer());
  } catch (e) {
    console.error('Failed to fetch image from LoremFlickr:', e);
  }
  return null;
}

async function downloadFallbackImage(keyword) {
  const curatedBuf = await getCuratedImage(keyword);
  if (curatedBuf) return curatedBuf;

  const pexelsBuf = await getPexelsImage(keyword);
  if (pexelsBuf) return pexelsBuf;

  if (keyword) {
    const buf = await getLoremFlickrImage(keyword);
    if (buf) return buf;
  }
  const fallbackUrl = `https://images.unsplash.com/photo-1618005182384-a83a8bd57fbe?w=1080&h=1920&fit=crop`;
  const res = await fetch(fallbackUrl);
  return Buffer.from(await res.arrayBuffer());
}

function saveToHistory(record) {
  try {
    fs.mkdirSync(path.dirname(HISTORY_PATH), { recursive: true });
    let history = [];
    if (fs.existsSync(HISTORY_PATH)) {
      try {
        history = JSON.parse(fs.readFileSync(HISTORY_PATH, 'utf-8'));
      } catch (e) {
        console.error('Failed to parse history.json, resetting:', e);
      }
    }
    history.unshift(record);
    fs.writeFileSync(HISTORY_PATH, JSON.stringify(history, null, 2), 'utf-8');
    console.log('[History] Saved video to history log.');
  } catch (e) {
    console.error('[History] Failed to save history:', e);
  }
}

// YouTube API Uploader
async function uploadToYoutube(videoFilePath, title, description) {
  const account = JSON.parse(fs.readFileSync(ACCOUNT_PATH, 'utf-8'));
  const clientId = account.YOUTUBE_OAUTH_CLIENT_ID;
  const clientSecret = account.YOUTUBE_OAUTH_CLIENT_SECRET;
  const refreshToken = account.YOUTUBE_OAUTH_REFRESH_TOKEN;

  // 1. Refresh OAuth access token
  const tokenResponse = await fetch('https://oauth2.googleapis.com/token', {
    method: 'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    body: new URLSearchParams({
      client_id: clientId,
      client_secret: clientSecret,
      refresh_token: refreshToken,
      grant_type: 'refresh_token'
    })
  });

  if (!tokenResponse.ok) {
    throw new Error('OAuth token refresh failed during autopilot');
  }

  const tokenData = await tokenResponse.json();
  const accessToken = tokenData.access_token;

  // Save token back
  account.YOUTUBE_OAUTH_ACCESS_TOKEN = accessToken;
  fs.writeFileSync(ACCOUNT_PATH, JSON.stringify(account, null, 2), 'utf-8');

  // 2. Read video file
  const videoBuffer = fs.readFileSync(videoFilePath);

  // 3. Prepare metadata
  const metadata = {
    snippet: {
      title,
      description,
      categoryId: '22'
    },
    status: {
      privacyStatus: 'private'
    }
  };

  const boundary = 'antigravity_autopilot_boundary';
  
  const headerBuffer = Buffer.from(
    `\r\n--${boundary}\r\n` +
    `Content-Type: application/json; charset=UTF-8\r\n\r\n` +
    `${JSON.stringify(metadata)}\r\n` +
    `--${boundary}\r\n` +
    `Content-Type: video/mp4\r\n\r\n`
  );
  
  const footerBuffer = Buffer.from(`\r\n--${boundary}--\r\n`);
  const payload = Buffer.concat([headerBuffer, videoBuffer, footerBuffer]);

  const uploadUrl = 'https://www.googleapis.com/upload/youtube/v3/videos?uploadType=multipart&part=snippet,status';
  
  const uploadRes = await fetch(uploadUrl, {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${accessToken}`,
      'Content-Type': `multipart/related; boundary=${boundary}`,
      'Content-Length': payload.length.toString()
    },
    body: payload
  });

  if (!uploadRes.ok) {
    const errorText = await uploadRes.text();
    throw new Error(`YouTube Upload failed: ${errorText}`);
  }

  const data = await uploadRes.json();
  return data.id;
}

// Retrieve dynamic agent intelligence memory to inject into autopilot prompt
function getAgentIntelligenceGuidelines() {
  try {
    const intelPath = path.join(process.cwd(), '..', '_company', '_shared', 'agent_intelligence_db.json');
    if (fs.existsSync(intelPath)) {
      const db = JSON.parse(fs.readFileSync(intelPath, 'utf-8'));
      
      let intelGuide = `\n[🧠 AI COMPANY INTEL & REAL LEARNING MEMORY (과거 학습 내용 및 지침)]\n`;
      
      // Add CEO Decisions
      if (Array.isArray(db.agent_decisions) && db.agent_decisions.length > 0) {
        intelGuide += `\n* CEO 의사결정 로그:\n`;
        db.agent_decisions.slice(-5).forEach(d => {
          intelGuide += `  - [${d.date}] ${d.decision}\n`;
        });
      }
      
      // Add lessons learned
      if (Array.isArray(db.agent_lessons) && db.agent_lessons.length > 0) {
        intelGuide += `\n* 최근 습득한 교훈 및 성공/실패 패턴:\n`;
        db.agent_lessons.slice(-5).forEach(l => {
          intelGuide += `  - [${l.agent}] [${l.type}] ${l.lesson}\n`;
        });
      }
      
      return intelGuide;
    }
  } catch (e) {
    console.error('Failed to read agent intelligence guidelines:', e);
  }
  return '';
}

// Retrieve success DNA from DB to inject into generation prompts
function getSuccessDnaGuidelines(selectedSuccessVids) {
  if (!selectedSuccessVids || selectedSuccessVids.length === 0) return '';
  let dnaGuide = `\n[🔥 검증된 성공 DNA 패턴 (가장 강하고 적극적으로 모방/강화할 요소 - 가중치 50%)]\n`;
  selectedSuccessVids.forEach((item, idx) => {
    dnaGuide += `${idx + 1}. 제목: "${item.title}" | 3초 후킹: "${item.hook || item.title}" | 성공 요인: ${item.successFactors} | 조회수: ${item.views}회\n`;
  });
  return dnaGuide;
}
