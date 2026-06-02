<!-- version: monetization_tool_v1 -->
# 📈 쇼츠 수익화 및 상품 매칭 엔진 (monetization_tool)

이 도구는 수익화 총괄(현빈) 에이전트가 조회수 중심의 분석을 넘어 **실제 제휴 마케팅(쿠팡 파트너스 등) 수익 및 전환율을 시뮬레이션하고 극대화**할 수 있도록 설계된 분석 엔진입니다.

## 주요 기능

1. **수익성 높은 테마 분석 (Topic Analysis)**:
   건강, 금융, 자기계발, AI, 다이어트, 생활꿀팁 등 6대 핵심 주제의 타겟 구매력과 RPM 가치를 비교 분석합니다.

2. **쿠팡 파트너스 상품 매칭 (Product Selection)**:
   단가, 전환율(CVR), 클릭률(CTR), 경쟁강도를 입체적으로 평가하여 최적의 추천 상품을 선별합니다.

3. **수익성 스코어링 (Revenue Prioritization)**:
   $조회수 \times CTR \times CVR \times 단가 \times 수수료$ 공식을 활용하여 수익성 스코어를 매깁니다. 단순 조회수 100만 쇼츠보다 10만 조회수로 고수익을 내는 Niche 셋업을 탐색합니다.

4. **웹페이지 쇼츠 제작기 자동 연동 (Shorts Config Generation)**:
   선정된 1위 상품과 키워드를 기반으로 웹페이지 쇼츠 제작기 API (`/api/generate-shorts`) 및 파이썬 인코더가 즉시 실행할 수 있는 JSON 설정 템플릿을 자동으로 출력합니다.

5. **수익 DB 축적 및 일일 보고서**:
   - `_company/_shared/monetization_db.json`에 의사결정 이력을 누적합니다.
   - `_company/_shared/daily_revenue_report.md`에 오늘의 최고 수익 예측, 추천 카테고리, 시장 동향 및 자동 제작 JSON 템플릿을 문서화합니다.

## CLI 실행 명령어

```bash
python _company/_agents/business/tools/monetization_tool.py
```

## 출력 산출물

- **Daily Report**: `_company/_shared/daily_revenue_report.md` (마크다운 양식 보고서)
- **Monetization DB**: `_company/_shared/monetization_db.json` (데이터베이스 축적용 JSON)
