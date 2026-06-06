# 🎨 [맹칠컴퍼니] 비주얼 퀄리티 마스터 & 무료 고화질 스톡 API 연동 가이드

유튜브 쇼츠에서 조회수를 끌어올리고 첫 1만원 매출을 발생시키기 위해서는 **시각적 첫인상(Aesthetic First Impression)**이 가장 중요합니다. 
생성 또는 검색되는 이미지가 주제와 맞지 않거나 화질이 떨어지는 문제를 해결하고 전문가 수준의 영상을 만들기 위한 마스터 가이드입니다.

---

## 1. 1분 만에 고화질 스톡 API 키 발급 및 등록하기 (강력 권장)

기본 스톡 엔진인 `LoremFlickr`는 키가 필요 없으나 키워드와 맞지 않는 이미지를 가져올 때가 많습니다. **Pexels**를 연동하면 100% 주제에 맞는 9:16 고화질 세로형 이미지를 가져올 수 있습니다.

### 🔑 Pexels API Key 발급 순서:
1. [Pexels 공식 홈페이지](https://www.pexels.com/api/)에 접속합니다.
2. 무료 회원가입(Google 또는 이메일)을 완료합니다.
3. API 메뉴에서 **"Your API Key"** 탭을 클릭하고 새로운 키를 생성합니다. (비상업적/개인 부업 용도로 즉시 발급 가능)
4. 생성된 영문-숫자 혼합 키를 복사합니다.

### ⚙️ 시스템 등록 방법:
`viewer-app/.env.local` 파일을 메모장이나 에디터로 열고 아래 줄을 추가합니다.
```env
PEXELS_API_KEY=여기에_복사한_Pexels_API_키를_넣으세요
```
*서버를 실행 중이었다면 수정한 후 서버를 재기동(restart)해야 환경변수가 반영됩니다.*

---

## 2. Flux AI 이미지 생성 골든 프롬프트 공식

자동 생성되는 프롬프트의 퀄리티를 수동으로 튜닝하거나 간편 편집기에서 AI 이미지 재성성을 누를 때 참고할 수 있는 **골든 템플릿**입니다.

### 🌟 숏폼용 이미지 생성 공식:
> **`Professional [카테고리] photography, [핵심 대상에 대한 정밀 묘사], [화면 구도 및 앵글], [카메라 렌즈/F값], [조명 기법], [색조와 전체 무드], vertical 9:16 framing, highly aesthetic, commercial-grade, 8k, no text, no watermarks`**

### ✍️ 상황별 추천 프롬프트 예시:
- **💻 노트북/부업 주제**: 
  `Professional commercial photography, cozy dark room with a warm desk lamp lighting a modern laptop, screen glowing, minimalist composition, warm tone, vertical 9:16 framing, 8k, no text`
- **🍵 건강식품/홍삼 주제**: 
  `Professional macro product shot of rich red ginseng extract dripping slowly from a wooden spoon, golden natural morning light, organic luxury concept, vertical 9:16 framing, 8k, no text`
- **☕ 직장인 라이프스타일**: 
  `Professional lifestyle portrait of a happy young Korean office worker smiling, looking at a tablet next to coffee in a bright sunlit cafe, soft depth of field, vertical 9:16 framing, 8k`

---

## 3. 이상한 손가락, 기괴한 뒤틀림 방지 팁 (네거티브 필터링)

AI 이미지 생성 시 손가락이 6개로 묘사되거나 얼굴이 찌그러지는 현상을 피하기 위해서는 프롬프트 끝에 다음과 같은 **네거티브 키워드**를 명시해야 합니다.

- `no distorted anatomy, no weird fingers, no double heads` (신체 뒤틀림 방지)
- `no text, no watermark, no captions, no writing` (기괴한 영어 단어가 이미지에 글자로 박히는 현상 차단)

*현재 맹칠컴퍼니 자동화 엔진은 프롬프트 생성 시 위 네거티브 키워드를 자동으로 주입하도록 업그레이드되어 있습니다.*
