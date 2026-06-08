const fs = require('fs');
const path = require('path');

const logPath = path.join(__dirname, 'audit_results.json');
if (!fs.existsSync(logPath)) {
  console.error('Audit results file does not exist.');
  process.exit(1);
}

const data = JSON.parse(fs.readFileSync(logPath, 'utf-8'));

let md = `# 맹칠컴퍼니 AI 비즈니스 완전 자동화 (Autopilot) 중간 품질 감사 보고서

본 보고서는 최근 크레딧 충전 및 이어서 작업을 재개한 **AI 쇼츠 콘텐츠 제작 자동화(Autopilot) 프로세스**의 결과물에 대한 중간 평가 및 분석을 포함하고 있습니다. 어제 완료되었던 4개의 영상에 더해 금일 추가로 완료한 2개의 영상을 포함하여 총 **6개 카테고리의 숏폼 영상**에 대한 원시 품질 데이터를 취합 및 분석한 결과입니다.

---

## 1. 종합 요약 (Executive Summary)

* **평가 대상 건수**: 총 6건
* **성공 및 업로드 상태**:
  * **전체 보류 (6건 보류)**: 품질 감사관 에이전트(Quality Board)의 유튜브 자동 업로드 통과 기준점인 **평균 80.0점**을 넘지 못해 모든 영상이 유튜브로 자동 업로드 되지 않고 로컬 빌드 및 보류 상태로 대기하고 있습니다.
  * **최종 평균 점수**: 평균 **66.6점** (최고 78.0점 / 최저 55.0점)
* **품질 점수 추이**:
  * 초기 **Run 1, 2**에서는 API 분석 오류 및 기타 문제로 기본값(55.0점)으로 대체 평가되었으나, **Run 3, 4, 6**은 실제 고품질 대본 기획이 가동되어 **78.0점**을 획득하였습니다. 기준점인 80점 돌파를 위해 극도의 디테일 개선이 요구됩니다.

---

## 2. 영상 품질 점수 비교표

| 회차 | 카테고리 | 상품명 | 영상 제목 | 스타일 DNA / 화풍 | 종합 평균 | 상세 점수 (후킹/대본/장면/자막/사운드) | 상태 |
| :---: | :---: | :---: | :---: | :---: | :---: | :---: | :---: |
| **Run 1** | AI | AI 자동화 마스터 클래스 수강권 | M3 맥북으로 AI 수익화 시작하는 법 | Motivation / Cinematic | **55.0점** | (50 / 50 / 75 / 50 / 50) | 업로드 보류 |
| **Run 2** | 부업 | 무자본 1인 창업 올인원 패키지 | M3 맥북으로 AI 수익화 시작하는 법 | Motivation / Cinematic | **55.0점** | (50 / 50 / 75 / 50 / 50) | 업로드 보류 |
| **Run 3** | 전자책 | 월 100만원 수익형 전자책 템플릿 | M3 맥북으로 AI 수익화 시작하는 법 | Storytelling / Hyperrealistic | **78.0점** | (80 / 85 / 75 / 70 / 80) | 업로드 보류 |
| **Run 4** | 커피 | 가성비 홈카페 에스프레소 머신 | 노트북 하나로 월 100만원 버는 법 | Storytelling / Anime | **78.0점** | (80 / 85 / 75 / 70 / 80) | 업로드 보류 |
| **Run 5** | 건강 | 정관장 홍삼정 에브리타임 | 피로에 지친 당신, 이걸 몰랐다면 손해! 💥 | Emotional / Documentary | **75.6점** | (80 / 78 / 75 / 75 / 70) | 업로드 보류 |
| **Run 6** | 반려견 | 유기농 저알러지 강아지 사료 | 알레르기 강아지, 기적의 사료? 🐶✨ | Storytelling / Anime | **78.0점** | (80 / 85 / 75 / 70 / 80) | 업로드 보류 |

> **참고**: 종합 평균 점수 80.0점 이상을 달성한 경우에만 유튜브 실시간 업로드가 개시되며, 80점 미만 시에는 로컬 파일 생성 후 자동 업로드가 차단 및 보류 처리됩니다.

---

## 3. 영상별 상세 평가 및 피드백 요약

`;

data.forEach(r => {
  const res = r.result || {};
  const qa = res.preUploadAnalysis || {};
  const sc = qa.scores || {};
  const ev = qa.evaluations || {};
  const ans = qa.answers || {};
  
  const avg = Object.keys(sc).length ? (Object.values(sc).reduce((a,b)=>a+b, 0) / Object.keys(sc).length).toFixed(1) : 'N/A';
  
  md += `### 🎬 Run ${r.index} [${r.forcedParams.category}] - ${r.forcedParams.productTitle}
* **영상 제목**: ${res.scriptData ? res.scriptData.title : 'N/A'}
* **적용 DNA**: Style DNA \`${res.style_dna || 'N/A'}\` / 비주얼 화풍 \`${res.used_style || 'N/A'}\`
* **품질 평점**: **${avg}점** (후킹: ${sc.hookStrength || 0} \| 대본: ${sc.scriptContent || 0} \| 장면: ${sc.sceneVisuals || 0} \| 자막: ${sc.subtitleAesthetics || 0} \| 사운드: ${sc.soundDesign || 0})

#### 📝 에이전트 상세 평가 (Vision & Writer Critic)
* **후킹 강도**: ${ev.hookStrength || '데이터 없음'}
* **대본 구성**: ${ev.scriptContent || '데이터 없음'}
* **비주얼 연출**: ${ev.sceneVisuals || '데이터 없음'}
* **자막 가독성**: ${ev.subtitleAesthetics || '데이터 없음'}

#### 💡 쇼츠 연구소장(Researcher)의 분석 및 개선 제안
* **시청자가 멈추는 이유 (Hook Stop)**: ${ans.q1_hook_stop || '데이터 없음'}
* **핵심 이탈 요인 (Dropoff Factor)**: ${ans.q2_dropoff || '데이터 없음'}
* **바이럴 인기 영상과의 차이**: ${ans.q3_diff_from_viral || '데이터 없음'}
* **차기 영상 필수 수정 요구사항 (Must Fix)**: **${ans.q4_must_fix || '데이터 없음'}**
* **예상 조회수**: ${ans.q5_expected_views || 0}회
* **조회수를 10배 끌어올리기 위한 조언**: ${ans.q6_multiplier_10x || '데이터 없음'}

---
`;
});

md += `

## 4. 품질 분석 및 행동 지침 (Key Takeaways)

1. **상업성 배제 및 UGC 진정성 확보**:
   * 대다수의 평가에서 **"제품 제시 이후 뻔한 광고로 흘러가 이탈 우려"** 또는 **"지나치게 인위적인 AI 비주얼이 UGC의 진정성을 해친다"**는 점이 고질적으로 지적되었습니다.
   * 해결 방안: 초반부터 상품을 직접 내세우는 대신, 실제 사용자가 겪을 수 있는 **극도로 구체적인 문제 상황(예: '우리 강아지가 하루종일 긁는 상황')을 먼저 묘사**하거나 **수익 정산 내역, 전후 비교 샷 등 실제 수치 기반 증거를 선배치**해야 합니다.

2. **예측 가능한 구성 탈피**:
   * 전형적인 '문제 제시 - 상품 해결책 - 혜택 강조 - CTA'의 구조는 이탈을 유발합니다. 
   * 대본 기획 에이전트(Writer)에게 상식을 뒤엎는 **반전 요소나 후킹 가이드라인**의 가중치를 더 높게 인가하여 대본의 입체감을 불어넣어야 합니다.

3. **실제 데이터 반영 및 자가 학습(Self-Improvement) 고도화**:
   * 점수가 높았던 Run 3, 4, 6의 성공적인 스타일과 화풍(Hyperrealistic, Anime) 및 스토리텔링 방식을 바탕으로 다음 세대 AI 영상 창작 규칙을 갱신합니다.
`;

const outputPath = path.join(__dirname, 'quality_audit_report.md');
fs.writeFileSync(outputPath, md, 'utf-8');
console.log('Report generated at:', outputPath);
