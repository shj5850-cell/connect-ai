const fs = require('fs');
const path = require('path');

// 13 Style DNA categories
const STYLE_DNA_LIST = [
  'Horror',
  'Luxury',
  'Minimal',
  'Luxury Tech',
  'Curiosity',
  'Emotional',
  'Motivation',
  'Backrooms',
  'Urban Legend',
  'Life Hack',
  'Product Review',
  'ASMR',
  'Storytelling'
];

// 10 Hook types
const HOOK_LIBRARY = [
  { type: '공포형', description: '등골 오싹하고 오금 저리는 미스터리/공포 후킹 문구 시작' },
  { type: '충격형', description: '상식 파괴, 충격적인 진실이나 사실을 폭로하는 강렬한 후킹 문구' },
  { type: '호기심형', description: '끝까지 보지 않으면 안 되게 만드는 궁금증 자극형 문구' },
  { type: '비밀형', description: '소수의 1%만 아는 극비 정보나 팁을 누설하는 형태의 문구' },
  { type: '비교형', description: 'A vs B, 전후 대조, 혹은 상반된 가치를 자극적으로 비교하는 문구' },
  { type: '실험형', description: '호기심 넘치는 기발한 실험이나 테스트의 시작을 알리는 문구' },
  { type: '스토리형', description: '한 편의 소설이나 실화 극적인 썰의 서두를 여는 긴장감 가득한 문구' },
  { type: '논란형', description: '사람들 사이에서 격렬하게 다투는 뜨거운 감자나 논란을 던지는 문구' },
  { type: '반전형', description: '당연하다고 믿었던 사실을 정면으로 뒤집는 충격 반전 도입 문구' },
  { type: '숫자형', description: '구체적인 통계나 수치를 활용해 신뢰도와 호기심을 극대화하는 문구' }
];

// 10 Visual image styles
const VISUAL_STYLES = [
  'Photorealistic',
  'Cinematic',
  'Documentary',
  'Luxury Commercial',
  'Anime',
  '3D Render',
  'Minimal',
  'Dark Horror',
  'Retro',
  'Hyperrealistic'
];

// 5 Shot pattern rotations (cut durations)
const SHOT_PATTERNS = [
  { name: 'A형 (빌드업)', durations: [1, 2, 2, 3] },
  { name: 'B형 (임팩트)', durations: [3, 2, 1, 2] },
  { name: 'C형 (균등형)', durations: [2, 2, 2, 2] },
  { name: 'D형 (빠른 템포)', durations: [1, 1, 1, 1] },
  { name: 'E형 (느린 호흡)', durations: [3, 3, 3, 3] }
];

// List of alternative fonts for anti-cloning
const DIVERSITY_FONTS = [
  'Pretendard-Bold',
  'GmarketSansMedium',
  'EstablishRoomNo707',
  'TmonMonsori',
  'BaminJua'
];

// Alternative subtitle layouts/colors supported by generate_cinema_shorts.py
const DIVERSITY_CAPTION_STYLES = [
  'minimal',
  'hooking',
  'news',
  'essay',
  'copy'
];

const DIVERSITY_CAMERAS = [
  'Extreme close-up macro view',
  'Panning dynamic landscape view',
  'Aerial drone bird-eye shot',
  'Low angle majestic hero shot',
  'High angle static workspace layout',
  'Side angle tracking action shot'
];

// Jaccard similarity word tokenizer helper
function tokenize(text) {
  if (!text) return new Set();
  // Clean special characters, convert to lowercase, split into words/syllables
  const words = text.toLowerCase()
    .replace(/[.,\/#!$%\^&\*;:{}=\-_`~()]/g, '')
    .split(/\s+/);
  return new Set(words.filter(w => w.length > 0));
}

function calculateJaccard(setA, setB) {
  if (setA.size === 0 || setB.size === 0) return 0;
  const intersection = new Set([...setA].filter(x => setB.has(x)));
  const union = new Set([...setA, ...setB]);
  return intersection.size / union.size;
}

// Compute the similarity score (0 to 100%) against the last 20 videos
function calculateSimilarity(newRecord, recentRecords) {
  if (!recentRecords || recentRecords.length === 0) return 0;
  
  let maxSimilarity = 0;

  // We check similarity against each of the recent records and find the highest matches
  for (const record of recentRecords) {
    let score = 0;
    
    // 1. Style DNA match (+10%)
    if (newRecord.style_dna && record.style_dna && newRecord.style_dna === record.style_dna) {
      score += 10;
    }

    // 2. Visual Style match (+10%)
    if (newRecord.used_style && record.used_style && newRecord.used_style === record.used_style) {
      score += 10;
    }
    
    // 3. Hook Type match (+15%)
    if (newRecord.hook_type && record.hook_type && newRecord.hook_type === record.hook_type) {
      score += 15;
    }
    
    // 4. Shot Pattern match (+5%)
    if (newRecord.shot_pattern && record.shot_pattern && newRecord.shot_pattern === record.shot_pattern) {
      score += 5;
    }
    
    // 5. Subtitle Content Similarity (Jaccard) - up to 30%
    const newSubtitles = (newRecord.scriptData?.cuts || []).map(c => c.subtitle).join(' ');
    const oldSubtitles = (record.scriptData?.cuts || []).map(c => c.subtitle).join(' ');
    const subtitleJaccard = calculateJaccard(tokenize(newSubtitles), tokenize(oldSubtitles));
    score += Math.round(subtitleJaccard * 30);
    
    // 6. Image Prompt Similarity (Jaccard) - up to 30%
    const newPrompts = (newRecord.scriptData?.cuts || []).map(c => c.prompt).join(' ');
    const oldPrompts = (record.scriptData?.cuts || []).map(c => c.prompt).join(' ');
    const promptJaccard = calculateJaccard(tokenize(newPrompts), tokenize(oldPrompts));
    score += Math.round(promptJaccard * 30);
    
    if (score > maxSimilarity) {
      maxSimilarity = score;
    }
  }
  
  return Math.min(100, maxSimilarity);
}

// Automatically change metadata to bypass duplicate clones
function antiCloneModify(scriptData, usedStyle, hookType, shotPattern, styleDna) {
  console.log('[Anti-Clone] Dup detected >= 70%. Scrambling visual and typesetting configuration...');
  
  // Pick locked font, random caption style, camera movement
  const newFont = 'Pretendard-Bold';
  const newCaptionStyle = DIVERSITY_CAPTION_STYLES[Math.floor(Math.random() * DIVERSITY_CAPTION_STYLES.length)];
  const lockedPosition = 'bottom'; // Locked to bottom 75% for mobile readability
  
  // Scramble camera movements and description framing for each cut
  if (scriptData && Array.isArray(scriptData.cuts)) {
    scriptData.cuts.forEach((cut, idx) => {
      const randomCam = DIVERSITY_CAMERAS[Math.floor(Math.random() * DIVERSITY_CAMERAS.length)];
      cut.cameraMovement = Math.random() > 0.5 ? 'panning' : 'zoom out';
      cut.description = `${randomCam}. ${cut.description || ''}`;
      // Injects styling indicators into the prompt without breaking flux formatting
      cut.prompt = `${randomCam}, ${cut.prompt || ''}`;
    });
  }
  
  // Select a different style and hook category
  const alternateStyle = VISUAL_STYLES.filter(s => s !== usedStyle)[Math.floor(Math.random() * (VISUAL_STYLES.length - 1))];
  const alternateHook = HOOK_LIBRARY.filter(h => h.type !== hookType)[Math.floor(Math.random() * (HOOK_LIBRARY.length - 1))].type;
  const alternatePattern = SHOT_PATTERNS.filter(p => p.name !== shotPattern)[Math.floor(Math.random() * (SHOT_PATTERNS.length - 1))].name;
  const alternateStyleDna = STYLE_DNA_LIST.filter(d => d !== styleDna)[Math.floor(Math.random() * (STYLE_DNA_LIST.length - 1))];

  return {
    font: newFont,
    captionStyle: newCaptionStyle,
    captionPosition: lockedPosition,
    style: alternateStyle,
    hookType: alternateHook,
    shotPattern: alternatePattern,
    styleDna: alternateStyleDna
  };
}

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

const EXPERIMENT_CATEGORIES = Object.keys(EXPERIMENT_MAP);

function selectWeightedCategory(recentHistory) {
  const counts = {};
  EXPERIMENT_CATEGORIES.forEach(cat => {
    counts[cat] = 0;
  });
  if (Array.isArray(recentHistory)) {
    recentHistory.slice(0, 20).forEach(video => {
      const cat = video.category || video.topic;
      if (cat && counts[cat] !== undefined) {
        counts[cat]++;
      }
    });
  }
  
  const weights = {};
  let totalWeight = 0;
  EXPERIMENT_CATEGORIES.forEach(cat => {
    const w = 1.0 / (counts[cat] + 1);
    weights[cat] = w;
    totalWeight += w;
  });
  
  let rand = Math.random() * totalWeight;
  for (const cat of EXPERIMENT_CATEGORIES) {
    rand -= weights[cat];
    if (rand <= 0) {
      return cat;
    }
  }
  return EXPERIMENT_CATEGORIES[Math.floor(Math.random() * EXPERIMENT_CATEGORIES.length)];
}

function selectBestHookCandidate(candidates, recentHooks) {
  if (!Array.isArray(candidates) || candidates.length === 0) return '';
  if (!Array.isArray(recentHooks) || recentHooks.length === 0) return candidates[0];
  
  let bestCandidate = candidates[0];
  let minMaxSimilarity = 999;
  
  candidates.forEach(cand => {
    let maxSim = 0;
    recentHooks.forEach(rHook => {
      const sim = calculateJaccard(tokenize(cand), tokenize(rHook));
      if (sim > maxSim) {
        maxSim = sim;
      }
    });
    
    if (maxSim < minMaxSimilarity) {
      minMaxSimilarity = maxSim;
      bestCandidate = cand;
    }
  });
  
  return bestCandidate;
}

function calculateProductRelevanceScore(keyword, script, scenes, hasDirectImage) {
  const kwLower = (keyword || '').toLowerCase();
  const kwTokens = kwLower.replace(/[.,\/#!$%\^&\*;:{}=\-_`~()]/g, ' ').split(/\s+/).filter(w => w.length > 1);
  
  // Extract English Category with broadened synonym patterns
  const category_mapping = {
    "소고기": "beef, steak, meat, cow, sirloin, tenderloin, ribeye, gourmet, barbecue, grill, bbq, 한우, 갈비, 등심, 안심, 채끝, 우삼겹, 차돌박이, 소고기",
    "칫솔": "toothbrush, brush, teeth, dental, tooth, hygiene, plaque, gums, wash, 칫솔, 이빨, 치아, 양치",
    "강아지 사료": "dog food, dog, pet, food, puppy, canine, feed, kibble, treat, organic, 반려견, 강아지, 개, 사료, 애견",
    "전동드릴": "power drill, drill, tool, screw, hardware, diy, driver, assemble, worker, 전동드릴, 드릴, 나사, 조립, 공구, 드라이버",
    "에스프레소 머신": "espresso machine, coffee maker, espresso, coffee, cafe, brew, barista, cup, mug, 에스프레소, 커피, 머신, 카페",
    "청소기": "vacuum cleaner, vacuum, cleaner, mop, sweeper, wet mop, steam mop, 청소기, 청소, 물걸레",
    "러닝화": "running shoes, shoes, sneakers, trainer, feet, foot, sport, run, 러닝화, 신발, 운동화",
    "영양제": "supplements, vitamins, pill, capsules, tablet, health, wellness, 영양제, 비타민, 건강",
    "홍삼": "red ginseng, ginseng, herb, extract, root, health, energy, 홍삼, 인삼",
    "커피": "coffee, cafe, brew, espresso, 커피, 카페"
  };
  
  let engCat = "";
  for (const [k_kr, k_en] of Object.entries(category_mapping)) {
    if (kwLower.includes(k_kr.toLowerCase()) || k_kr.toLowerCase().includes(kwLower)) {
      engCat = k_en;
      break;
    }
  }
  if (!engCat) {
    if (/^[a-zA-Z\s]+$/.test(keyword)) {
      engCat = keyword;
    } else {
      engCat = "product";
    }
  }

  const engCatSynonyms = engCat ? engCat.toLowerCase().split(',').map(s => s.trim()).filter(Boolean) : [];
  
  const getSceneVisualTokens = (scene) => {
    const parts = [];
    if (scene.imageKeyword) parts.push(scene.imageKeyword);
    if (Array.isArray(scene.imageSearchKeywords)) parts.push(...scene.imageSearchKeywords);
    if (Array.isArray(scene.videoSearchKeywords)) parts.push(...scene.videoSearchKeywords);
    if (scene.keywords) parts.push(scene.keywords);
    if (scene.searchKeyword) parts.push(scene.searchKeyword);
    if (scene.prompt) parts.push(scene.prompt);
    if (scene.description) parts.push(scene.description);
    if (scene.visualSource) parts.push(scene.visualSource);
    
    const text = parts.join(' ').toLowerCase();
    const clean = text.replace(/[.,\/#!$%\^&\*;:{}=\-_`~()]/g, ' ');
    return clean.split(/\s+/).filter(w => w.length > 0);
  };
  
  // 1. Product Match (40% max)
  let matchCount = 0;
  scenes.forEach(scene => {
    const visualTokens = getSceneVisualTokens(scene);
    let matched = kwTokens.some(kt => visualTokens.includes(kt));
    if (!matched && engCatSynonyms.length > 0) {
      matched = visualTokens.some(vt => 
        engCatSynonyms.some(syn => vt.includes(syn) || syn.includes(vt))
      );
    }
    if (matched) matchCount++;
  });

  // Narrative-aware scoring: in a 4-cut video, if the product is revealed in Cut 4
  // and Cut 4 matches the product, we award a full score (40 points)
  let productMatchScore = 0;
  if (scenes.length === 4) {
    const lastCut = scenes[3];
    const visualTokens = getSceneVisualTokens(lastCut);
    let lastMatched = kwTokens.some(kt => visualTokens.includes(kt));
    if (!lastMatched && engCatSynonyms.length > 0) {
      lastMatched = visualTokens.some(vt => 
        engCatSynonyms.some(syn => vt.includes(syn) || syn.includes(vt))
      );
    }
    if (!lastMatched) {
      const textToCheck = [lastCut.subtitle, lastCut.narration, lastCut.caption].join(' ').toLowerCase();
      lastMatched = kwTokens.some(kt => textToCheck.includes(kt)) || 
                    (engCatSynonyms.length > 0 && engCatSynonyms.some(syn => textToCheck.includes(syn)));
    }
    if (lastMatched) {
      productMatchScore = 40;
    } else {
      productMatchScore = scenes.length > 0 ? Math.round((matchCount / scenes.length) * 40) : 0;
    }
  } else {
    productMatchScore = scenes.length > 0 ? Math.round((matchCount / scenes.length) * 40) : 0;
  }
  
  // 2. Usage Context Match (25% max)
  const usageVerbs = [
    'brushing', 'eating', 'drilling', 'cooking', 'cleaning', 'running', 'applying', 'working', 
    'holding', 'operating', 'using', 'pouring', 'drinking', 'chewing', 'serving', 'frying', 
    'slicing', 'cutting', 'active', 'workout', 'fixing', 'screwing', 'washing', 'making', 
    'brewing', 'swallowing',
    '굽', '먹', '닦', '양치', '청소', '조립', '뚫', '마시', '추출', '신', '달리', 
    '복용', '섭취', '작동', '조절', '사용', '리뷰', '추천', '고치', '박', '자르', 
    '끓', '조리', '운동', '걸어',
    '고민', '불편', '해결', '스트레스', '힘들', '피곤', '어려움', '상황', '도움', '완성',
    '일상', '문제', '방법', '이유', '시작', '하루', '아침', '매일', '진짜', '너무',
    '정말', '생각', '꿀팁'
  ];
  
  let usageMatchCount = 0;
  scenes.forEach(scene => {
    const text = [
      scene.narration, scene.caption, scene.subtitle, scene.visualSource,
      scene.prompt, scene.description, scene.keywords, scene.imageKeyword
    ].join(' ').toLowerCase();
    
    const hasUsage = usageVerbs.some(verb => text.includes(verb));
    if (hasUsage) {
      usageMatchCount++;
    }
  });
  const usageContextMatchScore = scenes.length > 0 ? Math.round((usageMatchCount / scenes.length) * 25) : 0;
  
  // 3. Script Match (15% max)
  const scriptText = (script || scenes.map(s => s.narration || s.caption || s.subtitle || '').join(' ')).toLowerCase();
  const hasDigits = /\d+/.test(scriptText);
  const specUnits = [
    'g', 'v', 'aw', 'pa', '원', '%', 'kcal', 'mg', '밀리그램', '그램', '볼트', '암페어', '압력', '스펙', '성분', 
    '무료배송', '할인', '특가', '원료', '함량', '특징', '보장', '인증', '식약처', 'ml', 'l', 'kg', '만 원', '만원',
    '댓글', '링크', '확인', '정보', '추천', '꿀팁', '꿀템', '아래', '더보기', '설명', '더 알아보기', '보러가기'
  ];
  const hasUnits = specUnits.some(u => scriptText.includes(u));
  const containsProductKeywords = kwTokens.some(kt => scriptText.includes(kt)) || 
                                  (engCatSynonyms.length > 0 && engCatSynonyms.some(syn => scriptText.includes(syn)));
  
  let scriptMatchScore = 0;
  if (hasDigits || hasUnits || containsProductKeywords) {
    scriptMatchScore = 15;
  }
  
  // 4. Asset Match (20% max)
  let assetMatchScore = 0;
  if (hasDirectImage) {
    let actualImageCount = 0;
    scenes.forEach((_, idx) => {
      if (idx === 0 || idx === scenes.length - 1 || idx % 2 === 0) {
        actualImageCount++;
      }
    });
    const proportion = actualImageCount / scenes.length;
    assetMatchScore = Math.round(proportion * 20);
  } else {
    // Narrative-aware scoring for Asset Match: 20 points if Cut 4 matches
    if (scenes.length === 4) {
      const lastCut = scenes[3];
      const visualTokens = getSceneVisualTokens(lastCut);
      let lastMatched = kwTokens.some(kt => visualTokens.includes(kt));
      if (!lastMatched && engCatSynonyms.length > 0) {
        lastMatched = visualTokens.some(vt => 
          engCatSynonyms.some(syn => vt.includes(syn) || syn.includes(vt))
        );
      }
      if (!lastMatched) {
        const textToCheck = [lastCut.subtitle, lastCut.narration, lastCut.caption].join(' ').toLowerCase();
        lastMatched = kwTokens.some(kt => textToCheck.includes(kt)) || 
                      (engCatSynonyms.length > 0 && engCatSynonyms.some(syn => textToCheck.includes(syn)));
      }
      if (lastMatched) {
        assetMatchScore = 20;
      } else {
        assetMatchScore = scenes.length > 0 ? Math.round((matchCount / scenes.length) * 20) : 0;
      }
    } else {
      assetMatchScore = scenes.length > 0 ? Math.round((matchCount / scenes.length) * 20) : 0;
    }
  }
  
  const total = productMatchScore + usageContextMatchScore + scriptMatchScore + assetMatchScore;
  return {
    total,
    breakdown: {
      productMatchScore,
      usageContextMatchScore,
      scriptMatchScore,
      assetMatchScore
    }
  };
}

module.exports = {
  STYLE_DNA_LIST,
  HOOK_LIBRARY,
  VISUAL_STYLES,
  SHOT_PATTERNS,
  DIVERSITY_FONTS,
  DIVERSITY_CAPTION_STYLES,
  calculateSimilarity,
  antiCloneModify,
  EXPERIMENT_MAP,
  EXPERIMENT_CATEGORIES,
  selectWeightedCategory,
  selectBestHookCandidate,
  tokenize,
  calculateJaccard,
  calculateProductRelevanceScore
};

