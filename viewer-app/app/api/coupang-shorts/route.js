import { NextResponse } from 'next/server';

function getFallbackProductImage(title) {
  if (!title) return 'https://images.unsplash.com/photo-1523275335684-37898b6baf30?w=500';
  const lowerTitle = title.toLowerCase();
  
  // Meat / BBQ
  if (/차돌박이|삼겹살|고기|갈비|등심|안심|육회|한우|돈육|우육|스테이크|대패|우삼겹|bbq|meat|beef|pork/.test(lowerTitle)) {
    return 'https://images.unsplash.com/photo-1603048588665-791ca8aea617?w=500'; // high-quality beef/meat
  }
  // Seafood
  if (/회|연어|새우|게|조개|굴|오징어|낙지|쭈꾸미|생선|갈치|고등어|seafood|fish|shrimp/.test(lowerTitle)) {
    return 'https://images.unsplash.com/photo-1534080391025-09795d197360?w=500'; // seafood
  }
  // Fruits
  if (/사과|배|귤|오렌지|딸기|포도|샤인머스캣|수박|멜론|바나나|과일|fruit|apple|strawberry/.test(lowerTitle)) {
    return 'https://images.unsplash.com/photo-1610970881699-44a5587caa90?w=500'; // fresh fruits
  }
  // Vegetables
  if (/샐러드|양상추|토마토|당근|오이|고구마|감자|마늘|채소|야채|vegetable|salad/.test(lowerTitle)) {
    return 'https://images.unsplash.com/photo-1540420773420-3366772f4999?w=500'; // fresh salad/veg
  }
  // Tech / Computers
  if (/노트북|컴퓨터|키보드|마우스|모니터|폰|스마트폰|아이폰|갤럭시|태블릿|ipad|laptop|computer|phone/.test(lowerTitle)) {
    return 'https://images.unsplash.com/photo-1526738549149-8e07eca6c147?w=500'; // tech gadget
  }
  // Coffee / Beverage
  if (/커피|원두|라떼|음료|차|주스|탄산|에이드|coffee|tea|beverage/.test(lowerTitle)) {
    return 'https://images.unsplash.com/photo-1509042239860-f550ce710b93?w=500'; // coffee
  }
  // Clothes / Fashion
  if (/옷|바지|티셔츠|셔츠|아우터|패딩|자켓|원피스|신발|운동화|가방|fashion|clothes|shoes|bag/.test(lowerTitle)) {
    return 'https://images.unsplash.com/photo-1483985988355-763728e1935b?w=500'; // fashion
  }
  // Cosmetics / Beauty
  if (/화장품|스킨|로션|에센스|크림|립스틱|팩|뷰티|cosmetic|beauty/.test(lowerTitle)) {
    return 'https://images.unsplash.com/photo-1556228720-195a672e8a03?w=500'; // cosmetics
  }
  // Default watch / lifestyle item
  return 'https://images.unsplash.com/photo-1523275335684-37898b6baf30?w=500';
}

function getFallbackShorts(productTitle) {
  const lowerTitle = (productTitle || '').toLowerCase();
  
  // 1. Food / Meat / Seafood
  if (/차돌박이|삼겹살|고기|갈비|등심|안심|육회|한우|돈육|우육|스테이크|대패|우삼겹|bbq|meat|beef|pork|회|연어|새우|게|조개|굴|오징어|낙지|쭈꾸미|생선|갈치|고등어|seafood|fish|shrimp|만두|라면|푸드|음식|맛있는|식품/.test(lowerTitle)) {
    return {
      title: `🚨 쿠팡 품절대란! 맛있는 ${productTitle.slice(0, 15)} 솔직 후기`,
      hook: "이거 한 번 먹어보면 다른 건 눈에도 안 들어옵니다!",
      script: `요즘 입소문 장난 아닌 꿀맛 아이템 가져왔습니다. 바로 ${productTitle} 입니다. 조리하기도 정말 간편하고, 직접 먹어보니 고소한 풍미와 쫄깃한 식감이 진짜 미쳤습니다. 가성비도 훌륭해서 집에서 한 끼 뚝딱 해결하거나 술안주로 즐기기 딱 좋습니다. 고민은 배송만 늦출 뿐입니다. 최저가 할인 정보와 구매 링크는 댓글창에 남겨두었으니 지금 바로 확인해 보세요!`,
      visualCues: "0~3초: 맛있게 조리된 음식 줌인하며 '군침 도는 비주얼' 자막\n3~15초: 노릇노릇 구워지거나 요리되는 모션 컷\n15~끝: 댓글창 화살표와 할인 링크 유도 안내",
      estimatedDuration: "40s"
    };
  }

  // 2. Cosmetics / Beauty
  if (/화장품|스킨|로션|에센스|크림|립스틱|팩|뷰티|cosmetic|beauty|세럼|토너|샴푸/.test(lowerTitle)) {
    return {
      title: `✨ SNS 난리난 꿀피부 치트키! ${productTitle.slice(0, 15)} 솔직 리뷰`,
      hook: "피부 푸석해서 고민이신 분들 제발 이 영상 3초만 보세요!",
      script: `요즘 뷰티 크리에이터들이 극찬하는 아이템, 바로 ${productTitle} 입니다. 끈적임 없이 부드럽게 발리면서 보습력이 하루 종일 유지됩니다. 민감한 피부에도 자극 걱정 없이 쏙 스며들어서 데일리 케어로 정말 좋습니다. 매끈한 피부 변화를 직접 경험해 보세요. 상세 정보와 할인 구매 링크는 댓글창에 남겨뒀으니 지금 확인하세요!`,
      visualCues: "0~3초: 화장품 제형이 부드럽게 발리는 컷 노출하며 '피부 광채' 자막\n3~15초: 수분 촉촉한 피부 상태 비포애프터 강조\n15~끝: 고정 댓글창 화살표 포인트 그래픽",
      estimatedDuration: "40s"
    };
  }

  // 3. Tech / Electronics
  if (/노트북|컴퓨터|키보드|마우스|모니터|폰|스마트폰|아이폰|갤럭시|태블릿|ipad|laptop|computer|phone|가전|전자|블루투스|스피커/.test(lowerTitle)) {
    return {
      title: `💻 삶의 질 수직 상승! 스마트 추천템 ${productTitle.slice(0, 15)} 분석`,
      hook: "아직도 이거 안 쓰시는 분 있나요? 일의 효율이 2배 올라갑니다.",
      script: `스마트한 라이프를 위한 필수 추천 아이템, 바로 ${productTitle} 입니다. 세련된 디자인은 기본이고, 핵심 기능들의 반응 속도와 편의성이 진짜 미쳤습니다. 가성비까지 훌륭해서 직장인이나 대학생 분들께 강력 추천합니다. 늦기 전에 구매하시는 걸 추천드려요. 댓글창에 최저가 링크 남겨둘 테니 지금 바로 득템하세요!`,
      visualCues: "0~3초: 세련된 기기 외관 줌인하며 '미래형 라이프' 자막\n3~15초: 작동 모습 및 편리한 기능 시뮬레이션 강조\n15~끝: 댓글창 안내 및 최저가 링크 강조 그래픽",
      estimatedDuration: "40s"
    };
  }

  // 4. Default / Generic Lifestyle
  return {
    title: `🚨 삶의 질 2배 상승! 쿠팡 핫아이템 ${productTitle.slice(0, 15)} 솔직 후기`,
    hook: "진짜 돈 낭비하지 마시고 제발 이 영상 3초만 보세요!",
    script: `요즘 입소문으로 품절 대란인 꿀템 가져왔습니다. 바로 ${productTitle} 입니다. 직접 사용해보니 왜 다들 추천하는지 알겠더라고요. 마감 퀄리티도 훌륭하고 가성비도 끝판왕이라 일상생활의 편리함이 확 달라집니다. 더 자세한 상세 정보와 할인 구매 링크는 댓글창에 남겨뒀으니 지금 바로 확인해 보세요!`,
    visualCues: "0~3초: 제품 대표 이미지 빠르게 줌인하며 강력 자막 표시\n3~15초: 제품 장점 설명하며 강조 자막 처리\n15~끝: 고정 댓글창 화살표 그래픽 효과",
    estimatedDuration: "40s"
  };
}

export async function POST(request) {
  try {
    const { url, affiliateLink, tone, manualTitle } = await request.json();

    if (!url || !url.trim().startsWith('http')) {
      return NextResponse.json(
        { success: false, error: '유효한 쿠팡 상품 URL을 입력해 주세요.' },
        { status: 400 }
      );
    }

    let productTitle = manualTitle || '';
    let productImage = '';
    let productPrice = '';
    let productDesc = '';

    const apiKey = process.env.GEMINI_API_KEY;

    // Follow redirect manually to get target URL (e.g. link.coupang.com -> www.coupang.com/vp/products/...)
    let targetUrl = url;
    try {
      const redirectCheck = await fetch(url, { redirect: 'manual' });
      if (redirectCheck.status === 301 || redirectCheck.status === 302) {
        targetUrl = redirectCheck.headers.get('location') || url;
      }
    } catch (e) {
      console.error('[Redirect Resolve Error]', e);
    }

    try {
      const parsedUrl = new URL(targetUrl);
      if (parsedUrl.hostname.includes('coupang.com')) {
        const pathParts = parsedUrl.pathname.split('/');
        const productsIdx = pathParts.indexOf('products');
        if (productsIdx !== -1 && pathParts[productsIdx + 1]) {
          productId = pathParts[productsIdx + 1];
        }
        // Clean URL to avoid tracking parameter issues with Akamai/Google search
        const itemId = parsedUrl.searchParams.get('itemId');
        parsedUrl.search = itemId ? `?itemId=${itemId}` : '';
        targetUrl = parsedUrl.toString();
      }
    } catch (e) {
      console.error('[Clean URL Error]', e);
    }

    if (!productTitle) {
      try {
        const response = await fetch(targetUrl, {
          headers: {
            'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
            'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,image/webp,image/apng,*/*;q=0.8',
            'Accept-Language': 'ko-KR,ko;q=0.9,en-US;q=0.8,en;q=0.7',
            'Cache-Control': 'no-cache'
          },
          next: { revalidate: 0 }
        });

        if (response.ok) {
          const html = await response.text();

          const ogTitleMatch = html.match(/<meta[^>]*property=["']og:title["'][^>]*content=["']([^"']+)["']/i) || 
                               html.match(/<meta[^>]*name=["']title["'][^>]*content=["']([^"']+)["']/i);
          const ogImageMatch = html.match(/<meta[^>]*property=["']og:image["'][^>]*content=["']([^"']+)["']/i);
          const ogDescMatch = html.match(/<meta[^>]*property=["']og:description["'][^>]*content=["']([^"']+)["']/i);

          productTitle = ogTitleMatch ? ogTitleMatch[1] : '';
          productImage = ogImageMatch ? ogImageMatch[1] : '';
          productDesc = ogDescMatch ? ogDescMatch[1] : '';

          if (productTitle) {
            productTitle = productTitle.replace(/ - 쿠팡!/g, '').replace(/ - 쿠팡/g, '').trim();
          }

          const priceMatch = productDesc.match(/([0-9,]+원)/);
          if (priceMatch) {
            productPrice = priceMatch[1];
          }
        }
      } catch (e) {
        console.error('[Coupang Scraper Error]', e);
      }
    }

    if (!productTitle && apiKey) {
      console.log('Scraper failed or returned empty. Falling back to Gemini Google Search tool...');
      try {
        const queryTerm = productId ? `Coupang product ID ${productId}` : `Coupang product page at URL: "${targetUrl}"`;
        const metadataPrompt = `Search Google for the ${queryTerm}.
Find the following information about this product and return it:
1. Product Title (e.g. "돌돌말이 대패삼겹살" or "곰곰 차돌박이")
2. Price (e.g. 15,000원)
3. Brief description of the product

Return your response as a JSON object inside a code block:
\`\`\`json
{
  "title": "Product Title",
  "price": "Price",
  "description": "Description"
}
\`\`\``;

        let geminiSearchUrl = '';
        let headers = { 'Content-Type': 'application/json' };
        let requestBody = {};

        if (apiKey.startsWith('ya29.')) {
          const projectNumber = process.env.GEMINI_PROJECT_NUMBER || '773040580705';
          const region = 'us-central1';
          geminiSearchUrl = `https://${region}-aiplatform.googleapis.com/v1/projects/${projectNumber}/locations/${region}/publishers/google/models/gemini-1.5-flash:generateContent`;
          headers['Authorization'] = `Bearer ${apiKey}`;
          requestBody = {
            contents: [{ role: 'user', parts: [{ text: metadataPrompt }] }],
            tools: [{ googleSearchRetrieval: {} }],
            generationConfig: { temperature: 0.1 }
          };
        } else {
          geminiSearchUrl = `https://generativelanguage.googleapis.com/v1beta/models/gemini-flash-latest:generateContent?key=${apiKey}`;
          requestBody = {
            contents: [{ parts: [{ text: metadataPrompt }] }],
            tools: [{ googleSearch: {} }],
            generationConfig: { temperature: 0.1 }
          };
        }

        const searchRes = await fetch(geminiSearchUrl, {
          method: 'POST',
          headers,
          body: JSON.stringify(requestBody)
        });

        if (searchRes.ok) {
          const searchData = await searchRes.json();
          const parts = searchData.candidates?.[0]?.content?.parts || [];
          let textCombined = '';
          for (const part of parts) {
            if (part.text) {
              textCombined += part.text;
            }
          }

          if (textCombined) {
            const jsonMatch = textCombined.match(/```json([\s\S]*?)```/) || textCombined.match(/{([\s\S]*?)}/);
            if (jsonMatch) {
              const jsonStr = jsonMatch[0].includes('```') ? jsonMatch[1].trim() : jsonMatch[0].trim();
              const parsedMetadata = JSON.parse(jsonStr);
              if (parsedMetadata.title) {
                productTitle = parsedMetadata.title;
              }
              if (parsedMetadata.price) {
                productPrice = parsedMetadata.price;
              }
              if (parsedMetadata.description) {
                productDesc = parsedMetadata.description;
              }
              console.log('Successfully retrieved product info via search fallback. Parsed:', parsedMetadata);
            } else {
              console.error('Failed to parse JSON from search fallback response. Raw text:', textCombined);
            }
          } else {
            console.error('Empty text parts in search fallback response:', JSON.stringify(searchData, null, 2));
          }
        } else {
          console.error('[Gemini Google Search Fallback Error] Status:', searchRes.status, await searchRes.text());
        }
      } catch (searchError) {
        console.error('[Gemini Google Search Fallback Error]', searchError);
      }
    }

    if (!productTitle) {
      productTitle = '쿠팡 파트너스 분석 상품';
    }

    if (!productImage) {
      productImage = getFallbackProductImage(productTitle);
    }

    const toneInstruction = {
      funny: '시청자가 킥킥대며 웃을 수 있도록 위트 있고 유머러스한 어조',
      bold: '단점을 감추지 않고 솔직하고 자극적으로 장단점을 찌르는 직설적인 어조',
      trusted: '전문 리뷰어처럼 객관적인 스펙과 실제 후기를 바탕으로 한 신뢰감 넘치는 어조'
    }[tone] || '신뢰감 넘치는 어조';

    // 3. Prepare AI Prompt
    if (!apiKey) {
      // Fallback response if no Gemini API Key is configured
      return NextResponse.json({
        success: true,
        product: {
          title: productTitle,
          image: productImage || 'https://images.unsplash.com/photo-1523275335684-37898b6baf30?w=500',
          price: productPrice || '가격 정보 없음',
          affiliateLink: affiliateLink || url
        },
        shorts: {
          title: `[쿠팡 추천] ${productTitle.slice(0, 20)}`,
          hook: "진짜 돈 낭비하지 마시고 제발 이 영상 3초만 보세요!",
          script: `요즘 이거 정말 핫하죠? ${productTitle} 입니다. 직접 써보니까 왜 다들 극찬하는지 알겠더라고요. 우선 가성비가 엄청납니다. 단돈 ${productPrice || '저렴한 가격'}에 이 정도 퀄리티면 무조건 이득입니다. 고민하고 계셨다면 늦기 전에 구매하시는 걸 강력 추천합니다. 댓글창에 할인 혜택 링크 남겨두었으니 지금 바로 확인해 보세요!`,
          visualCues: "0~3초: 상품 대표 이미지 빠르게 줌인하며 강력 자막 표시\n3~10초: 제품 장점 설명하며 강조 자막 처리\n10~아웃트로: 고정 댓글창 화살표 그래픽 효과",
          estimatedDuration: "40s"
        }
      });
    }

    const systemPrompt = `당신은 쿠팡 파트너스(Coupang Partners) 제휴 마케팅에 최적화된 고효율 유튜브 쇼츠 및 인스타그램 릴스 스크립트를 기획하는 전문 마케터이자, 개성 넘치는 인간 크리에이터입니다.
당신은 구글 실시간 검색 도구(Google Search Tool)를 사용할 수 있습니다. 사용자가 입력한 상품명을 바탕으로, 반드시 구글 검색을 수행하여 해당 상품의 실제 상세 스펙(예: 용량, 크기, 성분, 전자기기의 사양 수치 등)과 실사용자들이 꼽는 진짜 장단점 및 특징을 조사하세요.

작성 지침 (脫양산형 인간 크리에이터 기법):

1. **상투적인 광고 멘트 전면 금지 (Blacklist BAN)**:
   - 다음 단어나 문장은 공장형 양산 느낌을 주므로 절대 대본에 포함하지 마세요:
     * "오늘 소개할 추천템은", "가성비 미쳤습니다", "고민은 배송을 늦출 뿐", "이거 완전 대박입니다", "꼭 사셔야 합니다", "추천템 가져왔습니다", "리뷰해보겠습니다", "안녕하세요" 등.
2. **일상 밀착 공감 오프닝 (Hooking)**:
   - 첫 3초 오프닝 훅은 딱딱한 제품명이나 무의미한 인사 대신, 일상에서 누구나 겪을 만한 곤란하거나 공감되는 상황 에피소드로 상황을 여세요.
     * (예시) "아침에 커피 마시려다 컴퓨터에 쏟아보신 적 있죠? 제가 그랬습니다..." / "고기 구울 때 온 집안에 연기 차서 스트레스 받으셨던 분?"
3. **스펙의 직관적 체감 비유 (Visualization)**:
   - 기계적으로 수치(예: "450g", "120W 출력")만 읽지 말고, 시청자가 머릿속에 바로 그릴 수 있는 일상 사물이나 상황으로 비유하여 풀어쓰세요.
     * (예시) "테이크아웃 커피 한 잔보다 가볍습니다" / "눈 깜짝할 새 드라이가 끝납니다"
4. **솔직한 아쉬움(단점) 1스푼 반영 (신뢰도 확보)**:
   - 모든 면이 완벽한 제품은 없습니다. 검색된 실제 리뷰어들의 글에서 아주 사소한 아쉬움이나 불편한 점(단점) 하나를 중간에 솔직하게 털어놓으세요.
     * (예시) "다만 선이 좀 짧아서 아쉽긴 한데..." / "부피가 좀 있어서 들고 다니긴 힘든데..."
     * 단점을 숨기지 않고 드러내야 시청자는 광고가 아닌 "진짜 내돈내산 리얼 후기"로 신뢰하여 최종 구매 전환율이 2배 이상 상승합니다.
5. **말투(톤앤매너)**: 반드시 다음 말투 지침을 따라야 하며, 짧고 빠른 템포의 구어체로 전개하세요: "${toneInstruction}".
6. **아웃트로**: 자연스럽게 댓글창의 제휴 링크로 클릭을 유도하는 구매 유도 멘트(Call to Action)를 삽입해 주세요. (예: "더 자세한 정보와 최저가 구매는 댓글창 할인 링크를 클릭하세요!")

반드시 아래와 같은 JSON 형식으로만 응답해 주세요. 마크다운 기호(\`\`\`json 등)와 주석을 포함하지 않고 순수 JSON 코드만 리턴해야 합니다.
{
  "title": "유튜브 업로드용 쇼츠 제목",
  "hook": "강력한 3초 오프닝 훅",
  "script": "성우가 나레이션으로 읽을 순수 대본 텍스트",
  "visualCues": "구체적인 비주얼 연출 지시 및 추천 자막 내용",
  "estimatedDuration": "예상 시간 (예: 45s)"
}`;

    const userPrompt = `${systemPrompt}

[쿠팡 상품 데이터 정보]
상품명: ${productTitle}
대표 이미지: ${productImage}
설명 및 특징: ${productDesc}
수익화 링크: ${affiliateLink || url}
가격: ${productPrice || '확인 필요'}`;

    let geminiUrl = '';
    const headers = { 'Content-Type': 'application/json' };
    let requestBody = {};

    if (apiKey.startsWith('ya29.')) {
      const projectNumber = process.env.GEMINI_PROJECT_NUMBER || '773040580705';
      const region = 'us-central1';
      geminiUrl = `https://${region}-aiplatform.googleapis.com/v1/projects/${projectNumber}/locations/${region}/publishers/google/models/gemini-1.5-flash:generateContent`;
      headers['Authorization'] = `Bearer ${apiKey}`;
      requestBody = {
        contents: [{ role: 'user', parts: [{ text: userPrompt }] }],
        tools: [{ googleSearchRetrieval: {} }],
        generationConfig: { temperature: 0.5, maxOutputTokens: 2048 }
      };
    } else {
      geminiUrl = `https://generativelanguage.googleapis.com/v1beta/models/gemini-flash-latest:generateContent?key=${apiKey}`;
      requestBody = {
        contents: [{ parts: [{ text: userPrompt }] }],
        tools: [{ googleSearch: {} }],
        generationConfig: { temperature: 0.5, topP: 0.95 }
      };
    }

    const response = await fetch(geminiUrl, {
      method: 'POST',
      headers,
      body: JSON.stringify(requestBody)
    });

    let finalShorts = getFallbackShorts(productTitle);

    if (response.ok) {
      const resData = await response.json();
      let resText = resData.candidates?.[0]?.content?.parts?.[0]?.text;
      if (resText) {
        try {
          resText = resText.replace(/```json/g, '').replace(/```/g, '').trim();
          const parsed = JSON.parse(resText);
          if (parsed.script && parsed.hook) {
            finalShorts = parsed;
          }
        } catch (e) {
          console.error('[Gemini Scrape Parse Error] parsed error', e);
        }
      }
    }

    return NextResponse.json({
      success: true,
      product: {
        title: productTitle,
        image: productImage || 'https://images.unsplash.com/photo-1523275335684-37898b6baf30?w=500',
        price: productPrice || '쿠팡 최저가',
        affiliateLink: affiliateLink || url
      },
      shorts: finalShorts
    });

  } catch (error) {
    console.error('[Coupang Shorts API Error]', error);
    return NextResponse.json(
      { success: false, error: '상품 분석 중 오류가 발생했습니다: ' + error.message },
      { status: 500 }
    );
  }
}
