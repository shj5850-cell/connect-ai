#!/usr/bin/env python3
# version: web_search_v2
"""Brave/DuckDuckGo 검색 및 경쟁사 데이터 수집 도구 - 리서처 에이전트 전용.
실시간 웹 검색 및 로컬 LLM(Ollama) 연동 지원.
"""
import os, sys, json, random, urllib.request, urllib.parse, urllib.error, re
from os import path
from datetime import datetime

HERE = os.path.dirname(os.path.abspath(__file__))
CONFIG = os.path.join(HERE, "web_search.json")
REPORT = os.path.join(HERE, "web_search_report.md")

# Default mock dataset in case of offline mode or fallback
MOCK_COMPETITORS = [
    {"name": "ChatBase", "domain": "chatbase.co", "category": "AI Chatbot Builder", "pricing": "$19-$399/mo", "est_monthly_revenue": "$250K", "strategy": "PDF/Website learning + Embed widget"},
    {"name": "Copy.ai", "domain": "copy.ai", "category": "AI Copywriting", "pricing": "$36-$249/mo", "est_monthly_revenue": "$1.2M", "strategy": "B2B marketing copy workflows"},
    {"name": "PDF.ai", "domain": "pdf.ai", "category": "Chat with PDF", "pricing": "$0-$15/mo", "est_monthly_revenue": "$80K", "strategy": "Document analysis & citation builder"},
    {"name": "Dante-AI", "domain": "dante-ai.com", "category": "Custom AI Chatbots", "pricing": "$9-$399/mo", "est_monthly_revenue": "$45K", "strategy": "Enterprise knowledge base builder"},
    {"name": "Jasper", "domain": "jasper.ai", "category": "Enterprise Content AI", "pricing": "$39-$150/mo", "est_monthly_revenue": "$3.5M", "strategy": "Large-scale marketing content pipeline"},
    {"name": "Midjourney", "domain": "midjourney.com", "category": "AI Image Generation", "pricing": "$10-$120/mo", "est_monthly_revenue": "$15M", "strategy": "Discord bot subscription model"},
    {"name": "v0.dev", "domain": "v0.dev", "category": "UI Code Generation", "pricing": "$0-$20/mo", "est_monthly_revenue": "$500K", "strategy": "Vercel integration & front-end generation"},
    {"name": "PhotoAI", "domain": "photoai.com", "category": "AI Photographer", "pricing": "$29-$99/mo", "est_monthly_revenue": "$120K", "strategy": "Solopreneur build, influencer avatars"},
    {"name": "InteriorAI", "domain": "interiorai.com", "category": "AI Interior Design", "pricing": "$29-$299/mo", "est_monthly_revenue": "$40K", "strategy": "Virtual staging & real estate design"},
    {"name": "Tome", "domain": "tome.app", "category": "AI Presentation Builder", "pricing": "$8-$20/mo", "est_monthly_revenue": "$300K", "strategy": "Interactive pitchdeck storytelling"},
    {"name": "Jenni AI", "domain": "jenni.ai", "category": "AI Academic Writer", "pricing": "$12-$20/mo", "est_monthly_revenue": "$180K", "strategy": "Citation integration & essay editing"},
    {"name": "AudioPen", "domain": "audiopen.ai", "category": "Voice to Text Refiner", "pricing": "$0-$120/yr", "est_monthly_revenue": "$25K", "strategy": "Clean unstructured voice notes"},
    {"name": "Feathery", "domain": "feathery.io", "category": "AI Form Builder", "pricing": "$0-$150/mo", "est_monthly_revenue": "$35K", "strategy": "Advanced workflow form logic"},
    {"name": "SiteGPT", "domain": "sitegpt.ai", "category": "AI Chatbot", "pricing": "$19-$99/mo", "est_monthly_revenue": "$60K", "strategy": "Zero-code setup custom support bots"},
    {"name": "Hume AI", "domain": "hume.ai", "category": "Empathic Voice Interface", "pricing": "API-usage", "est_monthly_revenue": "$90K", "strategy": "Conversational emotional analysis"},
    {"name": "Synthesia", "domain": "synthesia.io", "category": "AI Video Avatar", "pricing": "$22-$67/mo", "est_monthly_revenue": "$2.8M", "strategy": "Enterprise text-to-video training"},
    {"name": "ElevenLabs", "domain": "elevenlabs.io", "category": "AI Voice Synthesis", "pricing": "$5-$330/mo", "est_monthly_revenue": "$4M", "strategy": "High-fidelity text-to-speech API"},
    {"name": "Gamma", "domain": "gamma.app", "category": "AI Presentations & Docs", "pricing": "$8-$15/mo", "est_monthly_revenue": "$600K", "strategy": "Interactive web pages and decks"},
    {"name": "Julius AI", "domain": "julius.ai", "category": "AI Data Analyst", "pricing": "$20-$45/mo", "est_monthly_revenue": "$150K", "strategy": "Excel/CSV automatic graph & analysis"},
    {"name": "Cursor", "domain": "cursor.com", "category": "AI Code Editor", "pricing": "$20/mo", "est_monthly_revenue": "$2.5M", "strategy": "Premium IDE fork with deep agent features"},
]

def load_config():
    if not os.path.exists(CONFIG):
        return {"MOCK_ONLY": True}
    try:
        with open(CONFIG, "r", encoding="utf-8") as f:
            return json.load(f)
    except Exception:
        return {"MOCK_ONLY": True}

def get_ollama_config():
    # Read Ollama URL & Model from youtube_account.json if it exists
    try:
        yt_json = path.join(HERE, "..", "..", "youtube", "tools", "youtube_account.json")
        if path.exists(yt_json):
            with open(yt_json, "r", encoding="utf-8") as f:
                data = json.load(f)
                return {
                    "url": (data.get("OLLAMA_URL") or "http://127.0.0.1:11434").rstrip("/"),
                    "model": data.get("MODEL") or ""
                }
    except Exception:
        pass
    return {"url": "http://127.0.0.1:11434", "model": ""}

def fetch_ddg_results(query):
    url = 'https://html.duckduckgo.com/html/'
    data = urllib.parse.urlencode({'q': query}).encode('utf-8')
    req = urllib.request.Request(
        url,
        data=data,
        headers={
            'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36'
        }
    )
    try:
        with urllib.request.urlopen(req, timeout=12) as response:
            html = response.read().decode('utf-8', errors='ignore')
            snippets = re.findall(r'<a class="result__snippet"[^>]* href="([^"]*)">([\s\S]*?)</a>', html)
            titles = re.findall(r'<a[^>]*class="result__a"[^>]*href="([^"]*)">([\s\S]*?)</a>', html)
            
            results = []
            max_res = min(len(titles), len(snippets), 8)
            for idx in range(max_res):
                href = titles[idx][0]
                title = re.sub(r'<[^>]*>', '', titles[idx][1]).strip()
                snippet = re.sub(r'<[^>]*>', '', snippets[idx][1]).strip()
                results.append({
                    "title": title,
                    "url": href,
                    "snippet": snippet
                })
            return results
    except Exception as e:
        print(f"⚠️ DuckDuckGo 검색 실패: {e}", file=sys.stderr)
        return []

def query_local_llm(ollama_url, model, prompt):
    if not model:
        try:
            req = urllib.request.Request(f"{ollama_url}/api/tags")
            with urllib.request.urlopen(req, timeout=5) as r:
                models_data = json.loads(r.read().decode('utf-8'))
                models = [m["name"] for m in models_data.get("models", [])]
                if models:
                    model = models[0]
        except Exception:
            pass
    if not model:
        return None

    try:
        data = json.dumps({
            "model": model,
            "prompt": prompt,
            "stream": False,
            "options": {"temperature": 0.3}
        }).encode('utf-8')
        
        req = urllib.request.Request(
            f"{ollama_url}/api/generate",
            data=data,
            headers={'Content-Type': 'application/json'}
        )
        with urllib.request.urlopen(req, timeout=60) as r:
            res = json.loads(r.read().decode('utf-8'))
            return res.get("response", "").strip()
    except Exception as e:
        print(f"⚠️ 로컬 LLM 호출 실패: {e}", file=sys.stderr)
        return None

def extract_json_array(text):
    if not text:
        return None
    try:
        start = text.find('[')
        end = text.rfind(']')
        if start != -1 and end != -1:
            json_str = text[start:end+1]
            return json.loads(json_str)
    except Exception:
        pass
    return None

def main():
    if hasattr(sys.stdout, 'reconfigure'):
        sys.stdout.reconfigure(encoding='utf-8')
    if hasattr(sys.stderr, 'reconfigure'):
        sys.stderr.reconfigure(encoding='utf-8')
        
    cfg = load_config()
    query = sys.argv[1] if len(sys.argv) > 1 else cfg.get("QUERY", "AI 자동화 수익화 모델")
    mock_val = cfg.get("MOCK_ONLY", True)
    
    if isinstance(mock_val, str):
        mock_only = mock_val.lower() == "true"
    else:
        mock_only = bool(mock_val)
        
    print(f"🔍 리서처 웹 검색 실행: '{query}'")
    
    competitors = []
    real_results = []
    
    if mock_only:
        print("🧪 오프라인 모드(MOCK_ONLY=True) 작동 중. 모의 데이터로 분석 보고서를 생성합니다.")
        competitors = random.sample(MOCK_COMPETITORS, min(len(MOCK_COMPETITORS), 10))
    else:
        print("🌐 실제 웹 검색 모드(MOCK_ONLY=False) 작동 중. DuckDuckGo에서 실시간 정보를 가져옵니다.")
        real_results = fetch_ddg_results(query)
        
        if not real_results:
            print("⚠️ 검색 결과를 가져오지 못했습니다. 모의 데이터 모드로 전환합니다.")
            competitors = random.sample(MOCK_COMPETITORS, min(len(MOCK_COMPETITORS), 10))
        else:
            print(f"✅ 웹 검색 성공! {len(real_results)}개의 실시간 검색 결과를 가져왔습니다.")
            
            # Try to use local LLM to synthesize structured competitor list
            llm_cfg = get_ollama_config()
            ollama_url = llm_cfg["url"]
            model = llm_cfg["model"]
            
            # Format results for prompt
            results_text = ""
            for i, r in enumerate(real_results, 1):
                results_text += f"{i}. 제목: {r['title']}\n   링크: {r['url']}\n   설명: {r['snippet']}\n\n"
                
            prompt = f"""당신은 전문 시장 분석 에이전트입니다.
아래의 실시간 검색 결과를 바탕으로 검색된 비즈니스/서비스 중 가장 가치 있는 경쟁사 5곳의 구조화된 정보를 분석해 추출해 주세요.

[실시간 검색 결과]
{results_text}

추출된 정보는 반드시 아래 JSON 배열 형식으로만 답변해야 합니다. 마크다운 기호(```)나 설명 없이 오직 순수한 JSON만 반환하세요:
[
  {{
    "name": "서비스/회사 이름",
    "domain": "도메인 또는 URL (예: chatbase.co)",
    "category": "핵심 분야 (예: AI PDF 분석, AI 아바타 생성 등)",
    "pricing": "요금제 정보 (예: $19/mo 또는 무료체험 등)",
    "est_monthly_revenue": "추정 월 매출 (예: $50K, $100K 등, 검색결과 및 지식 기반으로 유추)",
    "strategy": "핵심 비즈니스 모델 및 차별화 전략"
  }}
]
"""
            print("🧠 [로컬 LLM을 통한 분석 및 구조화 진행 중...]")
            llm_response = query_local_llm(ollama_url, model, prompt)
            parsed_competitors = extract_json_array(llm_response)
            
            if parsed_competitors and isinstance(parsed_competitors, list) and len(parsed_competitors) > 0:
                print(f"✅ 로컬 LLM 분석 완료. {len(parsed_competitors)}개의 실시간 분석 데이터를 추출했습니다.")
                competitors = parsed_competitors
            else:
                print("⚠️ 로컬 LLM 분석 실패 또는 모델 미가동. 검색 결과 본문으로 직접 마크다운 리포트를 작성합니다.")
                
    # Generate report
    report_lines = [
        f"# 🔍 AI 자동화 경쟁사 분석 리서치 보고서",
        f"**검색 쿼리**: `{query}`",
        f"**조사 일시**: {datetime.now().strftime('%Y-%m-%d %H:%M')}",
        f"**모드**: {'모의 데이터 모드' if not real_results else '실시간 웹 검색 분석 모드'}",
        "",
    ]
    
    if competitors:
        report_lines.extend([
            "| 서비스명 | 분야 | 가격 요금제 | 추정 월매출 (USD) | 핵심 비즈니스 모델 / 차별화 전략 |",
            "|---|---|---|---|---|",
        ])
        for c in competitors:
            domain = c.get('domain', '')
            link = f"[{c.get('name', '링크')}]({domain})" if domain.startswith('http') else f"[{c.get('name', '링크')}](https://{domain})"
            report_lines.append(f"| {link} | {c.get('category', '-')} | {c.get('pricing', '-')} | **{c.get('est_monthly_revenue', '-')}** | {c.get('strategy', '-')} |")
            
        report_lines.extend([
            "",
            "## 💡 리서처 핵심 통찰 및 비즈니스 제안",
            "1. **실시간 정보 기반 빠른 대처**: 수집된 경쟁사들의 강점과 요금제를 벤치마킹하여 마이크로 SaaS 형태로 틈새 영역을 공략합니다.",
            "2. **API 결합형 비즈니스**: OpenAI/Anthropic API를 래핑하여 특정 문서 요약, 한국어 맞춤형 챗봇 등 세부 니치 영역에 초점을 맞추는 모델이 실현 가능성이 가장 높습니다.",
            "3. **1인 자동화 전략**: 서버 리포트 자동 생성, 광고, 정기구독으로 다량의 마이크로 SaaS를 병렬 운영하여 매출 파이프라인을 다각화합니다."
        ])
    else:
        # Fallback raw search results report
        report_lines.extend([
            "## 🌐 실시간 검색 결과 리스트",
            "",
            "| # | 제목 | 링크 | 핵심 스니펫 |",
            "|---|---|---|---|",
        ])
        for idx, r in enumerate(real_results, 1):
            report_lines.append(f"| {idx} | {r['title']} | [바로가기]({r['url']}) | {r['snippet']} |")
            
        report_lines.extend([
            "",
            "## 💡 리서처 핵심 통찰 및 비즈니스 제안",
            "1. **최신 정보 중심 분석**: 최근 검색 내용 기준, AI SaaS 시장의 진입 장벽이 낮아짐에 따라 단순 래퍼(Wrapper)보다는 특화 기능이 중요합니다.",
            "2. **특정 사용자 타겟팅**: 특정 업무(예: 부동산 가상 인테리어, PDF 학술용 주석 생성 등)에 최적화하여 틈새 시장을 확보해야 합니다."
        ])
        
    report = "\n".join(report_lines)
    
    with open(REPORT, "w", encoding="utf-8") as f:
        f.write(report)
        
    # Write CSV
    company_dir = path.join(HERE, "..", "..", "..")
    sessions_dir = os.path.join(company_dir, "sessions")
    csv_path = os.path.join(sessions_dir, "competitors.csv")
    
    if os.path.exists(sessions_dir):
        try:
            with open(csv_path, "w", encoding="utf-8") as f:
                f.write("Name,Category,Pricing,Est_Monthly_Revenue_USD,Strategy\n")
                if competitors:
                    for c in competitors:
                        f.write(f'"{c.get("name","")}","{c.get("category","")}","{c.get("pricing","")}","{c.get("est_monthly_revenue","")}","{c.get("strategy","")}"\n')
                else:
                    for r in real_results:
                        f.write(f'"{r.get("title","")}","웹 검색 결과","실시간","-","{r.get("snippet","")}"\n')
            print(f"📊 CSV 파일 저장 완료: {csv_path}")
        except Exception as e:
            print(f"⚠️ CSV 파일 저장 중 오류 발생: {e}")
            
    print("\n" + "="*60)
    print(report)
    print("="*60)
    print(f"\n✅ 웹 검색 완료. 보고서 저장됨: {REPORT}")

if __name__ == "__main__":
    main()
