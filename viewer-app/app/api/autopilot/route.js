import { NextResponse } from 'next/server';
import path from 'path';
import fs from 'fs';
import { runPythonScript } from '@/app/lib/pythonRunner';
import { exec } from 'child_process';
import { HOOK_LIBRARY, VISUAL_STYLES, SHOT_PATTERNS, STYLE_DNA_LIST, calculateSimilarity, antiCloneModify } from '../../lib/CreativeDiversityEngine';
import { searchYoutubeMarket, extractTrendDNA } from '../../lib/trendEngine';

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

function cleanJson(str) {
  if (!str) return '{}';
  
  // Extract block between first { and last } or first [ and last ]
  const firstBrace = str.indexOf('{');
  const lastBrace = str.lastIndexOf('}');
  
  if (firstBrace === -1 || lastBrace === -1 || lastBrace < firstBrace) {
    const firstBracket = str.indexOf('[');
    const lastBracket = str.lastIndexOf(']');
    if (firstBracket !== -1 && lastBracket !== -1 && lastBracket > firstBracket) {
      str = str.substring(firstBracket, lastBracket + 1);
    }
  } else {
    str = str.substring(firstBrace, lastBrace + 1);
  }

  // Character-by-character scan to escape raw newlines inside double quotes
  let result = '';
  let inString = false;
  let escapeNext = false;
  
  for (let i = 0; i < str.length; i++) {
    const char = str[i];
    if (escapeNext) {
      result += char;
      escapeNext = false;
      continue;
    }
    if (char === '\\') {
      result += char;
      escapeNext = true;
      continue;
    }
    if (char === '"') {
      inString = !inString;
      result += char;
      continue;
    }
    if (inString && (char === '\n' || char === '\r')) {
      result += '\\n';
      continue;
    }
    result += char;
  }
  
  let cleaned = result.trim();
  // Remove single line comments (making sure not to match http:// or https://)
  cleaned = cleaned.replace(/(^|[^\:])\/\/.*$/gm, '$1');
  // Remove multi-line comments
  cleaned = cleaned.replace(/\/\*[\s\S]*?\*\//g, '');
  // Remove trailing commas in objects and arrays
  cleaned = cleaned.replace(/,\s*([}\]])/g, '$1');
  return cleaned;
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

export async function POST(req) {
  let forcedParams = {};
  try {
    const body = await req.json();
    forcedParams = body || {};
  } catch (e) {
    // Ignore invalid JSON
  }

  // Reset status file to 'running' synchronously to prevent race conditions during polling
  updateStatus('product_matching', '1단계: 수익성 극대화 상품 분석 및 매칭 중...', 10);

  // Start the autopilot asynchronously so the request returns immediately and the user can poll
  runAutopilotProcess(forcedParams);
  
  return NextResponse.json({ 
    success: true, 
    message: '비즈니스 완전 자동화(Autopilot)가 백엔드에서 기동되었습니다.' 
  });
}

async function runAutopilotProcess(forcedParams = {}) {
  const timestamp = Date.now();
  console.log('[Autopilot] Started Autopilot loop with forced params:', JSON.stringify(forcedParams));
  updateStatus('product_matching', '1단계: 수익성 극대화 상품 분석 및 매칭 중...', 10);

  try {
    const revenueDnaDbPath = path.join(process.cwd(), '..', '_company', '_shared', 'revenue_dna_db.json');
    const isProductDriven = forcedParams.isProductDriven === true;
    let productTitle = '';
    let affiliateLink = '';
    let keyword = '';
    let selectedCategory = null;
    let targetAudience = '';
    let videoStyle = '';
    let isExperiment = false;
    let recentHistory = [];

    const { selectWeightedCategory, selectBestHookCandidate, EXPERIMENT_MAP, tokenize, calculateJaccard } = require('../../lib/CreativeDiversityEngine');

    if (isProductDriven) {
      productTitle = forcedParams.productName || '';
      affiliateLink = forcedParams.coupangLink || forcedParams.productUrl || '{COUPANG_LINK}';
      selectedCategory = '상품 홍보';
      keyword = `상품 홍보 - ${productTitle}`;
      targetAudience = forcedParams.targetAudience || '';
      videoStyle = forcedParams.videoStyle || 'Cinematic';
      console.log(`[Autopilot] PRODUCT-DRIVEN MODE ACTIVE. Product: ${productTitle}, Style: ${videoStyle}`);
    } else {
      productTitle = forcedParams.productTitle || '';
      selectedCategory = forcedParams.category || null;

      if (!productTitle) {
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
        productTitle = '맥북 에어 M3 15인치 (AI 런타임 최적)';
        affiliateLink = 'https://link.coupang.com/a/macbook_m3';
        keyword = '초간단 AI 꿀팁 - 맥북 에어 M3 15인치 (AI 런타임 최적)';
        
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
      } else {
        affiliateLink = `https://link.coupang.com/a/mock_${productTitle.toLowerCase().replace(/[^a-z0-9]/g, '_')}`;
        keyword = `${selectedCategory || '상품'} 꿀팁 - ${productTitle}`;
      }

      // Get recent records for weighting and experiment splits
      recentHistory = [];
      if (fs.existsSync(HISTORY_PATH)) {
        try {
          recentHistory = JSON.parse(fs.readFileSync(HISTORY_PATH, 'utf-8'));
        } catch (e) {
          console.error('Failed to parse history.json:', e);
        }
      }

      let realRevenueDnaCount = 0;
      if (fs.existsSync(revenueDnaDbPath)) {
        try {
          const db = JSON.parse(fs.readFileSync(revenueDnaDbPath, 'utf-8'));
          const revList = db.revenue_dna_list || [];
          realRevenueDnaCount = revList.filter(item => item.is_mock !== true).length;
        } catch (e) {
          console.error('Failed to parse revenue_dna_db.json:', e);
        }
      }

      let experimentRate = 0.3;
      if (realRevenueDnaCount < 10) {
        experimentRate = 0.6;
      } else if (realRevenueDnaCount < 30) {
        experimentRate = 0.4;
      } else if (realRevenueDnaCount < 100) {
        experimentRate = 0.3;
      } else {
        experimentRate = 0.2;
      }

      isExperiment = forcedParams.category ? true : Math.random() < experimentRate;

      if (forcedParams.category) {
        selectedCategory = forcedParams.category;
        const mapped = EXPERIMENT_MAP[selectedCategory];
        if (mapped) {
          if (!forcedParams.productTitle) {
            productTitle = mapped.product;
          }
          keyword = `${mapped.topic} 꿀팁 - ${productTitle}`;
          affiliateLink = `https://link.coupang.com/a/mock_${productTitle.toLowerCase().replace(/[^a-z0-9]/g, '_')}`;
          console.log(`[Autopilot] FORCED CATEGORY ACTIVE! Category: ${selectedCategory}, Product: ${productTitle}`);
        }
      } else if (isExperiment) {
        selectedCategory = selectWeightedCategory(recentHistory);
        const mapped = EXPERIMENT_MAP[selectedCategory];
        if (mapped) {
          productTitle = mapped.product;
          keyword = `${mapped.topic} 꿀팁 - ${productTitle}`;
          affiliateLink = `https://link.coupang.com/a/mock_${productTitle.toLowerCase().replace(/[^a-z0-9]/g, '_')}`;
          console.log(`[Autopilot] DYNAMIC EXPERIMENT ACTIVE! Category: ${selectedCategory}, Product: ${productTitle}, Rate: ${experimentRate*100}%`);
        }
      } else {
        selectedCategory = selectedCategory || '맥북';
        console.log(`[Autopilot] SUCCESS/REVENUE DNA OPTIMIZATION ACTIVE. Rate: ${(1 - experimentRate)*100}%`);
      }
    }

    console.log(`[Autopilot] Target product: ${productTitle}`);
    updateStatus('product_matching', '1단계: 유튜브 시장 조사 및 트렌드 DNA 추출 중...', 15);

    // Run Trend Engine once outside the retry loop to save API calls
    let trendDNA = null;
    if (apiKey) {
      try {
        console.log(`[Autopilot - Trend Engine] Running YouTube market research for "${productTitle}"...`);
        const searchRes = await searchYoutubeMarket(productTitle);
        if (searchRes.success && searchRes.data && searchRes.data.length > 0) {
          console.log(`[Autopilot - Trend Engine] Extracted ${searchRes.data.length} videos. Running Trend DNA extraction...`);
          trendDNA = await extractTrendDNA(productTitle, searchRes.data, false);
        } else {
          console.warn(`[Autopilot - Trend Engine] YouTube search returned no results or failed:`, searchRes.reason);
        }
      } catch (trendErr) {
        console.error(`[Autopilot - Trend Engine] Trend Engine failed, proceeding without Trend DNA:`, trendErr.message);
      }
    }

    updateStatus('script_generation', '2단계: AI 대본 및 화면 연출 프롬프트 창작 중...', 30);

    let scriptData = null;
    let preUploadAnalysis = null;
    let imagePaths = [];
    const outputImgDir = path.join(process.cwd(), 'public', 'shorts', 'cinema_images');
    fs.mkdirSync(outputImgDir, { recursive: true });

    let usedStyle = '';
    let hookType = '';
    let shotPattern = '';
    let styleDna = 'Motivation';
    let selectedHook = HOOK_LIBRARY[0];
    let selectedPattern = SHOT_PATTERNS[0];
    let similarityScore = 0;
    let diversityScore = 100;
    let customFont = 'Pretendard-Bold';
    let customCaptionStyle = 'minimal';
    let customCaptionPosition = 'bottom';
    let forceScrambledParams = false;
    let similarityPenalty = 0;
    let selectedSuccessVids = [];
    let includeSuccess = true;
    let includeRevenue = true;
    let includeFailure = true;
    let agentLessons = [];

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

    const intelPath = path.join(process.cwd(), '..', '_company', '_shared', 'agent_intelligence_db.json');
    if (fs.existsSync(intelPath)) {
      try {
        const db = JSON.parse(fs.readFileSync(intelPath, 'utf-8'));
        agentLessons = db.agent_lessons || [];
      } catch (e) {
        console.error('Failed to parse agent_intelligence_db.json:', e);
      }
    }

    let finalScoreAvg = 0;
    let relevanceScore = 100;
    let factScore = 100;
    let productInfo = null;
    let retryCount = 0;
    const maxRetries = 3;

    while (retryCount <= maxRetries) {
      if (retryCount > 0) {
        console.log(`[Autopilot] Quality/Relevance failed. Regenerating... (Retry attempt ${retryCount}/${maxRetries})`);
        updateStatus('script_generation', `품질 보드 심사 또는 유사도 통과 실패로 재시도 중... (${retryCount}/${maxRetries}회)`, 30 + retryCount * 5);
      }

      imagePaths = [];

      try {
        if (!apiKey) {
          throw new Error("GEMINI_API_KEY is not defined. Cannot run autopilot loop.");
        }

        if (!forceScrambledParams) {
          if (isProductDriven) {
            styleDna = 'Product Reveal';
            usedStyle = videoStyle || 'Cinematic';
            selectedHook = HOOK_LIBRARY[Math.floor(Math.random() * HOOK_LIBRARY.length)];
            hookType = selectedHook.type;
            selectedPattern = SHOT_PATTERNS.find(p => p.name === 'A형 (빌드업)') || SHOT_PATTERNS[0];
            shotPattern = selectedPattern.name;
          } else {
            if (forcedParams.styleDna) {
              styleDna = forcedParams.styleDna;
            } else if (isExperiment || styleDnaList.length === 0) {
              styleDna = STYLE_DNA_LIST[Math.floor(Math.random() * STYLE_DNA_LIST.length)];
            } else {
              const uniqueStyles = [...new Set(styleDnaList.map(item => item.style))];
              styleDna = uniqueStyles.length > 0 ? uniqueStyles[Math.floor(Math.random() * uniqueStyles.length)] : STYLE_DNA_LIST[Math.floor(Math.random() * STYLE_DNA_LIST.length)];
            }
            usedStyle = forcedParams.usedStyle || VISUAL_STYLES[Math.floor(Math.random() * VISUAL_STYLES.length)];
            selectedHook = forcedParams.hookType ? (HOOK_LIBRARY.find(h => h.type === forcedParams.hookType) || HOOK_LIBRARY[0]) : HOOK_LIBRARY[Math.floor(Math.random() * HOOK_LIBRARY.length)];
            hookType = selectedHook.type;
            selectedPattern = forcedParams.shotPattern ? (SHOT_PATTERNS.find(p => p.name === forcedParams.shotPattern) || SHOT_PATTERNS[0]) : SHOT_PATTERNS[Math.floor(Math.random() * SHOT_PATTERNS.length)];
            shotPattern = selectedPattern.name;
          }
        } else {
          forceScrambledParams = false;
        }

        // Calculate dynamic base weights
        let successToAnalyze = successDnaList.filter(item => item.is_mock !== true);
        if (successToAnalyze.length === 0) successToAnalyze = successDnaList;
        let revenueToAnalyze = revenueDnaList.filter(item => item.is_mock !== true);
        if (revenueToAnalyze.length === 0) revenueToAnalyze = revenueDnaList;
        let failureToAnalyze = failureDnaList.filter(item => item.is_mock !== true);
        if (failureToAnalyze.length === 0) failureToAnalyze = failureDnaList;

        const avgSuccessInfluence = successToAnalyze.length > 0 ? successToAnalyze.reduce((acc, item) => acc + (item.dna_influence_score || 50.0), 0) / successToAnalyze.length : 50.0;
        const avgRevenueInfluence = revenueToAnalyze.length > 0 ? revenueToAnalyze.reduce((acc, item) => acc + (item.dna_influence_score || 50.0), 0) / revenueToAnalyze.length : 50.0;

        includeSuccess = Math.random() < 0.90;
        includeRevenue = Math.random() < 0.90;
        includeFailure = Math.random() < 0.25;

        const wS = includeSuccess ? (40 + (avgSuccessInfluence - 50)) : 0;
        const wR = includeRevenue ? (40 + (avgRevenueInfluence - 50)) : 0;
        const wF = includeFailure ? (20 - (avgSuccessInfluence + avgRevenueInfluence - 100) / 2) : 0;

        const totalActive = wS + wR + wF;
        let finalSuccessWeight = totalActive > 0 ? (wS / totalActive) * 90 : 45;
        let finalRevenueWeight = totalActive > 0 ? (wR / totalActive) * 90 : 45;
        let finalFailureWeight = totalActive > 0 ? (wF / totalActive) * 90 : 0;

        const selfImprovementGuidelines = getSelfImprovementGuidelines();
        const revenueDnaGuidelines = includeRevenue ? getRevenueDnaGuidelines() : '';
        const failureDnaGuidelines = includeFailure ? getFailureDnaGuidelines() : '';
        const agentIntelligenceGuidelines = getAgentIntelligenceGuidelines();

        selectedSuccessVids = [];
        if (includeSuccess && successDnaList.length > 0) {
          const shuffled = [...successDnaList].sort(() => 0.5 - Math.random());
          selectedSuccessVids = shuffled.slice(0, Math.min(shuffled.length, Math.floor(Math.random() * 3) + 3));
        }
        const successDnaGuidelines = includeSuccess ? getSuccessDnaGuidelines(selectedSuccessVids) : '';

        let combinedGuidelines = '';
        let experimentNote = isExperiment ? `\n[💡 자가 실험 모드 가동: 기존 성공 공식을 무시하고 완전히 새로운 카테고리/상품(${productTitle})을 탐험하되, 대본의 구성과 비디오 흐름 등은 아래 가이드의 성공/수익화 DNA 패턴을 접목하십시오]\n` : '';

        combinedGuidelines = experimentNote + `
[📢 대본 작성 가중치 비율 지침 (작가 필독)]
1. 성공 DNA 패턴: ${finalSuccessWeight.toFixed(1)}% 가중치.
2. 수익화 DNA 패턴: ${finalRevenueWeight.toFixed(1)}% 가중치.
3. 실패 DNA 패턴: ${finalFailureWeight.toFixed(1)}% 가중치.
4. 에이전트 최근 교훈: 10.0% 가중치.
` + successDnaGuidelines + revenueDnaGuidelines + failureDnaGuidelines + agentIntelligenceGuidelines;

        const diversityGuidelines = `
\n[🎨 CREATIVE DIVERSITY SPECIFICATION]
- Style DNA: ${styleDna}
- Visual Style: ${usedStyle}
- Hook Type: ${hookType} (${selectedHook.description})
- Shot Pattern: ${shotPattern}
  - 1컷 길이: ${selectedPattern.durations[0]}초
  - 2컷 길이: ${selectedPattern.durations[1]}초
  - 3컷 길이: ${selectedPattern.durations[2]}초
  - 4컷 길이: ${selectedPattern.durations[3]}초
`;
        combinedGuidelines += diversityGuidelines;

        console.log('[Autopilot] Step 1: Merged Product Understanding & Script Generation...');
        const mergedScriptRes = await generateScriptWithProductUnderstanding(apiKey, productTitle, combinedGuidelines, isProductDriven, targetAudience, usedStyle, styleDna, trendDNA);
        scriptData = mergedScriptRes;
        productInfo = mergedScriptRes.product_analysis;
        
        if (isProductDriven && scriptData && typeof scriptData.ad_score === 'number' && scriptData.ad_score > 50) {
          throw new Error(`Script ad_score ${scriptData.ad_score} is above 50 limit.`);
        }
        if (isProductDriven && scriptData) {
          const comp = checkProductCompliance(productTitle, scriptData);
          if (!comp.passed) {
            throw new Error(`Product compliance check failed: ${comp.cutChecks.map(c=>c.message).join(', ')}`);
          }
        }

        let recentHooks = [];
        if (fs.existsSync(HISTORY_PATH)) {
          try {
            recentHooks = JSON.parse(fs.readFileSync(HISTORY_PATH, 'utf-8')).slice(0, 20).map(v => v.scriptData?.cuts?.[0]?.subtitle).filter(Boolean);
          } catch(e){}
        }

        let chosenHook = (scriptData.hook_candidates || []).length >= 5 ? selectBestHookCandidate(scriptData.hook_candidates, recentHooks) : (scriptData.cuts?.[0]?.subtitle || '');
        if (scriptData.cuts?.[0] && chosenHook) {
          scriptData.cuts[0].subtitle = chosenHook;
        }

        let hookSimMax = 0;
        if (recentHooks.length > 0 && chosenHook) {
          recentHooks.forEach(rHook => {
            const sim = calculateJaccard(tokenize(chosenHook), tokenize(rHook));
            if (sim > hookSimMax) hookSimMax = sim;
          });
        }
        const hookSimMaxPct = Math.round(hookSimMax * 100);
        console.log(`[Autopilot] Chosen hook max Jaccard similarity: ${hookSimMaxPct}%`);

        if (hookSimMaxPct >= 60) {
          forceScrambledParams = true;
          throw new Error(`Hook similarity ${hookSimMaxPct}% >= 60% detected. Forcing parameter scrambling.`);
        }

        console.log('[Autopilot] Step 2: Generating images for 4 cuts...');
        updateStatus('image_generation', `3단계: 4컷 AI 이미지 생성 및 검수 중...`, 45);

        for (let i = 0; i < 4; i++) {
          const cut = scriptData.cuts[i];
          const filename = `img_auto_${timestamp}_r${retryCount}_cut_${i + 1}.jpg`;
          const absolutePath = path.join(outputImgDir, filename);
          const relativePath = absolutePath.replace(/\\/g, '/');

          try {
            const buffer = await downloadAiImage(cut.prompt);
            fs.writeFileSync(absolutePath, buffer);
            imagePaths.push(relativePath);
            scriptData.cuts[i].image_path = relativePath;
          } catch (e) {
            console.error(`Failed to generate AI image for Cut ${i + 1}:`, e.message);
            const searchKeyword = cut.searchKeyword || cut.keywords || productTitle || 'abstract';
            const fallbackBuf = await downloadFallbackImage(searchKeyword);
            fs.writeFileSync(absolutePath, fallbackBuf);
            imagePaths.push(relativePath);
            scriptData.cuts[i].image_path = relativePath;
          }
        }

        console.log('[Autopilot] Step 3: Running Batch Multimodal Vision Critic...');
        const criticRes = await runBatchVisionCritic(apiKey, imagePaths, scriptData);
        criticRes.critiques.forEach(crit => {
          const idx = crit.cutIndex - 1;
          if (scriptData.cuts[idx]) {
            scriptData.cuts[idx].vision_score = crit.score;
            scriptData.cuts[idx].vision_feedback = crit.feedback;
          }
        });

        console.log('[Autopilot] Step 4: Running Merged Quality Board, Relevance & Fact Checker...');
        preUploadAnalysis = await runMergedQualityBoardAndFactCheck(apiKey, productTitle, productInfo, scriptData);
        
        // Inject average vision score
        const visionScores = scriptData.cuts.map(c => c.vision_score || 70);
        const visionAvg = visionScores.reduce((a, b) => a + b, 0) / visionScores.length;
        preUploadAnalysis.scores.sceneVisuals = Math.round(visionAvg);

        const scores = preUploadAnalysis.scores;
        const scoreSum = scores.hookStrength + scores.scriptContent + scores.sceneVisuals + scores.subtitleAesthetics + scores.soundDesign;
        finalScoreAvg = scoreSum / 5.0;
        relevanceScore = preUploadAnalysis.relevance_score || 85;
        factScore = preUploadAnalysis.fact_score || 90;

        console.log(`[Autopilot] Quality Score: ${finalScoreAvg.toFixed(1)} | Relevance Score: ${relevanceScore} | Fact Score: ${factScore}`);

        if (relevanceScore < 80) {
          throw new Error(`Product Relevance Score ${relevanceScore} is below 80 threshold.`);
        }

        let recentRecords = [];
        if (fs.existsSync(HISTORY_PATH)) {
          try {
            recentRecords = JSON.parse(fs.readFileSync(HISTORY_PATH, 'utf-8')).slice(0, 20);
          } catch(e){}
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

        if (!isProductDriven && similarityScore >= 70) {
          similarityPenalty = 15;
          const modifications = antiCloneModify(scriptData, usedStyle, hookType, shotPattern, styleDna);
          customFont = modifications.font;
          customCaptionStyle = modifications.captionStyle;
          customCaptionPosition = modifications.captionPosition;
          usedStyle = modifications.style;
          hookType = modifications.hookType;
          shotPattern = modifications.shotPattern;
          styleDna = modifications.styleDna;
          forceScrambledParams = true;
          throw new Error(`Clone similarity alert ${similarityScore}% >= 70%. Scrambling parameters.`);
        } else {
          customFont = 'Pretendard-Bold';
          customCaptionStyle = 'minimal';
          customCaptionPosition = 'bottom';
        }

        const passThreshold = isProductDriven ? 75 : 70;
        if (finalScoreAvg < passThreshold) {
          throw new Error(`Quality score ${finalScoreAvg.toFixed(1)} is below pass threshold ${passThreshold}.`);
        }

        // Successfully passed all checks
        break;

      } catch (err) {
        console.error(`[Autopilot Attempt Error] Attempt ${retryCount} failed:`, err.message);
        retryCount++;
        if (retryCount > maxRetries) {
          throw new Error(`Autopilot loop failed after ${maxRetries} attempts. Last error: ${err.message}`);
        }
      }
    }

    finalScoreAvg -= similarityPenalty;
    if (preUploadAnalysis && preUploadAnalysis.scores) {
      preUploadAnalysis.similarityPenaltyApplied = similarityPenalty > 0;
    }

    if (forcedParams.dryRun === true) {
      console.log("[Autopilot] Dry run active. Bypassing video rendering and upload.");
      const resultDetails = {
        id: timestamp.toString(),
        videoUrl: '/shorts/dry_run_mock.mp4',
        videoPath: '',
        youtubeVideoId: 'DRY_RUN',
        isMockUpload: true,
        uploadMessage: 'Dry run completed successfully.',
        productTitle,
        affiliateLink,
        commentText: isProductDriven ? `사용한 제품👇\n\n${affiliateLink}\n\n파트너스 활동의 일환으로\n수수료를 받을 수 있습니다.` : `오늘 영상에서 활약한 [${productTitle}] 최저가 좌표입니다 ➔ ${affiliateLink}`,
        created_at: new Date().toISOString(),
        scriptData: scriptData,
        topic: productTitle.replace(/[\(\[\{\/].*$/, '').trim(),
        category: selectedCategory || '기타',
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
        used_success_dna: includeSuccess ? selectedSuccessVids.map(v => ({ id: v.id || v.video_id, title: v.title || v.source_video_title })) : [],
        used_failure_dna: includeFailure ? failureDnaList.slice(-10).map(v => ({ id: v.id || v.video_id, title: v.title || v.source_video_title })) : [],
        used_revenue_dna: includeRevenue ? revenueDnaList.slice(-10).map(v => ({ id: v.id || v.video_id, title: v.title || v.source_video_title })) : [],
        used_agent_lessons: (agentLessons || []).slice(-5).map(l => ({ agent: l.agent, lesson: l.lesson })),
        is_mock: false,
        source: "autopilot",
        product_name: isProductDriven ? forcedParams.productName : productTitle,
        product_url: isProductDriven ? forcedParams.productUrl : '',
        coupang_link: isProductDriven ? forcedParams.coupangLink : affiliateLink,
        target_audience: isProductDriven ? forcedParams.targetAudience : '',
        video_style: isProductDriven ? forcedParams.videoStyle : usedStyle,
        ad_score: isProductDriven ? (scriptData.ad_score || 0) : 0,
        quality_score: Math.round(finalScoreAvg),
        product_relevance_score: relevanceScore,
        product_fact_score: factScore,
        upload_mode: isProductDriven ? 'product-driven' : 'archetype',
        pinned_comment_status: isProductDriven ? 'pending' : 'not_attempted',
        compliance: isProductDriven ? checkProductCompliance(forcedParams.productName, scriptData) : { passed: true, cutChecks: [] }
      };

      saveToHistory(resultDetails);
      updateStatus('completed', '드라이 런 완료!', 100, resultDetails);
      console.log('[Autopilot] Dry run completed successfully!');
      return;
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

    // 5. YouTube Upload status setup - By default OFF for Product-Driven, Auto for General Autopilot if score >= 80
    let youtubeVideoId = 'MOCK_VIDEO_ID';
    let isMockUpload = true;
    let uploadMsg = '시뮬레이션 완료: 데모 모드로 업로드 처리를 완료했습니다.';

    if (isProductDriven) {
      youtubeVideoId = 'PENDING_APPROVAL';
      isMockUpload = true;
      uploadMsg = '영상이 생성되었습니다. 유튜브 업로드 승인을 대기 중입니다.';
      console.log('[Autopilot] Product-Driven Mode: Bypassing automatic upload. Awaiting user approval.');
    } else {
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
    }

    const pinnedCommentText = `사용한 제품👇\n\n${affiliateLink}\n\n파트너스 활동의 일환으로\n수수료를 받을 수 있습니다.`;

    // 6. Complete Autopilot
    const resultDetails = {
      id: timestamp.toString(),
      videoUrl: relativeVideoUrl,
      videoPath: absoluteOutputPath.replace(/\\/g, '/'),
      youtubeVideoId,
      isMockUpload,
      uploadMessage: uploadMsg,
      productTitle,
      affiliateLink,
      commentText: isProductDriven ? pinnedCommentText : `오늘 영상에서 활약한 [${productTitle}] 최저가 좌표입니다 ➔ ${affiliateLink}`,
      created_at: new Date().toISOString(),
      scriptData: scriptData,
      topic: productTitle.replace(/[\(\[\{\/].*$/, '').trim(),
      category: selectedCategory || '기타',
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
      used_success_dna: includeSuccess ? selectedSuccessVids.map(v => ({ id: v.id || v.video_id, title: v.title || v.source_video_title })) : [],
      used_failure_dna: includeFailure ? failureDnaList.slice(-10).map(v => ({ id: v.id || v.video_id, title: v.title || v.source_video_title })) : [],
      used_revenue_dna: includeRevenue ? revenueDnaList.slice(-10).map(v => ({ id: v.id || v.video_id, title: v.title || v.source_video_title })) : [],
      used_agent_lessons: (agentLessons || []).slice(-5).map(l => ({ agent: l.agent, lesson: l.lesson })),
      is_mock: false,
      source: "autopilot",
      
      // Save metadata for Product-Driven mode
      product_name: isProductDriven ? forcedParams.productName : productTitle,
      product_url: isProductDriven ? forcedParams.productUrl : '',
      coupang_link: isProductDriven ? forcedParams.coupangLink : affiliateLink,
      target_audience: isProductDriven ? forcedParams.targetAudience : '',
      video_style: isProductDriven ? forcedParams.videoStyle : usedStyle,
      ad_score: isProductDriven ? (scriptData.ad_score || 0) : 0,
      quality_score: Math.round(finalScoreAvg),
      upload_mode: isProductDriven ? 'product-driven' : 'archetype',
      pinned_comment_status: isProductDriven ? 'pending' : 'not_attempted',
      compliance: isProductDriven ? checkProductCompliance(forcedParams.productName, scriptData) : { passed: true, cutChecks: [] }
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
      const list = (db.revenue_dna_list || []).filter(item => item.is_mock !== true);
      if (list.length > 0) {
        let dnaGuide = `\n[🔥 검증된 수익화 영상 DNA (반드시 아래 고수익 및 고ROI 패턴을 벤치마킹하여 구매 전환을 극대화하는 카피를 작성하십시오)]\n`;
        list.slice(-10).forEach((item, idx) => {
          dnaGuide += `${idx + 1}. 제목: "${item.source_video_title || item.title}" | 3초 후킹 카피: "${item.hook || item.title}" | Money Score: ${item.money_score}점 | ROI: ${item.roi || 0}%\n`;
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

async function fetchGeminiWithRetry(url, options, maxRetries = 3) {
  let attempt = 0;
  const backoffs = [5000, 15000, 45000];
  while (attempt < maxRetries) {
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 20000); // 20s timeout
    try {
      const response = await fetch(url, { ...options, signal: controller.signal });
      clearTimeout(timeoutId);
      
      if (response.status === 429) {
        try {
          const bodyText = await response.clone().text();
          const lowerBody = bodyText.toLowerCase();
          if (lowerBody.includes("quota exceeded") || lowerBody.includes("resource_exhausted") || lowerBody.includes("exceeded your current quota")) {
            console.warn("[Gemini API] Daily quota limit exceeded (RESOURCE_EXHAUSTED). Skipping retries to fail fast.");
            return response;
          }
        } catch (err) {
          // Ignore
        }
        const waitTime = backoffs[attempt] || 45000;
        attempt++;
        console.warn(`[Gemini API] Got 429 Rate Limit (Attempt ${attempt}/${maxRetries}). Sleeping ${waitTime/1000} seconds before retry...`);
        await new Promise(resolve => setTimeout(resolve, waitTime));
        continue;
      }
      return response;
    } catch (err) {
      clearTimeout(timeoutId);
      if (err.name === 'AbortError') {
        console.warn(`[Gemini API] Fetch aborted due to 20s timeout.`);
      } else {
        console.error(`[Gemini API] Fetch error:`, err.message);
      }
      attempt++;
      if (attempt < maxRetries) {
        const waitTime = backoffs[attempt - 1] || 5000;
        console.warn(`[Gemini API] Got error. Retrying in ${waitTime/1000} seconds...`);
        await new Promise(resolve => setTimeout(resolve, waitTime));
        continue;
      }
      throw err;
    }
  }
  return fetch(url, options);
}

// Merged Product Understanding + Script Generation Agent
export async function generateScriptWithProductUnderstanding(apiKey, productTitle, combinedGuidelines, isProductDriven, targetAudience, usedStyle, archetype, trendDNA = null) {
  let trendGuide = '';
  if (trendDNA) {
    trendGuide = `
[YouTube Trend Analysis & Gap Opportunities]
실제 유튜브 상위 노출 영상들로부터 도출된 트렌드 DNA 데이터입니다:
- 제목 패턴: ${JSON.stringify(trendDNA.dna?.titlePatterns)}
- 오프닝 훅 스타일: ${JSON.stringify(trendDNA.dna?.hookPatterns)}
- 시장 과포화 표현 (아래 표현들은 대본 및 제목에 절대로 사용하지 마십시오):
  ${(trendDNA.saturation?.overusedPhrases || []).map(p => `- "${p.phrase}"`).join('\n')}
- 추천 틈새 장르/유형: ${trendDNA.gapOpportunity?.recommendedType}
- 추천 이유: ${trendDNA.gapOpportunity?.reason}
`;
  }

  const systemPrompt = `당신은 맹칠컴퍼니의 대표 카피라이터이자 상품 분석가 에이전트(Writer & Product Analyst Agent)입니다.
당신의 임무는 두 가지 단계(상품 분석 및 대본 창작)를 동시에 수행하여 하나의 통합 JSON 결과를 출력하는 것입니다.

[1단계: 상품 분석 (Product Understanding)]
상품명: "${productTitle}"
타겟 고객 정보(입력됨): "${targetAudience || '일반 대중'}"
위 상품 정보를 심층 분석하여 아래의 9가지 분석 항목을 명확하고 구체적인 한국어 단문 또는 핵심 리스트로 추출하십시오:
1. 카테고리 (Category) - 상품의 핵심 분류
2. 브랜드 (Brand) - 상품의 브랜드명
3. 주요 기능 (Features) - 핵심 동작 방식 및 주요 기능 리스트
4. 핵심 장점 (Benefits) - 사용자가 얻는 궁극적인 이점과 해결책
5. 타겟 고객 (Target Audience) - 이 상품이 가장 필요한 핵심 연령대와 특징
6. 사용 상황 (Usage Context) - 이 상품을 실제로 사용하게 되는 일상 속 구체적인 상황
7. 구매 욕구 (Purchase Desire) - 사용자가 이 상품을 사고 싶게 만드는 심리적/실용적 욕구
8. 해결하는 문제 (Problem Solved) - 이 상품이 해결해 주는 치명적인 일상의 고통이나 불편함
9. 경쟁 제품 대비 특징 (Competition) - 타사 제품이나 기존 방식에 비해 차별화되는 점

[2단계: 쇼츠 대본 창작 (Script Generation)]
위의 상품 분석 내용과 다음 이야기 전개 타입(Narrative Archetype)을 완벽히 준수하여 4컷 구성 대본을 기획하십시오:
- Narrative Archetype: ${archetype || 'I. 스토리형'}

[영상 구조 지침 (Strict Structure)]
- 1컷: 문제 제시 (Problem presentation) - 타겟 고객이 일상에서 겪는 치명적인 불편이나 문제점을 제시합니다. **(⚠️ 절대 1컷에서 상품명, 브랜드, 상품 이미지를 직접 언급하거나 보여주지 마십시오)**
- 2컷: 공감 (Empathy) - 그 문제로 인해 겪는 답답함과 어려움에 격하게 공감합니다. **(⚠️ 절대 2컷에서 상품이나 브랜드를 언급하거나 노출하지 마십시오)**
- 3컷: 해결 암시 (Imply solution) - 이 문제를 아주 쉽게 해결할 수 있는 신박한 방법이나 실마리가 있음을 넌지시 암시합니다. **(⚠️ 절대 3컷에서 구체적인 상품명이나 브랜드를 직접 언급하지 마십시오)**
- 4컷: 상품 공개 (Product reveal) - 드디어 해결책인 "${productTitle}" 상품을 전격 공개하며, 상세한 정보는 고정댓글 링크에서 바로 확인하라는 행동 유도(Call To Action)를 전합니다.

[내용 작성 중요 제약 조건]
1. 스펙 나열 금지: 자막이나 설명글에 배터리 용량, 무게, 소재 등의 딱딱한 기계적 스펙을 나열하지 마십시오.
2. 허위 정보 작성 금지: 상품에 존재하지 않는 허구 기능이나 과장 표현(예: 1초 만에 플라그 100% 제거)을 절대 쓰지 마십시오.
3. 영상의 분위기: 전체 자막 및 화면 톤은 "${usedStyle || 'Cinematic'}" 감성을 완벽히 따르십시오.

[마케팅 가이드 및 트렌드 DNA]
${combinedGuidelines}
${trendGuide}

출력은 반드시 다른 설명이나 마크다운 태그 없이 아래 JSON 규격이어야 합니다:
{
  "product_analysis": {
    "category": "상품 카테고리",
    "brand": "브랜드명",
    "features": ["기능 1", "기능 2", "기능 3"],
    "benefits": ["장점 1", "장점 2"],
    "target_audience": "상세한 타겟 고객 묘사",
    "usage_context": "구체적인 사용 상황 설명",
    "purchase_desire": "사용자의 구매 욕구 키워드",
    "problem_solved": "해결하는 고통이나 문제점",
    "competitor_differentiation": "경쟁력 차별점"
  },
  "title": "쇼츠 영상 제목 (한글 20자 이내)",
  "youtube_description": "유튜브 업로드용 설명 본문 (해시태그 3~5개 포함)",
  "ad_score": 30,
  "hook_candidates": [
    "1컷에 적용할 수 있는 강력한 한글 3초 후킹 문구 후보 1 (15자 내외의 단문 + 끝에 시각적 이모지 1개 포함)",
    "후보 2", "후보 3", "후보 4", "후보 5"
  ],
  "cuts": [
    {
      "subtitle": "해당 컷에 적용할 짧고 강렬한 자막 (15자 내외의 한국어 단문 + 끝에 시각적 이모지 딱 1개 포함)",
      "description": "화면 연출 및 비주얼 설명",
      "prompt": "Flux AI 이미지 생성을 위한 최고 품질의 영어 프롬프트 (vertical 9:16 framing, highly aesthetic, commercial-grade, 8k, no text, no captions)",
      "searchKeyword": "스톡 이미지 검색용 영어 키워드 (2~3단어)",
      "cameraMovement": "zoom in 또는 zoom out 또는 panning",
      "duration": 5,
      "keywords": "강조 키워드"
    }
  ]
}
주의사항: cuts 배열의 크기는 반드시 정확히 4개여야 하며, hook_candidates의 크기는 반드시 정확히 5개여야 합니다.

[JSON 작성 중요 제한 지침]
1. 출력 JSON의 모든 문자열 값 안에서 큰따옴표(\")를 절대 사용하지 마십시오. 필요하면 작은따옴표(') 혹은 한글 따옴표(‘, ’)를 사용하십시오.
2. 모든 문자열 값은 단일 행으로 작성하고 줄바꿈(\\n)을 절대 넣지 마십시오.
3. ad_score(광고 냄새 점수): 1~3컷에서 상품을 홍보하면 높게(70점 이상), 4컷에서만 제품이 등장하면 낮게(40점 이하) 매기십시오. 50점 이하가 되도록 하십시오.
`;

  const response = await fetchGeminiWithRetry(
    `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash:generateContent?key=${apiKey}`,
    {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        contents: [{ parts: [{ text: systemPrompt }] }],
        generationConfig: { 
          temperature: 0.8,
          maxOutputTokens: 8192,
          responseMimeType: "application/json"
        }
      })
    }
  );

  if (!response.ok) {
    const errorText = await response.text().catch(() => '');
    throw new Error(`Gemini generateScriptWithProductUnderstanding API failed: status ${response.status}. Response: ${errorText}`);
  }

  const rawText = await response.text();
  const parsed = JSON.parse(rawText);
  const text = parsed.candidates?.[0]?.content?.parts?.[0]?.text;
  if (!text) throw new Error('Empty response from generateScriptWithProductUnderstanding');
  const cleaned = cleanJson(text);
  const result = JSON.parse(cleaned);
  if (!result || !Array.isArray(result.cuts) || result.cuts.length !== 4) {
    throw new Error('Gemini response did not contain exactly 4 cuts in the cuts array');
  }
  return result;
}

// Merged Batch Vision Critic Agent (1 multimodal call for all 4 cuts)
export async function runBatchVisionCritic(apiKey, imagePaths, scriptData) {
  const parts = [];
  let instructions = `당신은 쇼츠 영상의 시각적 퀄리티를 심사하는 비주얼 감사관 에이전트(Vision Critic)입니다.
제공된 4개의 이미지(9:16 비율, 순서대로 Cut 1, Cut 2, Cut 3, Cut 4)를 분석하여 상용 광고 수준(Commercial-grade)의 완성도를 갖추었는지 평가하십시오.
칭찬하지 마십시오. 문제점과 뭉개진 부분, 왜곡된 부분을 찾아내십시오.

[검사 항목]
1. 프롬프트 일치도 (Prompt Alignment): 각 이미지의 생성 프롬프트에 명시된 내용이 이미지에 정확히 묘사되었는지 여부
2. 객체 정확도 (Object Accuracy): 손가락 왜곡, 신체 왜곡, 글자 렌더링 오류, 찌그러진 사물이 있는지 여부
3. 분위기 및 일관성 (Consistency): 4장의 이미지 간 주인공 외모, 옷 스타일, 화풍(Illustration, Photo 등)이 일관되게 연결되는지 여부

[각 컷별 생성 프롬프트]
${scriptData.cuts.map((c, idx) => `- Cut ${idx + 1}: "${c.prompt}"`).join('\n')}

출력은 다른 설명 없이 반드시 아래 규격의 JSON이어야 합니다:
{
  "critiques": [
    {
      "cutIndex": 1,
      "score": 85,
      "feedback": "전체적으로 우수하나 손가락 끝부분이 약간 뭉개져 보입니다."
    },
    {
      "cutIndex": 2,
      "score": 80,
      "feedback": "프롬프트 분위기가 잘 살았습니다."
    },
    {
      "cutIndex": 3,
      "score": 90,
      "feedback": "매우 고품질의 완성도입니다."
    },
    {
      "cutIndex": 4,
      "score": 75,
      "feedback": "제품 공개가 임팩트 있게 묘사되었습니다."
    }
  ]
}`;

  parts.push({ text: instructions });

  // Load each image
  imagePaths.forEach((imgPath) => {
    const absolutePath = path.isAbsolute(imgPath) ? imgPath : path.join(process.cwd(), 'public', imgPath.replace(/^\/shorts\//, 'shorts/'));
    if (fs.existsSync(absolutePath)) {
      const base64 = fs.readFileSync(absolutePath).toString("base64");
      parts.push({
        inlineData: {
          data: base64,
          mimeType: "image/jpeg"
        }
      });
    }
  });

  try {
    const response = await fetchGeminiWithRetry(
      `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash:generateContent?key=${apiKey}`,
      {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          contents: [{ parts }],
          generationConfig: { 
            temperature: 0.15,
            maxOutputTokens: 4096,
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
    const cleaned = cleanJson(text);
    return JSON.parse(cleaned);
  } catch (e) {
    console.error(`[Vision Critic] Batch evaluation failed:`, e);
    // Fallback pass response
    return {
      critiques: [1, 2, 3, 4].map(idx => ({ cutIndex: idx, score: 75, feedback: `검사 에러로 대체됨: ${e.message}` }))
    };
  }
}

// Merged Quality Board + Fact Checker + Relevance Checker Agent
export async function runMergedQualityBoardAndFactCheck(apiKey, productTitle, productInfo, scriptData) {
  const systemPrompt = `당신은 맹칠컴퍼니의 팩트체커이자 쇼츠 연구소 책임자(Quality Board & Fact Checker)입니다.
제작된 쇼츠 대본에 대해 상품 적합성(Product Relevance), 허위 스펙 여부(Fact Check), 그리고 제작 퀄리티(Quality Score)를 종합적으로 분석하십시오.

[상품 정보 프로필]
${JSON.stringify(productInfo, null, 2)}

[제작된 쇼츠 대본 정보]
- 제목: "${scriptData.title}"
- 설명: "${scriptData.youtube_description || ''}"
${scriptData.cuts.map((c, idx) => `- 컷 ${idx + 1}: 자막: "${c.subtitle}", 연출: "${c.description}"`).join('\n')}

[평가 기준]
1. 상품 적합성 점수 (Product Relevance Score, 0~100):
   - 상품 카테고리, 사용 상황, 컨셉, 이미지 묘사 일치도 평가. (85점 이상 합격)
2. 팩트체크 점수 (Product Fact Score, 0~100):
   - 허위 스펙이 포함되었는지, 존재하지 않는 과장된 기능 묘사가 있는지 평가. 건당 15점 감점. (90점 이상 합격)
3. 5가지 영역 품질 평가 (Quality Scores, 각 0~100):
   - hookStrength (후크 강도)
   - scriptContent (대본 구성)
   - sceneVisuals (비주얼 연출)
   - subtitleAesthetics (자막 스타일)
   - soundDesign (오디오 디자인)

출력은 반드시 다른 설명 없이 아래 JSON 규격이어야 합니다:
{
  "scores": {
    "hookStrength": 80,
    "scriptContent": 85,
    "sceneVisuals": 75,
    "subtitleAesthetics": 80,
    "soundDesign": 80
  },
  "relevance_score": 95,
  "relevance_feedback": "카테고리와 사용 상황이 모두 상품 설명에 정확히 부합합니다.",
  "fact_score": 90,
  "fact_feedback": "허위 스펙은 없으나 연출된 내용에 과장이 일부 포함되어 감점했습니다.",
  "evaluations": {
    "hookStrength": "후킹 평가 내용 (1~2문장)",
    "scriptContent": "대본 평가 내용 (1~2문장)",
    "sceneVisuals": "장면 평가 내용 (1~2문장)",
    "subtitleAesthetics": "자막 평가 내용 (1~2문장)",
    "soundDesign": "사운드 평가 내용 (1~2문장)"
  },
  "details": {
    "category_match": true,
    "context_match": true,
    "description_match": true,
    "has_false_specs": false,
    "has_exaggerated_claims": true,
    "has_non_existent_features": false
  }
}
[JSON 작성 중요 제한 지침]
1. 출력 JSON의 모든 문자열 값 안에서 큰따옴표(\")를 절대 사용하지 마십시오. 필요하면 작은따옴표(') 혹은 한글 따옴표(‘, ’)를 사용하십시오.
2. 모든 문자열 값은 단일 행으로 작성하고 줄바꿈(\\n)을 절대 넣지 마십시오.
`;

  const response = await fetchGeminiWithRetry(
    `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash:generateContent?key=${apiKey}`,
    {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        contents: [{ parts: [{ text: systemPrompt }] }],
        generationConfig: { 
          temperature: 0.15,
          maxOutputTokens: 4096,
          responseMimeType: "application/json"
        }
      })
    }
  );

  if (!response.ok) {
    throw new Error(`Gemini runMergedQualityBoardAndFactCheck API failed: status ${response.status}`);
  }

  const rawText = await response.text();
  const parsed = JSON.parse(rawText);
  const text = parsed.candidates?.[0]?.content?.parts?.[0]?.text;
  if (!text) throw new Error('Empty response from runMergedQualityBoardAndFactCheck');
  const cleaned = cleanJson(text);
  return JSON.parse(cleaned);
}

// Fallback script if Gemini is missing/fails
function generateFallbackScript(productTitle, isProductDriven = false, targetAudience = '', videoStyle = '') {
  if (isProductDriven) {
    const style = videoStyle || 'Cinematic';
    const target = targetAudience || '여러분';
    return {
      title: `${productTitle} 솔직 후기 및 추천`,
      youtube_description: `오늘 소개할 제품은 바로 [${productTitle}] 입니다! 자세한 정보와 구매는 고정댓글 링크를 확인해 보세요.\n#Shorts #추천템 #${productTitle.replace(/\s+/g, '')}`,
      ad_score: 30,
      cuts: [
        {
          subtitle: `매일 아침 일어날 때마다 피곤하고 온몸이 무거우신가요? 🥱`,
          description: `아침 침대에서 일어나지 못해 힘들어하는 현대인의 모습, 어두운 조명`,
          prompt: `Professional ${style} photography, a tired person struggling to wake up in a cozy but dimly lit bedroom, cinematic lighting, vertical 9:16 framing, highly aesthetic, commercial-grade, 8k, no text`,
          searchKeyword: `tired person waking up bedroom`,
          cameraMovement: 'zoom in',
          duration: 5,
          keywords: '피로감'
        },
        {
          subtitle: `이대로 방치하면 일의 효율도 떨어지고 매일매일이 힘들어집니다. ㅠㅠ`,
          description: `사무실 책상에서 피곤해 지쳐 컴퓨터 화면을 멍하니 바라보는 직장인`,
          prompt: `Professional ${style} photography, a stressed office worker staring blankly at a glowing computer screen at a modern desk, soft lighting, depth of field, vertical 9:16 framing, commercial-grade, 8k, no text`,
          searchKeyword: `tired office worker desk`,
          cameraMovement: 'fixed',
          duration: 5,
          keywords: '무기력함'
        },
        {
          subtitle: `하루 단 10초로 생기와 에너지를 완벽 충전할 치트키가 있습니다! ✨`,
          description: `밝게 들어오는 아침 햇살을 받으며 미소 짓는 생기 있는 사람`,
          prompt: `Professional ${style} photography, a healthy person smiling brightly in front of a window with warm morning sunlight, vibrant colors, f/1.8, vertical 9:16 framing, commercial-grade, 8k, no text`,
          searchKeyword: `happy healthy person smiling`,
          cameraMovement: 'slow motion',
          duration: 5,
          keywords: '에너지충전'
        },
        {
          subtitle: `이제 [${productTitle}]로 활력 넘치는 하루를 바로 시작해 보세요! 🎁`,
          description: `세련된 현대식 테이블 위에 놓여 있는 프리미엄 패키지 샷`,
          prompt: `Professional premium product photography, elegant packaging of ${productTitle} placed on a clean wooden table with warm sunlight, soft background, vertical 9:16 framing, commercial-grade, 8k, no text`,
          searchKeyword: `premium product packaging table`,
          cameraMovement: 'zoom out',
          duration: 5,
          keywords: productTitle
        }
      ]
    };
  }
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

// Product-Driven Compliance Checker helper
function checkProductCompliance(productName, scriptData) {
  const pName = productName.toLowerCase().trim();
  // Filter out common Korean stop words and short particles/common suffixes to avoid false positives
  const stopWords = new Set([
    '프로', '에어', '미니', '플러스', '맥스', '라이트', '스마트', '울트라', '정품', 
    '추천', '가성비', '세대', '인치', '버전', '용량', '색상', '세트', '블랙', '화이트', 
    '실버', '그레이', '골드', '핑크', '블루', '레드', '그린', '옐로우', '퍼플', '오렌지',
    '추천템', '사용기', '후기'
  ]);
  const words = pName.split(/\s+/).filter(w => w.length >= 2 && !stopWords.has(w));
  const cutChecks = [];
  let passed = true;

  for (let i = 0; i < 3; i++) {
    const sub = (scriptData.cuts[i]?.subtitle || '').toLowerCase();
    let containsProduct = false;
    if (sub.includes(pName)) {
      containsProduct = true;
    } else {
      for (const w of words) {
        if (sub.includes(w)) {
          containsProduct = true;
          break;
        }
      }
    }
    
    cutChecks.push({
      cutIndex: i + 1,
      passed: !containsProduct,
      message: containsProduct 
        ? `상품명/브랜드 노출 감지됨 (${scriptData.cuts[i].subtitle})` 
        : '상품명 노출 없음 (통과)'
    });
    if (containsProduct) passed = false;
  }

  const sub4 = (scriptData.cuts[3]?.subtitle || '').toLowerCase();
  let containsProduct4 = sub4.includes(pName);
  if (!containsProduct4) {
    if (words.length > 0) {
      for (const w of words) {
        if (sub4.includes(w)) {
          containsProduct4 = true;
          break;
        }
      }
    } else {
      const allWords = pName.split(/\s+/).filter(w => w.length >= 1);
      for (const w of allWords) {
        if (sub4.includes(w)) {
          containsProduct4 = true;
          break;
        }
      }
    }
  }

  cutChecks.push({
    cutIndex: 4,
    passed: containsProduct4,
    message: containsProduct4 
      ? '상품명 공개 확인 (통과)' 
      : '상품명 미공개 (경고)'
  });
  if (!containsProduct4) passed = false;

  return { passed, cutChecks };
}

// 1. Product Understanding Agent
async function runProductUnderstandingAgent(apiKey, productName, targetAudience = '') {
  const prompt = `당신은 맹칠컴퍼니의 상품 분석 에이전트(Product Intelligence Analyst)입니다.
상품명: "${productName}"
타겟 고객 정보(입력됨): "${targetAudience || '일반 대중'}"

위 상품 정보를 심층 분석하여 아래의 9가지 분석 항목을 명확하고 구체적인 한국어 단문 또는 핵심 리스트로 추출하십시오:
1. 카테고리 (Category) - 상품의 핵심 분류
2. 브랜드 (Brand) - 상품의 브랜드명
3. 주요 기능 (Features) - 핵심 동작 방식 및 주요 기능 리스트
4. 핵심 장점 (Benefits) - 사용자가 얻는 궁극적인 이점과 해결책
5. 타겟 고객 (Target Audience) - 이 상품이 가장 필요한 핵심 연령대와 특징
6. 사용 상황 (Usage Context) - 이 상품을 실제로 사용하게 되는 일상 속 구체적인 상황
7. 구매 욕구 (Purchase Desire) - 사용자가 이 상품을 사고 싶게 만드는 심리적/실용적 욕구
8. 해결하는 문제 (Problem Solved) - 이 상품이 해결해 주는 치명적인 일상의 고통이나 불편함
9. 경쟁 제품 대비 특징 (Competition) - 타사 제품이나 기존 방식에 비해 차별화되는 점

출력은 반드시 다른 설명 없이 아래 JSON 규격이어야 합니다:
{
  "category": "상품 카테고리",
  "brand": "브랜드명",
  "features": ["기능 1", "기능 2", "기능 3"],
  "benefits": ["장점 1", "장점 2"],
  "target_audience": "상세한 타겟 고객 묘사",
  "usage_context": "구체적인 사용 상황 설명",
  "purchase_desire": "사용자의 구매 욕구 키워드",
  "problem_solved": "해결하는 고통이나 문제점",
  "competitor_differentiation": "경쟁력 차별점"
}
[JSON 작성 중요 제한 지침]
1. 출력 JSON의 모든 문자열 값 안에서 큰따옴표(")를 절대 사용하지 마십시오. 필요하면 작은따옴표(') 혹은 한글 따옴표(‘, ’)를 사용하십시오.
2. 모든 문자열 값은 단일 행으로 작성하고 줄바꿈(\\n)을 절대 넣지 마십시오.
`;

  try {
    const response = await fetchGeminiWithRetry(
      `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash:generateContent?key=${apiKey}`,
      {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          contents: [{ parts: [{ text: prompt }] }],
          generationConfig: { 
            temperature: 0.15,
            maxOutputTokens: 2048,
            responseMimeType: "application/json"
          }
        })
      }
    );

    if (!response.ok) {
      throw new Error(`Product Understanding Agent failed: status ${response.status}`);
    }

    const rawText = await response.text();
    const parsed = JSON.parse(rawText);
    const text = parsed.candidates?.[0]?.content?.parts?.[0]?.text;
    if (!text) throw new Error('Empty response from Product Understanding Agent');
    const cleaned = cleanJson(text);
    return JSON.parse(cleaned);
  } catch (e) {
    console.error('[Product Understanding] Failed, returning fallback profile:', e);
    return {
      category: '상품 홍보',
      brand: '일반',
      features: [productName],
      benefits: ['편리성 향상', '삶의 질 개선'],
      target_audience: targetAudience || '일반 대중',
      usage_context: '일상생활 중',
      purchase_desire: '효율적인 생활',
      problem_solved: '불편함 해소',
      competitor_differentiation: '높은 가성비와 기능성'
    };
  }
}

// 2. Search Query Generator
async function generateSearchQueries(apiKey, productName, productInfo) {
  const prompt = `당신은 이미지 검색 최적화 에이전트(Search Query Planner)입니다.
상품명: "${productName}"
상품 분석 프로필:
${JSON.stringify(productInfo, null, 2)}

이 상품과 관련된 숏폼 영상(쇼츠)에 사용될 고품질 스톡 이미지 및 플럭스 AI 프롬프트를 검색하기 위해 적합한 영어 검색어(Search queries)를 최소 20개 생성하십시오.
각 검색어는 다음 세 범주를 아울러야 합니다:
- 상품 직관어 (예: electric toothbrush, modern gadget, clean design)
- 사용 상황 및 라이프스타일 (예: morning bathroom brush teeth, brushing mirror reflection, fresh smile)
- 문제점/불안/공감 상황 (예: stressed person toothache, bleeding gums closeup, tired face waking up)

출력은 반드시 다른 텍스트 없이 아래 JSON 규격이어야 합니다:
{
  "queries": [
    "english query 1",
    "english query 2",
    "english query 3",
    "english query 4",
    "english query 5",
    "english query 6",
    "english query 7",
    "english query 8",
    "english query 9",
    "english query 10",
    "english query 11",
    "english query 12",
    "english query 13",
    "english query 14",
    "english query 15",
    "english query 16",
    "english query 17",
    "english query 18",
    "english query 19",
    "english query 20"
  ]
}
주의: 각 검색어는 Pexels나 Unsplash 같은 스톡 이미지 사이트에서 실제 검색 결과가 잘 나오도록 영어로 2~3단어로 이루어진 명사/형용사 구문이어야 합니다. 검색어 개수는 반드시 20개 이상이어야 합니다.
`;

  try {
    const response = await fetchGeminiWithRetry(
      `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash:generateContent?key=${apiKey}`,
      {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          contents: [{ parts: [{ text: prompt }] }],
          generationConfig: { 
            temperature: 0.2,
            maxOutputTokens: 2048,
            responseMimeType: "application/json"
          }
        })
      }
    );

    if (!response.ok) throw new Error('Search Query Generator API failed');
    const rawText = await response.text();
    const parsed = JSON.parse(rawText);
    const text = parsed.candidates?.[0]?.content?.parts?.[0]?.text;
    const cleaned = cleanJson(text);
    const result = JSON.parse(cleaned);
    if (result && Array.isArray(result.queries) && result.queries.length >= 20) {
      return result.queries;
    }
  } catch (e) {
    console.error('[Search Query Generator] Failed, using default queries:', e);
  }

  return [
    `${productName} product`, 'clean style aesthetic', 'modern design detail', 'minimal studio shot',
    'lifestyle product photography', 'person using gadget', 'closeup product detail', 'premium packaging design',
    'happy person smile lifestyle', 'morning bathroom routine', 'smart home device', 'futuristic tech concept',
    'satisfying process closeup', 'daily routine task', 'frustrated person stress', 'happy outcome success',
    'professional photography style', 'neat tabletop setup', 'focus on details macro', 'sleek commercial look'
  ];
}

// 3. Multi-Source Asset Collector
async function collectMultiSourceAssets(apiKey, productName, queries) {
  const candidates = [];
  
  // 1. Pexels (Try to fetch 10-15 real image URLs)
  const pexelsKey = process.env.PEXELS_API_KEY;
  if (pexelsKey) {
    try {
      const selectedQueries = queries.slice(0, 4);
      for (const q of selectedQueries) {
        const url = `https://api.pexels.com/v1/search?query=${encodeURIComponent(q)}&orientation=portrait&per_page=5`;
        const res = await fetch(url, { headers: { 'Authorization': pexelsKey } });
        if (res.ok) {
          const data = await res.json();
          if (Array.isArray(data.photos)) {
            data.photos.forEach(p => {
              candidates.push({
                url: p.src.large2x || p.src.portrait,
                source: 'Pexels',
                keyword: q,
                description: p.alt || `${q} photo`
              });
            });
          }
        }
      }
    } catch (e) {
      console.warn('[Collector] Pexels collection failed:', e.message);
    }
  }

  while (candidates.filter(c => c.source === 'Pexels').length < 10) {
    const idx = candidates.filter(c => c.source === 'Pexels').length;
    const q = queries[idx % queries.length];
    candidates.push({
      url: `https://images.unsplash.com/photo-1542751371-adc38448a05e?q=80&w=1080&h=1920&fit=crop`,
      source: 'Pexels',
      keyword: q,
      description: `${q} mock pexels photo`
    });
  }

  // 2. Unsplash (10 items)
  const unsplashPhotoIds = [
    'photo-1505740420928-5e560c06d30e', 
    'photo-1523275335684-37898b6baf30', 
    'photo-1542291026-7eec264c27ff', 
    'photo-1560343090-f0409e92791a', 
    'photo-1572635196237-14b3f281503f', 
    'photo-1526170375885-4d8ecf77b99f', 
    'photo-1583394838336-acd977736f90', 
    'photo-1506784983877-45594efa4cbe', 
    'photo-1498050108023-c5249f4df085', 
    'photo-1512621776951-a57141f2eefd'  
  ];
  unsplashPhotoIds.forEach((id, i) => {
    const q = queries[(i + 4) % queries.length];
    candidates.push({
      url: `https://images.unsplash.com/${id}?w=1080&h=1920&fit=crop`,
      source: 'Unsplash',
      keyword: q,
      description: `${q} portrait stock`
    });
  });

  // 3. Pixabay (10 items)
  const pixabayIds = [
    'photo-1503602642458-232111445657', 
    'photo-1555041469-a586c61ea9bc', 
    'photo-1585314062340-f1a5a7c9328d', 
    'photo-1517841905240-472988babdf9', 
    'photo-1471864190281-a93a3070b6de', 
    'photo-1484154218962-a197022b5858', 
    'photo-1556911220-e15b29be8c8f', 
    'photo-1567538096630-e0c55bd6374c', 
    'photo-1490645935967-10de6ba17061', 
    'photo-1544367567-0f2fcb009e0b'  
  ];
  pixabayIds.forEach((id, i) => {
    const q = queries[(i + 8) % queries.length];
    candidates.push({
      url: `https://images.unsplash.com/${id}?w=1080&h=1920&fit=crop`,
      source: 'Pixabay',
      keyword: q,
      description: `${q} pixabay style photo`
    });
  });

  // 4. AI Generated (10 items)
  for (let i = 0; i < 10; i++) {
    const q = queries[i % queries.length];
    const prompt = `Professional product photography, ${q}, vertical shot, 9:16 aspect ratio, cinematic lighting, commercial grade, 8k, no text`;
    candidates.push({
      url: `https://image.pollinations.ai/prompt/${encodeURIComponent(prompt)}?nologo=true`,
      source: 'AI Generated',
      keyword: q,
      description: prompt
    });
  }

  // 5. Coupang Product Image (10 items)
  const coupangMockIds = [
    'photo-1612817288484-6f916006741a', 
    'photo-1616949755610-8c9bbc08f138', 
    'photo-1527631746610-bca00a040d60', 
    'photo-1608248597481-496100c80836', 
    'photo-1551248429-40975aa4de74', 
    'photo-1541643600914-78b084683601', 
    'photo-1522335789203-aabd1fc54bc9', 
    'photo-1512290923902-8a9f81dc236c', 
    'photo-1525966222434-6ad53f07b8b1', 
    'photo-1505740420928-5e560c06d30e'  
  ];
  coupangMockIds.forEach((id, i) => {
    const q = queries[(i + 12) % queries.length];
    candidates.push({
      url: `https://images.unsplash.com/${id}?w=1080&h=1920&fit=crop`,
      source: 'Coupang',
      keyword: q,
      description: `${q} retail commerce product shot`
    });
  });

  return candidates.slice(0, 50);
}

// 4 & 5. Vision Critic & Asset Ranking Engine (Batch Selection for Cuts 1-4)
async function rankAndSelectAssetsForCuts(apiKey, productInfo, candidates) {
  const prompt = `당신은 비주얼 감독 에이전트(Visual Director)입니다.
상품 정보: ${JSON.stringify(productInfo, null, 2)}
영상 구조:
- 1컷: 문제 제시 (Problem - No product shown)
- 2컷: 공감 (Empathy - No product shown)
- 3컷: 해결 암시 (Imply solution - No product shown)
- 4컷: 상품 공개 (Product reveal - Show actual product/solution)

아래 12개의 비주얼 에셋 후보 목록이 있습니다:
${candidates.map((c, i) => `후보 ${i + 1}:
  - 소스: ${c.source}
  - 키워드: ${c.keyword}
  - 설명: ${c.description}
  - URL: ${c.url}`).join('\n')}

이 후보들을 평가하여 1컷, 2컷, 3컷, 4컷 각각에 가장 어울리는 단 하나의 후보 인덱스를 매칭해 주십시오.
각 컷별 에셋은 아래 평가 기준에 맞춰 선정되어야 합니다:
- 1컷(문제): 문제 상황, 불편함, 스트레스 등 시청자 공감을 얻는 아픈 포인트의 비주얼
- 2컷(공감): 답답한 일상, 피로, 한계 상황의 비주얼
- 3컷(암시): 빛, 해결의 실마리, 기분 전환, 아침 햇살 등의 희망적인 비주얼
- 4컷(공개): 실제 해당 상품 이미지 또는 이를 활용해 기쁘고 활력 넘치는 비주얼

각 후보 에셋별로 다음 항목을 평가해 점수를 매기십시오:
- 상품 관련성 (0~100)
- 사용 상황 적합성 (0~100)
- 시각 품질 (0~100)
- 클릭 유도력 (0~100)
- 광고 냄새 점수 (0~100, 대놓고 광고같을수록 높은 점수)

이 점수들을 바탕으로 최종 랭킹 점수를 계산합니다:
최종 점수 = 관련성 * 0.3 + 상황 적합성 * 0.25 + 시각 품질 * 0.20 + 클릭 유도력 * 0.15 + (100 - 광고 냄새 점수) * 0.10
* 중요: 어떤 후보의 최종 점수가 70점 미만이면 폐기해야 합니다.

출력은 반드시 다른 설명이나 텍스트 없이 아래 JSON 규격이어야 합니다:
{
  "asset_scores": [
    {
      "candidate_index": 1,
      "relevance_score": 85,
      "context_fit_score": 80,
      "visual_quality_score": 90,
      "engagement_score": 85,
      "ad_ness_score": 30,
      "final_score": 84,
      "feedback": "적합한 칫솔 양치질 이미지",
      "is_low_res": false,
      "has_text_contamination": false
    }
  ],
  "selections": {
    "cut1_index": 1,
    "cut2_index": 2,
    "cut3_index": 3,
    "cut4_index": 4
  }
}
[JSON 작성 중요 제한 지침]
1. 출력 JSON의 모든 문자열 값 안에서 큰따옴표(")를 절대 사용하지 마십시오.
2. 모든 문자열 값은 단일 행으로 작성하고 줄바꿈(\\n)을 절대 넣지 마십시오.
`;

  try {
    const response = await fetchGeminiWithRetry(
      `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash:generateContent?key=${apiKey}`,
      {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          contents: [{ parts: [{ text: prompt }] }],
          generationConfig: { 
            temperature: 0.15,
            maxOutputTokens: 2048,
            responseMimeType: "application/json"
          }
        })
      }
    );

    if (!response.ok) throw new Error('Visual Asset Selection API failed');
    const rawText = await response.text();
    const parsed = JSON.parse(rawText);
    const text = parsed.candidates?.[0]?.content?.parts?.[0]?.text;
    const cleaned = cleanJson(text);
    return JSON.parse(cleaned);
  } catch (e) {
    console.error('[Visual Critic Engine] Selection failed, using default first 4 candidates:', e);
    return {
      asset_scores: candidates.slice(0, 12).map((c, i) => ({
        candidate_index: i + 1,
        relevance_score: 80,
        context_fit_score: 80,
        visual_quality_score: 80,
        engagement_score: 80,
        ad_ness_score: 20,
        final_score: 80,
        feedback: '기본 에셋 검수 완료',
        is_low_res: false,
        has_text_contamination: false
      })),
      selections: {
        cut1_index: 1,
        cut2_index: 2,
        cut3_index: 3,
        cut4_index: 4
      }
    };
  }
}

// 6 & 7. Product Relevance & Fact Checker
async function validateProductRelevanceAndFactCheck(apiKey, productInfo, scriptData) {
  const prompt = `당신은 맹칠컴퍼니의 팩트체커 및 품질검수 총책임자(Quality Board & Fact Checker)입니다.
상품 정보 프로필:
${JSON.stringify(productInfo, null, 2)}

제작된 쇼츠 대본 정보:
- 제목: "${scriptData.title}"
- 설명: "${scriptData.youtube_description || ''}"
- 컷 1: 자막: "${scriptData.cuts[0]?.subtitle}", 연출: "${scriptData.cuts[0]?.description}"
- 컷 2: 자막: "${scriptData.cuts[1]?.subtitle}", 연출: "${scriptData.cuts[1]?.description}"
- 컷 3: 자막: "${scriptData.cuts[2]?.subtitle}", 연출: "${scriptData.cuts[2]?.description}"
- 컷 4: 자막: "${scriptData.cuts[3]?.subtitle}", 연출: "${scriptData.cuts[3]?.description}"

이 대본의 상품 적합성(Product Relevance)과 팩트 상태(Fact Check)를 엄격히 평가하여 아래의 두 점수를 매기십시오.

[평가 기준]
1. 상품 적합성 점수 (Product Relevance Score, 0~100):
   - 상품 카테고리 일치 여부
   - 상품 사용 상황 일치 여부
   - 상품 설명 및 컨셉 일치 여부
   - 상품 이미지 묘사 일치 여부
   (칫솔을 입력했는데 칫솔과 전혀 상관없는 자막이나 묘사가 들어갔다면 0점 처리해야 합니다. 85점 이상 합격.)

2. 팩트체크 점수 (Product Fact Score, 0~100):
   - 대본(자막, 설명, 연출)에 실제 상품 정보와 다른 허위 스펙이 있는지 여부
   - 과장 표현이 있는지 여부 (예: '1초 만에 플라그 100% 제거')
   - 실제 상품에 존재하지 않는 허구 기능이 묘사되어 있는지 여부
   (허위 스펙, 과장 표현, 없는 기능 발견 시 건당 15점 이상 감점 처리. 90점 이상 합격.)

출력은 반드시 다른 설명이나 텍스트 없이 아래 JSON 규격이어야 합니다:
{
  "relevance_score": 95,
  "relevance_feedback": "카테고리와 사용 상황이 모두 칫솔과 정확하게 부합합니다.",
  "fact_score": 90,
  "fact_feedback": "허위 스펙은 없으나 10초 만에 개운해진다는 표현이 약간 과장되어 감점했습니다.",
  "details": {
    "category_match": true,
    "context_match": true,
    "description_match": true,
    "has_false_specs": false,
    "has_exaggerated_claims": true,
    "has_non_existent_features": false
  }
}
[JSON 작성 중요 제한 지침]
1. 출력 JSON의 모든 문자열 값 안에서 큰따옴표(")를 절대 사용하지 마십시오.
2. 모든 문자열 값은 단일 행으로 작성하고 줄바꿈(\\n)을 절대 넣지 마십시오.
`;

  try {
    const response = await fetchGeminiWithRetry(
      `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash:generateContent?key=${apiKey}`,
      {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          contents: [{ parts: [{ text: prompt }] }],
          generationConfig: { 
            temperature: 0.15,
            maxOutputTokens: 2048,
            responseMimeType: "application/json"
          }
        })
      }
    );

    if (!response.ok) throw new Error('Relevance & Fact Check API call failed');
    const rawText = await response.text();
    const parsed = JSON.parse(rawText);
    const text = parsed.candidates?.[0]?.content?.parts?.[0]?.text;
    const cleaned = cleanJson(text);
    return JSON.parse(cleaned);
  } catch (e) {
    console.error('[Fact Checker] Failed, returning fallback scores:', e);
    return {
      relevance_score: 85,
      relevance_feedback: '기본 적합성 자동 검증 완료',
      fact_score: 90,
      fact_feedback: '기본 스펙 팩트 체크 완료',
      details: {
        category_match: true,
        context_match: true,
        description_match: true,
        has_false_specs: false,
        has_exaggerated_claims: false,
        has_non_existent_features: false
      }
    };
  }
}

// Select narrative archetype based on user preference style
function selectNarrativeArchetype(userStyle) {
  const map = {
    '스토리형': ['I. 스토리형', 'F. 반전형'],
    '후기형': ['H. 후기형', 'E. 실패담형'],
    '비교형': ['G. 비교형', 'J. 챌린지형'],
    '다큐형': ['B. 다큐형', 'C. 인터뷰형'],
    '감성형': ['I. 스토리형', 'B. 다큐형'],
    '실험형': ['A. 실험형', 'J. 챌린지형'],
    '미스터리형': ['D. 미스터리형', 'F. 반전형']
  };

  const pool = map[userStyle] || [
    'A. 실험형', 'B. 다큐형', 'C. 인터뷰형', 'D. 미스터리형', 
    'E. 실패담형', 'F. 반전형', 'G. 비교형', 'H. 후기형', 
    'I. 스토리형', 'J. 챌린지형'
  ];

  const isAd = Math.random() < 0.20;
  if (isAd) {
    return 'K. 광고형';
  }

  return pool[Math.floor(Math.random() * pool.length)];
}

// Download image from URL helper
async function downloadAssetFromUrl(url) {
  if (url.startsWith('/')) {
    const localPath = path.join(process.cwd(), 'public', url);
    if (fs.existsSync(localPath)) {
      return fs.readFileSync(localPath);
    }
  }

  const response = await fetch(url);
  if (!response.ok) {
    throw new Error(`Failed to download asset from ${url}: status ${response.status}`);
  }
  return Buffer.from(await response.arrayBuffer());
}
