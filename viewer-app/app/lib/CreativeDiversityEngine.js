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
  
  // Pick random font, caption style, camera movement
  const newFont = DIVERSITY_FONTS[Math.floor(Math.random() * DIVERSITY_FONTS.length)];
  const newCaptionStyle = DIVERSITY_CAPTION_STYLES[Math.floor(Math.random() * DIVERSITY_CAPTION_STYLES.length)];
  const randomPosition = Math.random() > 0.5 ? 'top' : 'center'; // Change position from default bottom
  
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
    captionPosition: randomPosition,
    style: alternateStyle,
    hookType: alternateHook,
    shotPattern: alternatePattern,
    styleDna: alternateStyleDna
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
  antiCloneModify
};
