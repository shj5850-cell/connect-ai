import { NextResponse } from 'next/server';
import fs from 'fs';
import path from 'path';
import { updateDnaInfluenceScores } from '../../lib/dna_influence_engine';

const HISTORY_PATH = path.join(process.cwd(), 'public', 'shorts', 'history.json');
const ACCOUNT_PATH = path.join(process.cwd(), '..', '_company', '_agents', 'youtube', 'tools', 'youtube_account.json');

// Helper to fetch Gemini API Key
function getGeminiApiKey() {
  return process.env.GEMINI_API_KEY || '';
}

// GET handler: Return history.json data
export async function GET() {
  try {
    // Update DNA influence scores on each check
    updateDnaInfluenceScores();
    let history = [];
    if (fs.existsSync(HISTORY_PATH)) {
      try {
        history = JSON.parse(fs.readFileSync(HISTORY_PATH, 'utf-8'));
      } catch (e) {
        console.error('Failed to parse history.json:', e);
      }
    }
    
    // Read performance database
    let performanceList = [];
    const perfPath = path.join(process.cwd(), '..', '_company', '_shared', 'video_performance_db.json');
    if (fs.existsSync(perfPath)) {
      try {
        const db = JSON.parse(fs.readFileSync(perfPath, 'utf-8'));
        performanceList = db.video_performance || [];
      } catch (e) {
        console.error('Failed to parse video_performance_db.json:', e);
      }
    }

    // Read success DNA list
    let successDnaList = [];
    const successPath = path.join(process.cwd(), '..', '_company', '_shared', 'success_dna_db.json');
    if (fs.existsSync(successPath)) {
      try {
        const db = JSON.parse(fs.readFileSync(successPath, 'utf-8'));
        successDnaList = db.success_dna_list || [];
      } catch (e) {
        console.error('Failed to parse success_dna_db.json:', e);
      }
    }

    // Read failure DNA list
    let failureDnaList = [];
    const failurePath = path.join(process.cwd(), '..', '_company', '_shared', 'failure_dna_db.json');
    if (fs.existsSync(failurePath)) {
      try {
        const db = JSON.parse(fs.readFileSync(failurePath, 'utf-8'));
        failureDnaList = db.failure_dna_list || [];
      } catch (e) {
        console.error('Failed to parse failure_dna_db.json:', e);
      }
    }

    // Read revenue DNA list
    let revenueDnaList = [];
    const revenuePath = path.join(process.cwd(), '..', '_company', '_shared', 'revenue_dna_db.json');
    if (fs.existsSync(revenuePath)) {
      try {
        const db = JSON.parse(fs.readFileSync(revenuePath, 'utf-8'));
        revenueDnaList = db.revenue_dna_list || [];
      } catch (e) {
        console.error('Failed to parse revenue_dna_db.json:', e);
      }
    }

    // Compute Correlation statistics on the fly
    const correlationStats = computeCorrelationStats(performanceList);

    // Compute or read Daily Report
    const dailyReport = generateDailyReport(performanceList, successDnaList, failureDnaList, revenueDnaList);

    // Read growth metrics
    let growthMetrics = null;
    const intelDbPath = path.join(process.cwd(), '..', '_company', '_shared', 'agent_intelligence_db.json');
    if (fs.existsSync(intelDbPath)) {
      try {
        const db = JSON.parse(fs.readFileSync(intelDbPath, 'utf-8'));
        growthMetrics = db.agent_growth_metrics || {};
        
        // Calculate average metrics on the fly using realHistory (excluding mock and dry runs)
        const realHistory = history.filter(v => {
          if (v.isDryRun || v.youtubeVideoId === 'DRY_RUN') return false;
          if (v.isMockUpload || v.isMock || !v.youtubeVideoId || v.youtubeVideoId === 'MOCK_VIDEO_ID') return false;
          let countMetrics = 0;
          if (v.views > 0) countMetrics++;
          if (v.ctr > 0) countMetrics++;
          if (v.watch_time > 0 || v.retention > 0) countMetrics++;
          if (v.affiliate_clicks > 0 || v.clicks > 0) countMetrics++;
          return countMetrics >= 2;
        });

        const totalDiv = realHistory.reduce((acc, v) => acc + (v.diversity_score || 80), 0);
        growthMetrics.diversity_score_average = realHistory.length > 0
          ? parseFloat((totalDiv / realHistory.length).toFixed(1))
          : 80.0;

        // Novelty: unique styles in last 20 videos
        const recent = realHistory.slice(0, 20);
        const uniqueStyles = new Set(recent.map(v => v.used_style).filter(Boolean));
        growthMetrics.novelty_score_average = parseFloat(((uniqueStyles.size / 10) * 100).toFixed(1));

        // Experiment success rate: is_experiment === true and views >= 5000
        const experiments = realHistory.filter(v => v.is_experiment);
        if (experiments.length > 0) {
          const successfulExps = experiments.filter(v => (v.views || (v.postUploadAnalysis && v.postUploadAnalysis.views) || 0) >= 5000);
          growthMetrics.experiment_success_rate = parseFloat(((successfulExps.length / experiments.length) * 100).toFixed(1));
        } else {
          growthMetrics.experiment_success_rate = 66.7;
        }

        // Success DNA Reflection Rate: percentage of videos containing used_success_dna lists
        const withSuccessDna = realHistory.filter(v => v.used_success_dna && v.used_success_dna.length > 0);
        growthMetrics.success_dna_reflection_rate = realHistory.length > 0
          ? parseFloat(((withSuccessDna.length / realHistory.length) * 100).toFixed(1))
          : 0.0;

        // Revenue DNA Reflection Rate: percentage of videos containing used_revenue_dna lists
        const withRevenueDna = realHistory.filter(v => v.used_revenue_dna && v.used_revenue_dna.length > 0);
        growthMetrics.revenue_dna_reflection_rate = realHistory.length > 0
          ? parseFloat(((withRevenueDna.length / realHistory.length) * 100).toFixed(1))
          : 0.0;

        // Failure DNA Dominance: percentage of videos containing used_failure_dna lists
        const withFailureDna = realHistory.filter(v => v.used_failure_dna && v.used_failure_dna.length > 0);
        growthMetrics.failure_dna_dominance = realHistory.length > 0
          ? parseFloat(((withFailureDna.length / realHistory.length) * 100).toFixed(1))
          : 0.0;

        // 1. Split revenue DNA counts
        const realRevList = revenueDnaList.filter(v => v.is_mock !== true);
        const mockRevList = revenueDnaList.filter(v => v.is_mock === true);
        
        growthMetrics.real_revenue_dna_count = realRevList.length;
        growthMetrics.mock_revenue_dna_count = mockRevList.length;
        
        // 2. Calculate Diversity breakdowns based on real Revenue DNA
        if (realRevList.length > 0) {
          const uniqueCats = new Set(realRevList.map(v => v.category).filter(Boolean));
          const uniqueProds = new Set(realRevList.map(v => v.product_name).filter(Boolean));
          const uniqueHooks = new Set(realRevList.map(v => v.hook).filter(Boolean));
          const uniqueStyles = new Set(realRevList.map(v => v.style_dna).filter(Boolean));
          
          growthMetrics.rev_category_diversity = parseFloat(((uniqueCats.size / 12) * 100).toFixed(1));
          growthMetrics.rev_product_diversity = parseFloat(((uniqueProds.size / realRevList.length) * 100).toFixed(1));
          growthMetrics.rev_hook_diversity = parseFloat(((uniqueHooks.size / realRevList.length) * 100).toFixed(1));
          growthMetrics.rev_style_diversity = parseFloat(((uniqueStyles.size / realRevList.length) * 100).toFixed(1));
          
          growthMetrics.revenue_dna_diversity_score = parseFloat((
            (growthMetrics.rev_category_diversity + 
             growthMetrics.rev_product_diversity + 
             growthMetrics.rev_hook_diversity + 
             growthMetrics.rev_style_diversity) / 4
          ).toFixed(1));
        } else {
          growthMetrics.rev_category_diversity = 0.0;
          growthMetrics.rev_product_diversity = 0.0;
          growthMetrics.rev_hook_diversity = 0.0;
          growthMetrics.rev_style_diversity = 0.0;
          growthMetrics.revenue_dna_diversity_score = 0.0;
        }
        
        // 3. Overfitting Alert check (>= 50% representation in real Revenue DNA)
        growthMetrics.overfitting_warning = false;
        growthMetrics.overfit_category = '';
        
        if (realRevList.length > 0) {
          const catCounts = {};
          realRevList.forEach(v => {
            const cat = v.category || '기타';
            catCounts[cat] = (catCounts[cat] || 0) + 1;
          });
          
          let maxCount = 0;
          let maxCat = '';
          for (const cat in catCounts) {
            if (catCounts[cat] > maxCount) {
              maxCount = catCounts[cat];
              maxCat = cat;
            }
          }
          
          const ratio = maxCount / realRevList.length;
          if (ratio >= 0.5) {
            growthMetrics.overfitting_warning = true;
            growthMetrics.overfit_category = maxCat;
          }
        }
      } catch (e) {
        console.error('Failed to parse agent_intelligence_db.json:', e);
      }
    }

    // Read Style DNA list
    let styleDnaList = [];
    const styleDnaPath = path.join(process.cwd(), '..', '_company', '_shared', 'style_dna_db.json');
    if (fs.existsSync(styleDnaPath)) {
      try {
        const db = JSON.parse(fs.readFileSync(styleDnaPath, 'utf-8'));
        styleDnaList = db.style_dna_list || [];
      } catch (e) {
        console.error('Failed to parse style_dna_db.json:', e);
      }
    }

    return NextResponse.json({
      success: true,
      history,
      performanceList,
      successDnaList,
      failureDnaList,
      revenueDnaList,
      styleDnaList,
      correlationStats,
      dailyReport,
      growthMetrics
    });
  } catch (e) {
    return NextResponse.json({ success: false, error: e.message }, { status: 500 });
  }
}

// POST handler: actions for competitor_analysis, post_upload_analysis, and seed
export async function POST(req) {
  try {
    const body = await req.json();
    const { action } = body;
    const apiKey = getGeminiApiKey();

    if (action === 'seed') {
      const demoData = generateSeedHistoryData();
      fs.mkdirSync(path.dirname(HISTORY_PATH), { recursive: true });
      fs.writeFileSync(HISTORY_PATH, JSON.stringify(demoData, null, 2), 'utf-8');

      // Seed video_performance_db.json with full revenue attributes
      const perfPath = path.join(process.cwd(), '..', '_company', '_shared', 'video_performance_db.json');
      const seededPerfList = [];
      for (const item of demoData) {
        if (item.postUploadAnalysis) {
          const preScores = item.preUploadAnalysis?.scores || { hookStrength: 75, scriptContent: 75, sceneVisuals: 75, subtitleAesthetics: 75, soundDesign: 75 };
          const avgScore = (preScores.hookStrength + preScores.scriptContent + preScores.sceneVisuals + preScores.subtitleAesthetics + preScores.soundDesign) / 5.0;
          const views = item.postUploadAnalysis.views;
          
          // Generate realistic CTR
          const ctr = parseFloat((3.5 + Math.random() * 8.5 + (avgScore >= 80 ? 3.0 : 0)).toFixed(1));
          const productName = item.productTitle || '상품명 없음';
          
          const production_cost = 1000;
          const ad_revenue = Math.round(views * 1.5 / 1000);
          const affiliate_clicks = Math.round(views * (ctr / 100));
          const affiliate_conversions = Math.round(affiliate_clicks * 0.12);
          const product_price = getProductPrice(productName);
          const affiliate_revenue = Math.round(affiliate_conversions * product_price * 0.03);
          const total_revenue = ad_revenue + affiliate_revenue;
          const net_profit = total_revenue - production_cost;
          const roi = parseFloat(((net_profit / production_cost) * 100).toFixed(1));

          const ctrNormalized = Math.min(1, ctr / 10);
          const convNormalized = Math.min(1, 12 / 12);
          const revenueNormalized = Math.min(1, total_revenue / 50000);
          const money_score = parseFloat(((ctrNormalized * 30) + (convNormalized * 30) + (revenueNormalized * 40)).toFixed(1));

          // Sync back to history item as well
          item.ctr = ctr;
          item.subscribers_gained = Math.floor(views * 0.002);
          if (item.postUploadAnalysis) {
            item.postUploadAnalysis.ctr = ctr;
            item.postUploadAnalysis.subscribers_gained = item.subscribers_gained;
          }

          seededPerfList.push({
            video_id: item.id,
            title: item.scriptData?.title || '제목 없음',
            product_name: productName,
            quality_score: parseFloat(avgScore.toFixed(1)),
            hook_score: preScores.hookStrength,
            visual_score: preScores.sceneVisuals,
            subtitle_score: preScores.subtitleAesthetics,
            sound_score: preScores.soundDesign,
            views,
            ctr,
            retention: item.postUploadAnalysis.avgRetention,
            likes: item.postUploadAnalysis.likeRate,
            comments: item.postUploadAnalysis.commentCount,
            subscribers_gained: item.subscribers_gained,
            production_cost,
            ad_revenue,
            affiliate_clicks,
            affiliate_conversions,
            affiliate_revenue,
            total_revenue,
            net_profit,
            roi,
            money_score,
            style_dna: item.style_dna || 'Motivation',
            is_experiment: item.is_experiment || false,
            is_mock: item.is_mock || false
          });
        }
      }
      
      // Update history with synced metrics
      fs.writeFileSync(HISTORY_PATH, JSON.stringify(demoData, null, 2), 'utf-8');
      fs.writeFileSync(perfPath, JSON.stringify({ video_performance: seededPerfList }, null, 2), 'utf-8');
      
      // Sync DNA database
      runDnaExtraction(seededPerfList);
      runRevenueDnaExtraction(seededPerfList);
      runStyleDnaExtraction(seededPerfList);

      // Calculate DNA Influence Scores
      updateDnaInfluenceScores();

      return NextResponse.json({ success: true, history: demoData });
    }

    if (!apiKey) {
      return NextResponse.json({ success: false, error: 'GEMINI_API_KEY가 구성되지 않았습니다.' }, { status: 400 });
    }

    if (action === 'competitor_analysis') {
      const { topic, currentVideoId } = body;
      if (!topic) {
        return NextResponse.json({ success: false, error: 'topic 파라미터가 필요합니다.' }, { status: 400 });
      }

      // Load current video details if currentVideoId is provided
      let currentVideo = null;
      if (currentVideoId && fs.existsSync(HISTORY_PATH)) {
        const history = JSON.parse(fs.readFileSync(HISTORY_PATH, 'utf-8'));
        currentVideo = history.find(v => v.id === currentVideoId) || null;
      }

      const report = await runCompetitorAnalysis(apiKey, topic, currentVideo);
      return NextResponse.json({ success: true, data: report });
    }

    if (action === 'post_upload_analysis') {
      const { id } = body;
      if (!id) {
        return NextResponse.json({ success: false, error: '비디오 ID가 필요합니다.' }, { status: 400 });
      }

      if (!fs.existsSync(HISTORY_PATH)) {
        return NextResponse.json({ success: false, error: '영상 보관함 데이터베이스가 존재하지 않습니다.' }, { status: 404 });
      }

      const history = JSON.parse(fs.readFileSync(HISTORY_PATH, 'utf-8'));
      const itemIndex = history.findIndex(item => item.id === id);
      if (itemIndex === -1) {
        return NextResponse.json({ success: false, error: `ID ${id}의 영상을 찾을 수 없습니다.` }, { status: 404 });
      }

      const videoItem = history[itemIndex];
      
      // Calculate realistic metrics (tied to the pre-upload evaluation scores for high-fidelity behavior!)
      const preScores = videoItem.preUploadAnalysis?.scores || { hookStrength: 50, scriptContent: 50, sceneVisuals: 50, subtitleAesthetics: 50, soundDesign: 50 };
      
      // We skew views based on pre-upload scores
      const scoreSum = preScores.hookStrength * 2.0 + preScores.scriptContent * 1.0 + preScores.sceneVisuals * 0.8 + preScores.subtitleAesthetics * 0.6 + preScores.soundDesign * 0.6;
      const scoreAvg = scoreSum / 5.0; // Weighted average

      // Mock generation of performance based on how good the scores were
      let views = 0;
      let likeRate = 0;
      let commentCount = 0;
      let avgRetention = 0;

      if (scoreAvg >= 80) {
        // High quality
        views = Math.floor(10000 + Math.random() * 90000);
        likeRate = parseFloat((5.5 + Math.random() * 6.5).toFixed(1)); // 5.5% ~ 12%
        commentCount = Math.floor(views * (0.005 + Math.random() * 0.015));
        avgRetention = Math.floor(75 + Math.random() * 18); // 75% ~ 93%
      } else if (scoreAvg >= 60) {
        // Medium quality
        views = Math.floor(1500 + Math.random() * 8500);
        likeRate = parseFloat((3.0 + Math.random() * 4.0).toFixed(1)); // 3% ~ 7%
        commentCount = Math.floor(views * (0.002 + Math.random() * 0.008));
        avgRetention = Math.floor(50 + Math.random() * 25); // 50% ~ 75%
      } else {
        // Low quality
        views = Math.floor(100 + Math.random() * 1400);
        likeRate = parseFloat((1.0 + Math.random() * 2.5).toFixed(1)); // 1% ~ 3.5%
        commentCount = Math.floor(views * (0.001 + Math.random() * 0.004));
        avgRetention = Math.floor(25 + Math.random() * 25); // 25% ~ 50%
      }

      // Run AI comparison and post-upload analysis
      const analysisResult = await runPostUploadAIAnalysis(apiKey, videoItem, {
        views,
        likeRate,
        commentCount,
        avgRetention
      });

      // Update database record
      videoItem.views = views;
      videoItem.likeRate = likeRate;
      videoItem.commentCount = commentCount;
      videoItem.avgRetention = avgRetention;
      videoItem.successFactors = analysisResult.successFactors || '';
      videoItem.failureFactors = analysisResult.failureFactors || '';
      videoItem.postUploadAnalysis = {
        views,
        likeRate,
        commentCount,
        avgRetention,
        evaluated_at: new Date().toISOString(),
        comparisonReport: analysisResult.comparisonReport || '',
        successFactors: analysisResult.successFactors || '',
        failureFactors: analysisResult.failureFactors || '',
        answers: analysisResult.answers || {}
      };

      history[itemIndex] = videoItem;
      fs.writeFileSync(HISTORY_PATH, JSON.stringify(history, null, 2), 'utf-8');

      // Save to video_performance_db.json (calculates DNA pools and correlations automatically)
      const ctr = parseFloat((2.5 + Math.random() * 8.5 + (scoreAvg >= 80 ? 3.0 : 0)).toFixed(1));
      const subscribers_gained = Math.floor(views * 0.002);
      
      videoItem.ctr = ctr;
      videoItem.subscribers_gained = subscribers_gained;
      if (videoItem.postUploadAnalysis) {
        videoItem.postUploadAnalysis.ctr = ctr;
        videoItem.postUploadAnalysis.subscribers_gained = subscribers_gained;
      }
      
      history[itemIndex] = videoItem;
      fs.writeFileSync(HISTORY_PATH, JSON.stringify(history, null, 2), 'utf-8');

      saveToPerformanceDb(videoItem, {
        views,
        likeRate,
        commentCount,
        avgRetention,
        ctr,
        subscribers_gained
      });

      return NextResponse.json({ success: true, item: videoItem });
    }

    return NextResponse.json({ success: false, error: '지원하지 않는 action입니다.' }, { status: 400 });

  } catch (e) {
    console.error('[Learning API] Error:', e);
    return NextResponse.json({ success: false, error: e.message }, { status: 500 });
  }
}

// Generate 24 highly realistic history records to seed the database
function generateSeedHistoryData() {
  const seedItems = [];
  const baseTime = Date.now();
  
  const EXPERIMENT_CATEGORIES = ['AI', '커피', '반려견', '청소업', '투자', '미스터리', '백룸', '생활꿀팁'];
  const EXPERIMENT_MAP = {
    'AI': { product: 'AI 자동화 마스터 클래스 수강권', keyword: 'AI 자동화', topic: 'AI' },
    '커피': { product: '가성비 홈카페 에스프레소 머신', keyword: '홈카페 레시피', topic: '커피' },
    '반려견': { product: '유기농 저알러지 강아지 사료', keyword: '반려견 행동 훈련', topic: '반려견' },
    '청소업': { product: '친환경 무선 스팀 물걸레 청소기', keyword: '청소 꿀팁', topic: '청소업' },
    '투자': { product: '주식 초보자를 위한 밸류에이션 차트북', keyword: '투자 포트폴리오', topic: '투자' },
    '미스터리': { product: '세계 미스터리 & 음모론 백과사전', keyword: '미스터리 스토리', topic: '미스터리' },
    '백룸': { product: '백룸 괴담 단편 소설집', keyword: '도시 전설 백룸', topic: '백룸' },
    '생활꿀팁': { product: '다이소 가성비 리빙 정리 수납함', keyword: '생활 속 꿀팁', topic: '생활꿀팁' }
  };

  // Generate 24 records (each category appears twice)
  for (let i = 0; i < 24; i++) {
    const timestamp = (baseTime - i * 24 * 3600 * 1000).toString();
    const cat = EXPERIMENT_CATEGORIES[i % 12];
    const mapped = EXPERIMENT_MAP[cat];
    
    const productTitle = mapped.product;
    const topic = mapped.topic;
    const title = `${mapped.topic} 관련 수익화 영상 기획`;
    
    const cuts = [
      { subtitle: `${mapped.topic} 꿀팁! 당신이 놓치고 있던 이것! 👀`, description: '모던 데스크 위 연출 샷', prompt: `Professional photorealistic photography, ${mapped.topic} workspace concept, vertical 9:16`, keywords: '꿀팁', duration: 5 },
      { subtitle: '지금 바로 실행해보면 알 수 있습니다.', description: '설명', prompt: 'Prompt', keywords: '키워드', duration: 5 },
      { subtitle: '강력한 자동화 파이프라인 구축 비법.', description: '설명', prompt: 'Prompt', keywords: '키워드', duration: 5 },
      { subtitle: '지금 고정 댓글 링크를 확인하세요! 💰', description: '설명', prompt: 'Prompt', keywords: '키워드', duration: 5 }
    ];

    const preScores = {
      hookStrength: Math.floor(65 + (i * 2.5) % 30),
      scriptContent: Math.floor(70 + (i * 1.8) % 25),
      sceneVisuals: Math.floor(60 + (i * 2.1) % 35),
      subtitleAesthetics: Math.floor(65 + (i * 1.5) % 25),
      soundDesign: Math.floor(70 + (i * 1.2) % 20)
    };

    const preUploadAnalysis = {
      scores: preScores,
      evaluations: {
        hookStrength: `도입부 컷의 문장과 연출이 호기심을 유발하기에 ${preScores.hookStrength >= 80 ? '아주 훌륭함' : '다소 약하며 보완이 요구됨'}.`,
        scriptContent: `대본의 논리 구조와 정보전달력이 ${preScores.scriptContent >= 80 ? '아주 자연스럽고 부드러움' : '설명 위주로 템포가 처짐'}.`,
        sceneVisuals: `장면 연출 설명 및 이미지 프롬프트 상태가 ${preScores.sceneVisuals >= 80 ? '시각적으로 극적이고 매력적임' : '평이하고 대조가 부족함'}.`,
        subtitleAesthetics: `모바일 최적화 자막 위치와 가독성이 ${preScores.subtitleAesthetics >= 80 ? '매우 양호함' : '글자 수가 길어 가독성 저하됨'}.`,
        soundDesign: `BGM 매칭이 ${preScores.soundDesign >= 80 ? '작품의 긴장감 형성에 아주 적합함' : '평범한 사운드로 평이함'}.`
      },
      answers: {
        q1_hook_stop: `도입부의 '${cuts[0].subtitle}' 질문이 타겟 유저의 문제 인식을 자극하여 스크롤을 멈춤.`,
        q2_dropoff: `2번째 컷 설명 조에서 다소 흐름이 늘어나 템포 저하로 시청자 이탈 우려 있음.`,
        q3_diff_from_viral: `1. 평균 컷 전환 길이(우리 5초 vs 인기 2.5초)\n2. 자막 강조 이모지 및 색상 차이\n3. 초반 이미지 연출의 인물 클로즈업 부족.`,
        q4_must_fix: `첫 번째 컷의 도입부 후킹 문장을 단조로운 설명에서 질문형/충격제시형으로 개정할 것.`,
        q5_expected_views: Math.floor(1000 + preScores.hookStrength * 80),
        q6_multiplier_10x: `도입부에 극적인 이미지 연출을 결합하고, 2초 전환 컷 템포로 재구성해야 함.`
      }
    };

    const isAnalyzed = i >= 4;
    let postUploadAnalysis = null;
    let views = 0;
    let likeRate = 0;
    let commentCount = 0;
    let avgRetention = 0;
    let successFactors = '';
    let failureFactors = '';

    if (isAnalyzed) {
      const isLucky = (i % 3 === 0);
      views = isLucky ? Math.floor(12000 + Math.random() * 85000) : Math.floor(150 + Math.random() * 2800);
      likeRate = isLucky ? parseFloat((6.5 + Math.random() * 5.0).toFixed(1)) : parseFloat((1.2 + Math.random() * 2.5).toFixed(1));
      commentCount = Math.floor(views * (isLucky ? 0.008 : 0.002));
      avgRetention = isLucky ? Math.floor(75 + Math.random() * 15) : Math.floor(25 + Math.random() * 25);
      
      successFactors = isLucky ? '첫 컷 후킹 카피와 비주얼 연출 일치도가 아주 우수하여 시청 지속 시간이 길어졌음.' : 'BGM 매칭은 적절했음.';
      failureFactors = !isLucky ? '첫 문장이 상품 설명형으로 들어가 1초 이탈률이 70%에 달함. 템포가 느림.' : '없음';

      postUploadAnalysis = {
        views,
        likeRate,
        commentCount,
        avgRetention,
        evaluated_at: new Date(parseInt(timestamp)).toISOString(),
        comparisonReport: `### 📊 예상 vs 실제 비교 리포트
- **실제 조회수**: ${views.toLocaleString()}회
- **성과 요약**: 사전 예측한 후킹 점수(${preScores.hookStrength}점)와 대본 템포가 실제 성과에 ${isLucky ? '적절히 작용하여 떡상함' : '이탈로 연결되어 저조함'}.`,
        successFactors,
        failureFactors,
        answers: {
          q1_hook_stop: isLucky ? '도입부의 파이프라인/비밀 카피가 시청자를 잡아둠' : '첫 자막이 지루하여 멈추지 못하고 이탈함',
          q2_dropoff: '2번째 컷 설명 나레이션 구간에서 긴장감 저하로 이탈',
          q3_diff_from_viral: '1. 전환 템포(우리 5초 vs 인기 2초)\n2. 자막의 이모지 활용 부재\n3. 강력한 페인포인트 부족',
          q4_must_fix: '대본 2번째 컷의 지루한 설명을 질문형으로 수정할 것',
          q5_expected_views: `실제 ${views.toLocaleString()}회 기록.`,
          q6_multiplier_10x: '첫 컷의 대본 문구의 후킹 강도를 높이고, 자막 강조 효과를 추가할 것.'
        }
      };
    }

    const seedDiversity = Math.floor(Math.random() * 18) + 72;
    seedItems.push({
      id: timestamp,
      videoUrl: '/shorts/test_video_output.mp4',
      youtubeVideoId: `MOCK_YT_${timestamp}`,
      isMockUpload: true,
      uploadMessage: '시뮬레이션 업로드 완료',
      productTitle,
      affiliateLink: `https://link.coupang.com/a/mock_${timestamp}`,
      commentText: `오늘 영상에서 활약한 [${productTitle}] 최저가 좌표입니다 ➔ https://link.coupang.com/a/mock_${timestamp}`,
      created_at: new Date(parseInt(timestamp)).toISOString(),
      scriptData: {
        title,
        cuts
      },
      topic,
      category: cat,
      preUploadAnalysis,
      postUploadAnalysis,
      views,
      likeRate,
      commentCount,
      avgRetention,
      successFactors,
      failureFactors,
      selfImprovementApplied: i > 0,
      diversity_score: seedDiversity,
      similarity_score: 100 - seedDiversity,
      style_dna: ['Luxury Tech', 'Emotional', 'Motivation', 'Curiosity'][i % 4],
      used_style: ['Photorealistic', 'Cinematic', 'Documentary', 'Anime'][i % 4],
      hook_type: ['호기심형', '비밀형', '충격형', '비교형'][i % 4],
      shot_pattern: 'C형 (균등형)',
      is_experiment: i % 5 === 0,
      custom_font: 'Pretendard-Bold',
      custom_caption_style: 'minimal',
      custom_caption_position: 'bottom',
      used_success_dna: i > 4 && seedItems.find((x, idx) => idx < i && x.views >= 5000)
        ? [{ id: seedItems.find((x, idx) => idx < i && x.views >= 5000).id, title: seedItems.find((x, idx) => idx < i && x.views >= 5000).productTitle }]
        : [{ id: '1780017500042', title: 'M3 맥북으로 AI 수익화 시작하는 법' }],
      used_failure_dna: i > 4 && seedItems.find((x, idx) => idx < i && x.views < 5000 && x.views > 0)
        ? [{ id: seedItems.find((x, idx) => idx < i && x.views < 5000 && x.views > 0).id, title: seedItems.find((x, idx) => idx < i && x.views < 5000 && x.views > 0).productTitle }]
        : [{ id: '1780103900042', title: '노트북 하나로 월 100만원 버는 법' }],
      used_revenue_dna: i > 4 && seedItems.find((x, idx) => idx < i && x.views >= 300)
        ? [{ id: seedItems.find((x, idx) => idx < i && x.views >= 300).id, title: seedItems.find((x, idx) => idx < i && x.views >= 300).productTitle }]
        : [{ id: '1780017500042', title: 'M3 맥북으로 AI 수익화 시작하는 법' }],
      used_agent_lessons: [
        { agent: i % 2 === 0 ? "hook_specialist" : "vision_critic", lesson: i % 2 === 0 ? "hook_specialist 관련 성공 요인 분석 결과 획득" : "vision_critic 관련 성공 요인 분석 결과 획득" }
      ],
      is_mock: true,
      source: "seed_test"
    });
  }

  return seedItems;
}

// 1. Competitor learning generator (Simulates/fetches 20 popular shorts and extracts patterns)
async function runCompetitorAnalysis(apiKey, topic, currentVideo) {
  // Gathers 20 mock/scraped viral shorts information based on the topic
  const competitorShorts = generateCompetitorShortsPool(topic);
  const dataText = competitorShorts.map((s, idx) => 
    `${idx + 1}. 제목: "${s.title}" | 채널: ${s.channel} | 조회수: ${s.views.toLocaleString()}회 | 후킹 오프닝: "${s.hook}" | 컷수: ${s.cuts} | 평균 컷 길이: ${s.avgCutLength}초 | 자막: ${s.subtitleStyle} | CTA: ${s.ctaStyle}`
  ).join('\n');

  let currentVideoDetails = '현재 등록된 비교 영상 없음';
  if (currentVideo) {
    const scores = currentVideo.preUploadAnalysis?.scores || { hookStrength: 50, scriptContent: 50, sceneVisuals: 50, subtitleAesthetics: 50, soundDesign: 50 };
    currentVideoDetails = `
- 제목: "${currentVideo.scriptData?.title || '제목 없음'}"
- 첫 컷 자막(후킹): "${currentVideo.scriptData?.cuts?.[0]?.subtitle || '없음'}"
- 5대 요소 평가 점수: 후킹 강도 ${scores.hookStrength}점, 대본 분석 ${scores.scriptContent}점, 장면 분석 ${scores.sceneVisuals}점, 자막 분석 ${scores.subtitleAesthetics}점, 사운드 분석 ${scores.soundDesign}점
`;
  }

  const prompt = `당신은 쇼츠 연구소 책임자(Researcher)입니다.
당신의 임무는 업로드된 동일 주제의 인기 쇼츠 20개의 데이터를 분석하여 바이럴 패턴을 추출하고, 현재 우리의 쇼츠와 비교 분석하여 10배 성장시킬 수 있는 개선안을 작성하는 것입니다.
칭찬하지 마십시오. 오직 단점과 문제점만 찾으십시오.
주관적 감정보다는 데이터와 수치 패턴을 우선으로 판단하십시오.

[분석할 인기 쇼츠 20개 데이터]
주제: ${topic}
${dataText}

[우리의 현재 영상 정보]
${currentVideoDetails}

다음 항목을 철저히 분석하여 마크다운 형태의 JSON 데이터로 출력하십시오:
1. 제목 패턴: 조회수 높은 영상들이 공통으로 쓰는 썸네일/제목 구조 분석
2. 후킹 문장 패턴: 첫 1~3초 시청자를 멈추게 한 문장 구조의 특징 분석
3. 평균 컷 길이: 이상적인 컷 전환 템포 분석
4. 자막 스타일: 가독성과 시선 집중도가 높은 자막 스타일 특징
5. 화면 구성: 시각적 다양성 및 시선 집중 방식
6. 감정 흐름: 초반 호기심부터 후반까지의 감정 자극 순서
7. CTA 방식: 고정댓글이나 시청 완료를 유도하는 방법

출력은 반드시 다른 텍스트 없이 아래 JSON 규격이어야 합니다:
{
  "averages": {
    "viewCount": 780000,
    "cutLength": 2.4,
    "hookScore": 87,
    "scriptScore": 84,
    "sceneScore": 89,
    "subtitleScore": 86,
    "soundScore": 82
  },
  "patterns": {
    "title": "인기 영상 제목 패턴 분석 내용 (1~2줄)",
    "hook": "인기 영상 후킹 문장 패턴 분석 내용 (1~2줄)",
    "cutLength": "평균 컷 길이 특징 분석 내용 (1~2줄)",
    "subtitleStyle": "자막 스타일 패턴 분석 내용 (1~2줄)",
    "screenComposition": "화면 구성 패턴 분석 내용 (1~2줄)",
    "emotionFlow": "감정 흐름 패턴 분석 내용 (1~2줄)",
    "ctaMethod": "CTA 방식 패턴 분석 내용 (1~2줄)"
  },
  "comparison": {
    "differenceAnalysis": [
      "인기 영상 대비 우리 영상의 차이점 1 (첫 문장이 약함, 궁금증 부족 등)",
      "인기 영상 대비 우리 영상의 차이점 2",
      "인기 영상 대비 우리 영상의 차이점 3"
    ],
    "improvementBrief": "조회수를 10배 끌어올리기 위해 당장 대본 및 비주얼에서 개선해야 하는 구체적인 가이드라인 (1~2문장)"
  },
  "rawReportMarkdown": "여기에 전체 분석 보고서를 마크다운 텍스트로 자세하게 작성하십시오. '너는 쇼츠 연구소 책임자다. 칭찬하지 마라.' 라는 어조를 유지하며, 조회수를 10배 올리기 위해 뜯어고쳐야 할 항목을 냉정히 분석하십시오."
}`;

  try {
    const response = await fetch(
      `https://generativelanguage.googleapis.com/v1beta/models/gemini-flash-latest:generateContent?key=${apiKey}`,
      {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          contents: [{ parts: [{ text: prompt }] }],
          generationConfig: { 
            temperature: 0.3,
            maxOutputTokens: 2048,
            responseMimeType: "application/json"
          }
        })
      }
    );

    if (!response.ok) {
      throw new Error(`Gemini API competitor analysis failed: ${response.statusText}`);
    }

    const resJson = await response.json();
    const text = resJson.candidates?.[0]?.content?.parts?.[0]?.text;
    if (!text) throw new Error('Empty response for competitor analysis');
    
    const cleaned = text.replace(/```json/g, '').replace(/```/g, '').trim();
    return JSON.parse(cleaned);
  } catch (e) {
    console.error('Gemini competitor analysis failed, falling back to mock report:', e);
    return {
      averages: { viewCount: 450000, cutLength: 2.5, hookScore: 85, scriptScore: 80, sceneScore: 85, subtitleScore: 80, soundScore: 80 },
      patterns: { title: '질문형 혹은 즉각적인 수치 제시형', hook: '방구석, 비밀, 연봉 등 자극적 키워드 사용', cutLength: '3초 미만의 빠른 전환 템포', subtitleStyle: '화면 정중앙 위치 및 강조형 단어 색상 변화', screenComposition: '인물 바스트 샷 및 클로즈업 중심', emotionFlow: '의구심 유발 -> 해법 제시 -> 긴장감 유도', ctaMethod: '고정 댓글 확인을 유도하는 짧은 음성 멘트 및 자막' },
      comparison: {
        differenceAnalysis: ['첫 문장의 후킹력이 약하여 멈출 이유가 부족함', '템포가 다소 늘어져 이탈률이 높음', '자막의 모바일 시각 유도 요소가 부족함'],
        improvementBrief: '도입부 1초를 강렬한 의구심 유발 문구로 변경하고, 컷 전환 주기를 2초 내외로 좁힐 것.'
      },
      rawReportMarkdown: `### 🔭 쇼츠 연구소 인기 영상 20개 패턴 보고서 (${topic})
- **인기 평균 컷 길이**: 2.5초
- **핵심 차이점**:
  1. 첫 문장에서 호기심이나 손실 회피 심리를 자극하지 못함.
  2. 화면 전환 템포가 느리고 비주얼 충격도가 약해 시청자가 멈추지 않고 지나감.
  3. 자막 디자인이 밋밋하여 시선 집중을 잡지 못함.
- **개선안**: 조회수 10배 성장을 위해서는 BGM 볼륨 밸런스를 튜닝하고 대본 첫 줄을 완전 질문형으로 바꾸십시오.`
    };
  }
}

// 2. Post-Upload AI analytics generator (expected vs actual comparison)
async function runPostUploadAIAnalysis(apiKey, videoItem, actualMetrics) {
  const preScores = videoItem.preUploadAnalysis?.scores || { hookStrength: 50, scriptContent: 50, sceneVisuals: 50, subtitleAesthetics: 50, soundDesign: 50 };
  const preEvaluations = videoItem.preUploadAnalysis?.evaluations || { hookStrength: '없음', scriptContent: '없음', sceneVisuals: '없음', subtitleAesthetics: '없음', soundDesign: '없음' };
  
  const prompt = `당신은 쇼츠 연구소 책임자(Researcher)입니다.
당신의 미션은 이 쇼츠 영상의 업로드 전 '예상 성과 평가'와 업로드 후 '실제 성과 지표'를 정밀 비교하여, 왜 잘 되었는지 혹은 왜 실패했는지 그 원인을 냉정하게 찾아내고, 성공 공식/실패 원인을 정형화하여 다음 영상 개선책을 도출하는 것입니다.
칭찬하지 마십시오. 문제점을 찾으십시오.
모든 결과는 점수화하십시오. 주관적 감상보다 데이터와 패턴을 우선합니다.

[영상 상세 정보]
- 제목: ${videoItem.scriptData?.title || '제목 없음'}
- 상품명: ${videoItem.productTitle}

[업로드 전 예상 성과 평가]
- 후킹 강도 점수: ${preScores.hookStrength}점 (평가: ${preEvaluations.hookStrength})
- 대본 분석 점수: ${preScores.scriptContent}점 (평가: ${preEvaluations.scriptContent})
- 장면 분석 점수: ${preScores.sceneVisuals}점 (평가: ${preEvaluations.sceneVisuals})
- 자막 분석 점수: ${preScores.subtitleAesthetics}점 (평가: ${preEvaluations.subtitleAesthetics})
- 사운드 분석 점수: ${preScores.soundDesign}점 (평가: ${preEvaluations.soundDesign})

[업로드 후 실제 성과 지표]
- 실제 조회수: ${actualMetrics.views.toLocaleString()}회
- 실제 좋아요율: ${actualMetrics.likeRate}%
- 실제 댓글수: ${actualMetrics.commentCount}개
- 실제 평균 시청 지속률: ${actualMetrics.avgRetention}%

다음 6가지 핵심 질문에 대해 냉철하게 답하고, 성공 공식(조회수가 높을 경우) 혹은 실패 요인(조회수가 낮을 경우)을 추출하여 마크다운 보고서와 함께 JSON으로 출력하십시오:
1. 왜 이 영상은 시청자가 멈췄는가? (도입부 후크 분석)
2. 왜 이 영상은 이탈했는가? (이탈 시점 및 요소 지적)
3. 인기 쇼츠와 비교했을 때 가장 큰 차이 3개는 무엇인가?
4. 다음 영상에서 반드시 수정해야 하는 요소는 무엇인가?
5. 현재 영상의 예상 조회수 대비 실제 성과는 어떠한가?
6. 조회수를 10배 올리려면 무엇을 바꿔야 하는가?

출력은 반드시 다른 텍스트 없이 아래 JSON 규격이어야 합니다:
{
  "successFactors": "성공 요인 (조회수가 준수할 경우 구체적 성공 포인트 기술, 없으면 '없음')",
  "failureFactors": "실패 요인 (조회수가 저조하거나 지표 이탈이 많을 때 구체적 요인 기술, 없으면 '없음')",
  "comparisonReport": "마크다운 형식의 상세 예상 vs 실제 비교 리포트 텍스트 (칭찬 배제, 독설적 연구소장 어조)",
  "answers": {
    "q1_hook_stop": "멈춘 이유 분석",
    "q2_dropoff": "이탈한 이유 분석",
    "q3_diff_from_viral": "인기 쇼츠 대비 차이점 3가지",
    "q4_must_fix": "반드시 수정할 요소",
    "q5_expected_views": "조회수 분석 피드백",
    "q6_multiplier_10x": "조회수 10배 성장을 위한 해결책"
  }
}`;

  try {
    const response = await fetch(
      `https://generativelanguage.googleapis.com/v1beta/models/gemini-flash-latest:generateContent?key=${apiKey}`,
      {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          contents: [{ parts: [{ text: prompt }] }],
          generationConfig: { 
            temperature: 0.25,
            maxOutputTokens: 2048,
            responseMimeType: "application/json"
          }
        })
      }
    );

    if (!response.ok) {
      throw new Error(`Gemini API post-upload analysis failed: ${response.statusText}`);
    }

    const resJson = await response.json();
    const text = resJson.candidates?.[0]?.content?.parts?.[0]?.text;
    if (!text) throw new Error('Empty response for post-upload analysis');
    
    const cleaned = text.replace(/```json/g, '').replace(/```/g, '').trim();
    return JSON.parse(cleaned);
  } catch (e) {
    console.error('Gemini post-upload analysis failed, falling back to mock:', e);
    
    const isSuccess = actualMetrics.views >= 10000;
    return {
      successFactors: isSuccess ? '첫 컷의 방구석 부업 카피가 잘 통함. 비주얼 조명이 안정적임.' : '없음',
      failureFactors: !isSuccess ? '후킹 점수가 낮았던 만큼 초반 1초 이탈이 급증함. 대본이 설명에만 치우쳐 긴장감 부재.' : '없음',
      comparisonReport: `### 📊 예상 vs 실제 비교 리포트
- **실제 조회수**: ${actualMetrics.views.toLocaleString()}회
- **평가**: 예상 점수와 비례하는 지표를 보임. 후킹 컷의 카피와 장면 전환 주기를 반드시 단축할 필요가 있음.`,
      answers: {
        q1_hook_stop: isSuccess ? '코지 노트북 셋업의 시각적 아늑함이 통함' : '첫 1초 문구가 너무 지루하여 다 지나침',
        q2_dropoff: '2번째 컷 설명 나레이션 구간에서 템포 저하로 이탈',
        q3_diff_from_viral: '1. 평균 컷 전환 길이(우리 5초 vs 인기 2.5초)\n2. 자막 강조 이모지 부재\n3. 궁금증 유발 결말 연출 부족',
        q4_must_fix: '대본 2번째 컷 나레이션을 질문형으로 변경할 것',
        q5_expected_views: `실제 ${actualMetrics.views.toLocaleString()}회 기록.`,
        q6_multiplier_10x: '첫 문장의 단어를 더 강력하게 바꾸고, 컷 전환을 2초대로 설정하십시오.'
      }
    };
  }
}

// Generate a mock pool of 20 viral shorts matching a topic
function generateCompetitorShortsPool(topic) {
  const keywords = topic.toLowerCase();
  
  // Custom definitions based on topic keywords
  let titles = [];
  let hooks = [];
  
  if (keywords.includes('macbook') || keywords.includes('맥북') || keywords.includes('노트북') || keywords.includes('부업') || keywords.includes('ai')) {
    titles = [
      "노트북 하나로 퇴사한 비결 3가지",
      "직장인 몰래하는 AI 부업 폭로합니다",
      "이것 모르면 맥북 사지 마세요 (진짜임)",
      "하루 10분, 나만의 AI 파이프라인 만들기",
      "챗GPT로 월 100만 원 자동화하는 로드맵",
      "맥북 프로 에어 M3 뭘 사야 할까?",
      "대학생 부업 추천 리스트 TOP 5",
      "맥북 숨겨진 생산성 200% 세팅법",
      "AI로 쇼츠 10분 만에 10개 찍어내기",
      "디지털 노마드의 실제 아침 루틴"
    ];
    hooks = [
      "방구석에서 딱 노트북 하나만 켜두세요",
      "대기업 직장인들이 비밀리에 쓰는 AI 치트키",
      "맥북 비싸게 사서 유튜브만 보실 건가요?",
      "하루 단 10분으로 통장 잔고 불리는 비결",
      "아직도 챗GPT를 일기장으로만 쓰시나요?",
      "M3 맥북 사기 전에 이 영상을 무조건 보세요",
      "아르바이트 말고 방구석에서 마우스만 움직이세요",
      "맥북 사자마자 뜯어고쳐야 할 3가지 설정",
      "자동으로 영상 10개 만들어주는 AI 툴",
      "출퇴근 없이 노트북 하나로 먹고사는 현실"
    ];
  } else if (keywords.includes('ginseng') || keywords.includes('홍삼') || keywords.includes('건강') || keywords.includes('피로')) {
    titles = [
      "매일 아침이 피곤한 진짜 이유 1가지",
      "홍삼 에브리타임 싸게 사는 꿀팁",
      "체력 쓰레기였던 내가 아침 6시에 일어나는 법",
      "피로회복 끝판왕 홍삼 함량 비교 분석",
      "부모님 영양제 선물 1순위 추천",
      "정관장 활기력 vs 홍삼정 전격 비교",
      "가성비 넘치는 고함량 홍삼 브랜드 추천",
      "피곤할 때 절대 마시면 안 되는 음료",
      "6년근 홍삼만 먹어야 하는 진실",
      "직장인이 건강 챙기는 가장 간편한 습관"
    ];
    hooks = [
      "매일 피곤한 건 당신 몸이 보내는 적신호입니다",
      "홍삼 살 때 패키지 뒤의 이것 안 보면 낭패 봅니다",
      "아침마다 눈 안 떠지시는 분들 필독하세요",
      "홍삼도 브랜드 다 떼고 함량만 비교해 드립니다",
      "부모님 생신 선물로 고민은 이제 끝났습니다",
      "앰플형 활기력과 스틱형 에브리타임 차이점",
      "가성비 1등 홍삼 브랜드를 공개합니다",
      "피곤하다고 에너지 드링크만 마시면 생기는 일",
      "왜 홍삼은 항상 6년근만 고집할까요?",
      "출근길에 스틱 하나만 가방에 챙겨 가세요"
    ];
  } else {
    titles = [
      "조회수 100만 찍은 숏폼 비밀 분석",
      "요즘 알고리즘 선택받는 쇼츠 특징 3가지",
      "쇼츠 채널 1달 만에 1만 명 키운 공식",
      "사람들이 3초 만에 나가는 영상의 공통점",
      "유튜브 쇼츠 떡상하는 자막 배치 팁"
    ];
    hooks = [
      "유튜브 알고리즘이 밀어주는 영상은 정해져 있습니다",
      "이 3가지만 알면 당신도 쇼츠 10만 유튜버",
      "한 달 만에 구독자 만 명 모은 비밀 전략",
      "초반 3초에 이 단어를 안 쓰면 이탈합니다",
      "가독성 10배 올려주는 쇼츠 전용 자막 위치"
    ];
  }

  // Fallbacks if lists are sparse
  const uploaderNames = ["쇼츠클래스", "AI부업요정", "건강비밀창고", "비즈니스클럽", "알고리즘스나이퍼", "테크마스터", "웰니스라이프"];
  
  const pool = [];
  const totalCompetitors = 20;

  for (let i = 0; i < totalCompetitors; i++) {
    const title = titles[i % titles.length] + ` (인기 #${i+1})`;
    const hook = hooks[i % hooks.length];
    const channel = uploaderNames[i % uploaderNames.length];
    
    // Randomize stats but high-performing
    const views = Math.floor(120000 + Math.random() * 1800000);
    const cuts = 6 + Math.floor(Math.random() * 8);
    const avgCutLength = parseFloat((1.8 + Math.random() * 1.5).toFixed(1)); // 1.8s ~ 3.3s
    const subtitleStyle = i % 3 === 0 ? "중앙 노란색 강조형" : (i % 3 === 1 ? "하단 투명 박스 미니멀" : "중앙 바운스 폰트");
    const ctaStyle = i % 2 === 0 ? "고정 댓글 최저가 링크 유도" : "채널 구독 및 후속 영상 예고";

    pool.push({
      title,
      channel,
      views,
      hook,
      cuts,
      avgCutLength,
      subtitleStyle,
      ctaStyle
    });
  }

  // Sort pool by views desc
  return pool.sort((a, b) => b.views - a.views);
}

function saveToSuccessDnaDb(videoItem) {
  try {
    const dnaPath = path.join(process.cwd(), '..', '_company', '_shared', 'success_dna_db.json');
    let db = { success_dna_list: [] };
    if (fs.existsSync(dnaPath)) {
      db = JSON.parse(fs.readFileSync(dnaPath, 'utf-8'));
    }
    if (!db.success_dna_list) {
      db.success_dna_list = [];
    }

    const exists = db.success_dna_list.some(item => item.id === videoItem.id);
    if (!exists) {
      db.success_dna_list.push({
        id: videoItem.id,
        title: videoItem.scriptData?.title || '제목 없음',
        hook: videoItem.scriptData?.cuts?.[0]?.subtitle || '후크 없음',
        views: videoItem.views,
        avgRetention: videoItem.avgRetention,
        successFactors: videoItem.successFactors || '시각 및 자막 연출 매칭이 조화로움',
        added_at: new Date().toISOString()
      });
      fs.writeFileSync(dnaPath, JSON.stringify(db, null, 2), 'utf-8');
      console.log(`[Success DNA] Added video ${videoItem.id} to Success DNA database.`);
    }
  } catch (e) {
    console.error('Failed to save to success DNA DB:', e);
  }
}

// Product pricing helper
function getProductPrice(productName = '') {
  const name = productName.toLowerCase();
  if (name.includes('macbook') || name.includes('맥북') || name.includes('노트북')) {
    return 1500000;
  }
  if (name.includes('홍삼') || name.includes('ginseng') || name.includes('건강') || name.includes('에브리타임')) {
    return 80000;
  }
  if (name.includes('전자책') || name.includes('e-book') || name.includes('마스터북') || name.includes('책')) {
    return 30000;
  }
  return 50000; // default
}

// Performance database save helper
function saveToPerformanceDb(videoItem, actualMetrics) {
  try {
    const perfPath = path.join(process.cwd(), '..', '_company', '_shared', 'video_performance_db.json');
    let db = { video_performance: [] };
    if (fs.existsSync(perfPath)) {
      db = JSON.parse(fs.readFileSync(perfPath, 'utf-8'));
    }
    if (!db.video_performance) {
      db.video_performance = [];
    }

    const preScores = videoItem.preUploadAnalysis?.scores || { hookStrength: 75, scriptContent: 75, sceneVisuals: 75, subtitleAesthetics: 75, soundDesign: 75 };
    const avgScore = (preScores.hookStrength + preScores.scriptContent + preScores.sceneVisuals + preScores.subtitleAesthetics + preScores.soundDesign) / 5.0;

    db.video_performance = db.video_performance.filter(v => v.video_id !== videoItem.id);

    const views = actualMetrics.views;
    const ctr = actualMetrics.ctr || parseFloat((3.5 + Math.random() * 8.5).toFixed(1));
    const productName = videoItem.productTitle || videoItem.product_name || '상품명 없음';
    
    const production_cost = 1000;
    const ad_revenue = Math.round(views * 1.5 / 1000);
    const affiliate_clicks = Math.round(views * (ctr / 100));
    const affiliate_conversions = Math.round(affiliate_clicks * 0.12);
    const product_price = getProductPrice(productName);
    const affiliate_revenue = Math.round(affiliate_conversions * product_price * 0.03);
    const total_revenue = ad_revenue + affiliate_revenue;
    const net_profit = total_revenue - production_cost;
    const roi = parseFloat(((net_profit / production_cost) * 100).toFixed(1));

    const ctrNormalized = Math.min(1, ctr / 10);
    const convNormalized = Math.min(1, 12 / 12);
    const revenueNormalized = Math.min(1, total_revenue / 50000);
    const money_score = parseFloat(((ctrNormalized * 30) + (convNormalized * 30) + (revenueNormalized * 40)).toFixed(1));

    db.video_performance.push({
      video_id: videoItem.id,
      title: videoItem.scriptData?.title || '제목 없음',
      product_name: productName,
      quality_score: parseFloat(avgScore.toFixed(1)),
      hook_score: preScores.hookStrength,
      visual_score: preScores.sceneVisuals,
      subtitle_score: preScores.subtitleAesthetics,
      sound_score: preScores.soundDesign,
      views,
      ctr,
      retention: actualMetrics.avgRetention,
      likes: actualMetrics.likeRate,
      comments: actualMetrics.commentCount,
      subscribers_gained: actualMetrics.subscribers_gained || Math.floor(views * 0.002),
      production_cost,
      ad_revenue,
      affiliate_clicks,
      affiliate_conversions,
      affiliate_revenue,
      total_revenue,
      net_profit,
      roi,
      money_score,
      style_dna: videoItem.style_dna || 'Motivation',
      is_experiment: videoItem.is_experiment || false,
      is_mock: videoItem.is_mock || false
    });

    fs.writeFileSync(perfPath, JSON.stringify(db, null, 2), 'utf-8');
    console.log(`[Performance DB] Saved performance metrics with revenue attributes for video ${videoItem.id}`);

    // Trigger Success, Failure and Revenue DNA extraction
    runDnaExtraction(db.video_performance);
    runRevenueDnaExtraction(db.video_performance);
    runStyleDnaExtraction(db.video_performance);

    // Calculate DNA Influence Scores
    updateDnaInfluenceScores();

  } catch (e) {
    console.error('Failed to save to performance DB:', e);
  }
}

// Style DNA extraction engine
function runStyleDnaExtraction(list) {
  try {
    if (!Array.isArray(list) || list.length === 0) return;

    const fallbackTitles = [
      'M3 맥북으로 AI 수익화 시작하는 법',
      '노트북 하나로 월 100만원 버는 법',
      '피로회복 끝판왕 홍삼정 추천'
    ];

    // Filter videos with views >= 5000 and not fallback
    const successfulVids = list.filter(v => v.views >= 5000 && !fallbackTitles.includes(v.title));

    const styleDnaPath = path.join(process.cwd(), '..', '_company', '_shared', 'style_dna_db.json');
    let db = { style_dna_list: [] };
    if (fs.existsSync(styleDnaPath)) {
      try {
        db = JSON.parse(fs.readFileSync(styleDnaPath, 'utf-8'));
      } catch (e) {
        console.error('Failed to parse style_dna_db.json:', e);
      }
    }
    if (!db.style_dna_list) {
      db.style_dna_list = [];
    }

    let styleDnaListModified = false;

    successfulVids.forEach(v => {
      const exists = db.style_dna_list.some(item => item.video_id === v.video_id);
      if (!exists) {
        db.style_dna_list.push({
          style: v.style_dna || 'Motivation',
          video_id: v.video_id,
          title: v.title,
          views: v.views,
          roi: v.roi,
          added_at: new Date().toISOString(),
          is_mock: v.is_mock || false
        });
        styleDnaListModified = true;
      }
    });

    if (styleDnaListModified) {
      fs.writeFileSync(styleDnaPath, JSON.stringify(db, null, 2), 'utf-8');
      console.log(`[Style DNA Engine] Extracted successful styles to style_dna_db.json.`);
    }
  } catch (e) {
    console.error('Failed to run Style DNA extraction:', e);
  }
}

// Helper to verify if a video has at least 2 real metrics
function checkRealMetrics(v) {
  if (v.is_mock && v.views === 0) return false; // fallback for uninitialized mock
  let countMetrics = 0;
  if (v.views > 0) countMetrics++;
  if (v.ctr > 0) countMetrics++;
  
  // Calculate watch time or use retention to see if it's there
  const watchTime = v.watch_time || (v.views * (v.retention || 0));
  if (watchTime > 0) countMetrics++;
  
  const clicks = v.affiliate_clicks || 0;
  if (clicks > 0) countMetrics++;
  
  return countMetrics >= 2;
}

// Revenue DNA extraction engine
function runRevenueDnaExtraction(list) {
  try {
    if (!Array.isArray(list) || list.length === 0) return;

    const fallbackTitles = [
      'M3 맥북으로 AI 수익화 시작하는 법',
      '노트북 하나로 월 100만원 버는 법',
      '피로회복 끝판왕 홍삼정 추천'
    ];

    // Load history to resolve hook and category mapping
    let history = [];
    const historyPath = path.join(process.cwd(), 'public', 'shorts', 'history.json');
    if (fs.existsSync(historyPath)) {
      try {
        history = JSON.parse(fs.readFileSync(historyPath, 'utf-8'));
      } catch (e) {
        console.error('Failed to read history in extraction:', e);
      }
    }

    const extracted = [];

    list.forEach(v => {
      if (fallbackTitles.includes(v.title)) return;
      if (!checkRealMetrics(v)) return; // DNA 학습 제한: 실측 데이터 없는 영상 금지

      // Find matches in history
      const histItem = history.find(h => h.id === v.video_id);
      
      const category = histItem ? (histItem.category || histItem.topic || v.style_dna || '기타') : (v.style_dna || '기타');
      const hook = histItem && histItem.scriptData && histItem.scriptData.cuts && histItem.scriptData.cuts[0]
        ? histItem.scriptData.cuts[0].subtitle
        : (v.title || '');

      const is_mock = v.is_mock === true || (histItem && histItem.is_mock === true) || false;

      // Revenue DNA 조건: 클릭, 구매, 구독 중 하나라도 실제 발생
      const hasRevenueAction = v.affiliate_clicks > 0 || v.affiliate_conversions > 0 || v.subscribers_gained > 0;

      if (hasRevenueAction) {
        extracted.push({
          video_id: v.video_id,
          source_video_title: v.title || '',
          category: category,
          product_name: v.product_name || '',
          hook: hook,
          style_dna: v.style_dna || '',
          views: v.views || 0,
          affiliate_clicks: v.affiliate_clicks || 0,
          affiliate_conversions: v.affiliate_conversions || 0,
          subscribers_gained: v.subscribers_gained || 0,
          comments: v.comments || 0,
          money_score: v.money_score || 0,
          reason_for_registration: `Clicks: ${v.affiliate_clicks}, Conversions: ${v.affiliate_conversions}, Subs: ${v.subscribers_gained}`,
          created_at: new Date().toISOString(),
          is_mock: is_mock
        });
      }
    });

    const revenueDnaPath = path.join(process.cwd(), '..', '_company', '_shared', 'revenue_dna_db.json');
    const revenueDb = {
      revenue_dna_list: extracted
    };
    fs.writeFileSync(revenueDnaPath, JSON.stringify(revenueDb, null, 2), 'utf-8');
    console.log(`[Revenue DNA Engine] Extracted ${extracted.length} revenue DNA records.`);
  } catch (e) {
    console.error('Failed to run Revenue DNA extraction:', e);
  }
}

// Success and Failure DNA extraction engine
function runDnaExtraction(list) {
  try {
    if (!Array.isArray(list) || list.length === 0) return;

    const fallbackTitles = [
      'M3 맥북으로 AI 수익화 시작하는 법',
      '노트북 하나로 월 100만원 버는 법',
      '피로회복 끝판왕 홍삼정 추천'
    ];

    // Filter valid videos with at least 2 real metrics
    const targetList = list.filter(v => !fallbackTitles.includes(v.title) && checkRealMetrics(v));
    if (targetList.length === 0) {
      console.log('[Dna Extraction] No real performance items found for success/failure extraction.');
      const successDnaPath = path.join(process.cwd(), '..', '_company', '_shared', 'success_dna_db.json');
      const failureDnaPath = path.join(process.cwd(), '..', '_company', '_shared', 'failure_dna_db.json');
      fs.writeFileSync(successDnaPath, JSON.stringify({ success_dna_list: [] }, null, 2), 'utf-8');
      fs.writeFileSync(failureDnaPath, JSON.stringify({ failure_dna_list: [] }, null, 2), 'utf-8');
      return;
    }

    // --- Success DNA (CTR 상위 20% 또는 Watch Time 상위 20%) ---
    // Sort by CTR desc to find 20% threshold
    const sortedByCtr = [...targetList].sort((a, b) => b.ctr - a.ctr);
    const ctrThresholdIndex = Math.max(0, Math.ceil(targetList.length * 0.2) - 1);
    const ctrThreshold = sortedByCtr[ctrThresholdIndex]?.ctr || 0;

    // Sort by Watch Time desc to find 20% threshold
    const getWT = (v) => v.watch_time || (v.views * (v.retention || 0));
    const sortedByWatchTime = [...targetList].sort((a, b) => getWT(b) - getWT(a));
    const watchTimeThresholdIndex = Math.max(0, Math.ceil(targetList.length * 0.2) - 1);
    const watchTimeThreshold = getWT(sortedByWatchTime[watchTimeThresholdIndex]);

    const successVids = targetList.filter(v => v.ctr >= ctrThreshold || getWT(v) >= watchTimeThreshold);

    const successDnaPath = path.join(process.cwd(), '..', '_company', '_shared', 'success_dna_db.json');
    const successDb = {
      success_dna_list: successVids.map(v => ({
        id: v.video_id,
        title: v.title,
        hook: v.title,
        views: v.views,
        ctr: v.ctr,
        watch_time: getWT(v),
        avgRetention: v.retention,
        successFactors: `CTR ${v.ctr}% 및 Watch Time ${getWT(v)}로 성공 DNA 판정.`,
        hook_score: v.hook_score,
        visual_score: v.visual_score,
        subtitle_score: v.subtitle_score,
        added_at: new Date().toISOString(),
        is_mock: v.is_mock || false
      }))
    };
    fs.writeFileSync(successDnaPath, JSON.stringify(successDb, null, 2), 'utf-8');

    // --- Failure DNA (CTR 하위 20% 또는 Retention 하위 20%) ---
    // Sort by CTR asc to find 20% threshold
    const sortedByCtrAsc = [...targetList].sort((a, b) => a.ctr - b.ctr);
    const ctrFailureThresholdIndex = Math.max(0, Math.ceil(targetList.length * 0.2) - 1);
    const ctrFailureThreshold = sortedByCtrAsc[ctrFailureThresholdIndex]?.ctr || 999;

    // Sort by Retention asc to find 20% threshold
    const sortedByRetentionAsc = [...targetList].sort((a, b) => a.retention - b.retention);
    const retentionFailureThresholdIndex = Math.max(0, Math.ceil(targetList.length * 0.2) - 1);
    const retentionFailureThreshold = sortedByRetentionAsc[retentionFailureThresholdIndex]?.retention || 999;

    const failureVids = targetList.filter(v => v.ctr <= ctrFailureThreshold || v.retention <= retentionFailureThreshold);

    const failureDnaPath = path.join(process.cwd(), '..', '_company', '_shared', 'failure_dna_db.json');
    const failureDb = {
      failure_dna_list: failureVids.map(v => {
        let primaryCause = '설명 위주 전개로 인한 도입부 이탈 우려';
        if (v.ctr <= ctrFailureThreshold && v.retention <= retentionFailureThreshold) {
          primaryCause = 'CTR 및 시청지속시간 동시 부진';
        } else if (v.ctr <= ctrFailureThreshold) {
          primaryCause = '도입부 이탈 또는 후킹(CTR) 실패';
        } else if (v.retention <= retentionFailureThreshold) {
          primaryCause = '콘텐츠 전개 지루함으로 시청지속(Retention) 실패';
        }
        
        return {
          id: v.video_id,
          title: v.title,
          views: v.views,
          ctr: v.ctr,
          avgRetention: v.retention,
          failureFactors: primaryCause,
          hook_score: v.hook_score,
          visual_score: v.visual_score,
          subtitle_score: v.subtitle_score,
          added_at: new Date().toISOString(),
          is_mock: v.is_mock || false
        };
      })
    };
    fs.writeFileSync(failureDnaPath, JSON.stringify(failureDb, null, 2), 'utf-8');
    
    console.log(`[DNA Engines] Extracted ${successVids.length} success DNA records and ${failureVids.length} failure DNA records.`);
  } catch (e) {
    console.error('Failed to run DNA extraction:', e);
  }
}

// Compute Correlation stats helper
function computeCorrelationStats(list) {
  if (!Array.isArray(list) || list.length < 2) {
    return {
      available: false,
      hookVsViews: 0,
      visualVsRetention: 0,
      subtitleVsCtr: 0,
      highHookViewsAvg: 0,
      lowHookViewsAvg: 0,
      highVisualRetentionAvg: 0,
      lowVisualRetentionAvg: 0,
      highSubtitleCtrAvg: 0,
      lowSubtitleCtrAvg: 0
    };
  }

  const hookHigh = list.filter(v => v.hook_score >= 80);
  const hookLow = list.filter(v => v.hook_score < 80);
  const visualHigh = list.filter(v => v.visual_score >= 80);
  const visualLow = list.filter(v => v.visual_score < 80);
  const subtitleHigh = list.filter(v => v.subtitle_score >= 80);
  const subtitleLow = list.filter(v => v.subtitle_score < 80);

  const avg = (arr, key) => arr.length === 0 ? 0 : Math.round(arr.reduce((acc, item) => acc + item[key], 0) / arr.length);

  const pearson = (xKey, yKey) => {
    const n = list.length;
    let sumX = 0, sumY = 0, sumXY = 0, sumX2 = 0, sumY2 = 0;
    for (const item of list) {
      const x = item[xKey] || 0;
      const y = item[yKey] || 0;
      sumX += x;
      sumY += y;
      sumXY += x * y;
      sumX2 += x * x;
      sumY2 += y * y;
    }
    const num = n * sumXY - sumX * sumY;
    const den = Math.sqrt((n * sumX2 - sumX * sumX) * (n * sumY2 - sumY * sumY));
    return den === 0 ? 0 : parseFloat((num / den).toFixed(2));
  };

  return {
    available: true,
    hookVsViews: pearson('hook_score', 'views'),
    visualVsRetention: pearson('visual_score', 'retention'),
    subtitleVsCtr: pearson('subtitle_score', 'ctr'),
    highHookViewsAvg: avg(hookHigh, 'views'),
    lowHookViewsAvg: avg(hookLow, 'views'),
    highVisualRetentionAvg: avg(visualHigh, 'retention'),
    lowVisualRetentionAvg: avg(visualLow, 'retention'),
    highSubtitleCtrAvg: parseFloat((avg(subtitleHigh, 'ctr') || 0).toFixed(1)),
    lowSubtitleCtrAvg: parseFloat((avg(subtitleLow, 'ctr') || 0).toFixed(1))
  };
}

// Generate daily report helper
function generateDailyReport(performanceList, successDnaList, failureDnaList, revenueDnaList) {
  if (!Array.isArray(performanceList) || performanceList.length === 0) {
    return {
      created_at: new Date().toISOString(),
      bestVideo: '데이터 부족',
      worstVideo: '데이터 부족',
      bestHook: '데이터 부족',
      bestStyle: '데이터 부족',
      recommendation: '최소 2개 이상의 영상 성과 데이터가 입력되어야 보고서 생성이 가능합니다.'
    };
  }

  const sorted = [...performanceList].sort((a, b) => b.views - a.views);
  const best = sorted[0];
  const worst = sorted[sorted.length - 1];

  const bestHook = best.title ? `"${best.title}" (후킹 점수: ${best.hook_score}점, 실제 조회수: ${best.views.toLocaleString()}회)` : '데이터 부족';
  const bestStyle = best.product_name ? `"${best.product_name}" 관련 비주얼 (비주얼 점수: ${best.visual_score}점, 시청 지속률: ${best.retention}%)` : '데이터 부족';

  let recommendation = '대본의 후킹 강도를 85점 이상으로 설정 시 평균 조회수가 상승하는 흐름이 관측됩니다. ';
  if (successDnaList && successDnaList.length > 0) {
    recommendation += `다음 제작 시에는 성공률이 입증된 훅 패턴인 "${successDnaList[0].hook}" 형식을 모방하고, `;
  }
  if (failureDnaList && failureDnaList.length > 0) {
    recommendation += `실패 요인인 "${failureDnaList[0].failureFactors || '설명 위주 전개'}"를 회피하여 제작할 것을 권장합니다.`;
  } else {
    recommendation += '지루한 설명 형태의 나레이션을 줄이고 2초 간격 컷 연출을 장려합니다.';
  }

  if (revenueDnaList && revenueDnaList.length > 0) {
    recommendation += ` 최고 수익 DNA 영상인 "${revenueDnaList[0].title}" (Money Score: ${revenueDnaList[0].money_score}점)의 제휴 연동 설계를 대본 기획에 우선 적용하십시오.`;
  }

  // Automatic Investment Judgment (Investment Advisor)
  let highEfficiencyVideos = [];
  let baitVideos = [];

  for (const v of performanceList) {
    const views = v.views || 0;
    const netProfit = v.net_profit || 0;
    
    // High-Efficiency: low views (< 15,000) but high profit (> ₩5,000)
    if (views < 15000 && netProfit > 5000) {
      highEfficiencyVideos.push(v);
    }
    // Bait: high views (>= 15,000) but low profit (< ₩3,000)
    if (views >= 15000 && netProfit < 3000) {
      baitVideos.push(v);
    }
  }

  let investmentAdvisor = '';
  if (highEfficiencyVideos.length > 0 || baitVideos.length > 0) {
    investmentAdvisor = `[투자 분석 판정] `;
    if (highEfficiencyVideos.length > 0) {
      investmentAdvisor += `고효율형 영상(조회수 대비 고수익): ${highEfficiencyVideos.map(v => `"${v.title}" (조회수: ${v.views.toLocaleString()}회, 순이익: ₩${v.net_profit.toLocaleString()})`).join(', ')}. `;
    }
    if (baitVideos.length > 0) {
      investmentAdvisor += `미끼형 영상(조회수 대비 저수익): ${baitVideos.map(v => `"${v.title}" (조회수: ${v.views.toLocaleString()}회, 순이익: ₩${v.net_profit.toLocaleString()})`).join(', ')}. `;
    }
    investmentAdvisor += `수익 극대화를 위해 고효율형 상품 키워드 비중을 높이고 미끼형 영상의 CTA 전환 경로를 긴급 개선하십시오.`;
  } else {
    investmentAdvisor = `[투자 분석 판정] 현재 데이터셋에서 특이 고효율/미끼 영상이 식별되지 않았습니다. 지속적으로 성과 데이터를 축적하십시오.`;
  }

  return {
    created_at: new Date().toISOString(),
    bestVideo: best.title ? `${best.title} (${best.views.toLocaleString()}회)` : '없음',
    worstVideo: worst.title ? `${worst.title} (${worst.views.toLocaleString()}회)` : '없음',
    bestHook,
    bestStyle,
    recommendation,
    investmentAdvisor
  };
}

