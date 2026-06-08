const fs = require('fs');
const path = require('path');

const targetPath = path.join(__dirname, '..', 'viewer-app', 'app', 'api', 'autopilot', 'route.js');
console.log('Reading from:', targetPath);

let content = fs.readFileSync(targetPath, 'utf8');

// Replacement 1
const target1 = `    console.log(\`[Autopilot] Target product: \${productTitle}\`);
    updateStatus('script_generation', '2단계: AI 대본 및 화면 연출 프롬프트 창작 중...', 30);

    // 2. Generate 4-cut script using Gemini or fallback (with retry loop for Quality Board audit)
    let scriptData = null;
    const apiKey = process.env.GEMINI_API_KEY;`;

const replacement1 = `    console.log(\`[Autopilot] Target product: \${productTitle}\`);

    let productInfo = null;
    let searchQueries = [];
    let candidateAssets = [];
    let assetSelection = null;
    let selectedAssetsForCuts = [];
    let selectedArchetype = '';
    let relevanceScore = 100;
    let factScore = 100;
    let relevanceFeedback = '';
    let factFeedback = '';
    const apiKey = process.env.GEMINI_API_KEY;

    if (isProductDriven && apiKey) {
      updateStatus('product_matching', '1단계: Product Understanding Agent 가동 중...', 12);
      productInfo = await runProductUnderstandingAgent(apiKey, productTitle, targetAudience);
      console.log('[Autopilot] Product Understanding completed:', JSON.stringify(productInfo));

      updateStatus('product_matching', '1단계: Search Query Generator 가동 중...', 15);
      searchQueries = await generateSearchQueries(apiKey, productTitle, productInfo);
      console.log('[Autopilot] Generated search queries count:', searchQueries.length);

      updateStatus('product_matching', '1단계: Multi-Source Asset Collector 가동 중...', 18);
      candidateAssets = await collectMultiSourceAssets(apiKey, productTitle, searchQueries);
      console.log('[Autopilot] Collected candidate assets count:', candidateAssets.length);

      updateStatus('product_matching', '1단계: Vision Asset Critic & Ranking Engine 가동 중...', 22);
      const top12Candidates = candidateAssets.slice(0, 12);
      assetSelection = await rankAndSelectAssetsForCuts(apiKey, productInfo, top12Candidates);
      console.log('[Autopilot] Ranked and selected assets selections:', JSON.stringify(assetSelection.selections));
      
      const selections = assetSelection.selections;
      selectedAssetsForCuts = [
        top12Candidates[selections.cut1_index - 1] || top12Candidates[0],
        top12Candidates[selections.cut2_index - 1] || top12Candidates[1],
        top12Candidates[selections.cut3_index - 1] || top12Candidates[2],
        top12Candidates[selections.cut4_index - 1] || top12Candidates[3]
      ];

      selectedArchetype = selectNarrativeArchetype(forcedParams.videoStyle || '스토리형');
      console.log('[Autopilot] Selected narrative archetype:', selectedArchetype);
    }

    updateStatus('script_generation', '2단계: AI 대본 및 화면 연출 프롬프트 창작 중...', 30);

    // 2. Generate 4-cut script using Gemini or fallback (with retry loop for Quality Board audit)
    let scriptData = null;`;

// Replacement 2
const target2 = `          scriptData = await generateScriptWithGemini(apiKey, productTitle, combinedGuidelines, isProductDriven, targetAudience, usedStyle);

          if (isProductDriven && scriptData && typeof scriptData.ad_score === 'number' && scriptData.ad_score > 50) {
            console.log(\`[Autopilot] Ad score \${scriptData.ad_score} > 50 detected. Rejecting script and forcing regeneration.\`);
            retryCount++;
            continue; // Force script regeneration loop
          }

          if (isProductDriven && scriptData) {
            const comp = checkProductCompliance(productTitle, scriptData);
            if (!comp.passed) {
              console.log(\`[Autopilot] Script product compliance failed. Rejecting script and forcing regeneration.\`);
              retryCount++;
              continue; // Force script regeneration loop
            }
          }`;

const replacement2 = `          scriptData = await generateScriptWithGemini(apiKey, productTitle, combinedGuidelines, isProductDriven, targetAudience, usedStyle, productInfo, selectedArchetype);

          if (isProductDriven && scriptData && typeof scriptData.ad_score === 'number' && scriptData.ad_score > 50) {
            console.log(\`[Autopilot] Ad score \${scriptData.ad_score} > 50 detected. Rejecting script and forcing regeneration.\`);
            retryCount++;
            continue; // Force script regeneration loop
          }

          if (isProductDriven && scriptData) {
            const comp = checkProductCompliance(productTitle, scriptData);
            if (!comp.passed) {
              console.log(\`[Autopilot] Script product compliance failed. Rejecting script and forcing regeneration.\`);
              retryCount++;
              continue; // Force script regeneration loop
            }

            console.log('[Autopilot] Running Product Relevance & Fact Checker...');
            updateStatus('script_generation', \`2단계: Product Relevance & Fact Checker 검수 중...\`, 35 + retryCount * 5);
            const valResult = await validateProductRelevanceAndFactCheck(apiKey, productInfo, scriptData);
            relevanceScore = valResult.relevance_score || 85;
            factScore = valResult.fact_score || 90;
            relevanceFeedback = valResult.relevance_feedback || '';
            factFeedback = valResult.fact_feedback || '';
            console.log(\`[Autopilot] Relevance Score: \${relevanceScore}, Fact Score: \${factScore}\`);

            if (relevanceScore < 85 || factScore < 90) {
              console.log(\`[Autopilot] Quality check failed (Relevance < 85 or Fact < 90). Rejecting script and forcing regeneration.\`);
              retryCount++;
              continue; // Force script regeneration loop
            }
          }`;

// Replacement 3
const target3 = `          try {
            const buffer = await downloadAiImage(cut.prompt);
            fs.writeFileSync(absolutePath, buffer);`;

const replacement3 = `          try {
            let buffer;
            if (isProductDriven && selectedAssetsForCuts && selectedAssetsForCuts[i]) {
              console.log(\`[Autopilot] Downloading pre-selected asset for Cut \${i + 1} from: \${selectedAssetsForCuts[i].url}\`);
              buffer = await downloadAssetFromUrl(selectedAssetsForCuts[i].url);
            } else {
              buffer = await downloadAiImage(cut.prompt);
            }
            fs.writeFileSync(absolutePath, buffer);`;

// Replacement 4
const target4 = `      // Save metadata for Product-Driven mode
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
    };`;

const replacement4 = `      // Save metadata for Product-Driven mode
      product_name: isProductDriven ? forcedParams.productName : productTitle,
      product_url: isProductDriven ? forcedParams.productUrl : '',
      coupang_link: isProductDriven ? forcedParams.coupangLink : affiliateLink,
      target_audience: isProductDriven ? forcedParams.targetAudience : '',
      video_style: isProductDriven ? forcedParams.videoStyle : usedStyle,
      ad_score: isProductDriven ? (scriptData.ad_score || 0) : 0,
      quality_score: Math.round(finalScoreAvg),
      upload_mode: isProductDriven ? 'product-driven' : 'archetype',
      pinned_comment_status: isProductDriven ? 'pending' : 'not_attempted',
      compliance: isProductDriven ? checkProductCompliance(forcedParams.productName, scriptData) : { passed: true, cutChecks: [] },
      
      // Save new intelligence system metrics
      product_relevance_score: isProductDriven ? relevanceScore : 100,
      product_fact_score: isProductDriven ? factScore : 100,
      asset_match_score: isProductDriven && assetSelection && assetSelection.asset_scores
        ? Math.round(assetSelection.asset_scores.reduce((sum, s) => sum + (s.final_score || 80), 0) / assetSelection.asset_scores.length)
        : 80,
      image_source: isProductDriven && selectedAssetsForCuts
        ? selectedAssetsForCuts.map(a => a.source).join(', ')
        : 'AI Generated',
      used_search_queries: isProductDriven && searchQueries
        ? searchQueries.slice(0, 5).join(', ')
        : 'default',
      revenue_score: isProductDriven ? Math.round(90 - (scriptData.ad_score || 0) * 0.2) : 75,
      hook_type: hookType
    };`;

function applyReplacement(desc, target, replacement) {
  if (!content.includes(target)) {
    console.error(`[Error] Target for "${desc}" not found in content!`);
    // Attempt normalized match
    const normalizedTarget = target.replace(/\r\n/g, '\n');
    const normalizedContent = content.replace(/\r\n/g, '\n');
    if (normalizedContent.includes(normalizedTarget)) {
      console.log(`[Success] Normalized match found for "${desc}"! Applying...`);
      content = normalizedContent.replace(normalizedTarget, replacement.replace(/\r\n/g, '\n'));
      return;
    }
    process.exit(1);
  }
  content = content.replace(target, replacement);
  console.log(`[Success] Replaced "${desc}"`);
}

applyReplacement('Replacement 1 (Insert intelligence steps)', target1, replacement1);
applyReplacement('Replacement 2 (Script Generator params & Relevance/Fact check retries)', target2, replacement2);
applyReplacement('Replacement 3 (Image downloader)', target3, replacement3);
applyReplacement('Replacement 4 (Save metadata to history.json)', target4, replacement4);

fs.writeFileSync(targetPath, content, 'utf8');
console.log('All replacements applied and saved successfully!');
