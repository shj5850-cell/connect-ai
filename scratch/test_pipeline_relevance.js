const fs = require('fs');
const path = require('path');

const PRODUCTS = [
  { name: '소고기', audience: '고기 미식가 및 요리 초보자' },
  { name: '칫솔', audience: '구강 건강에 민감한 성인' },
  { name: '강아지 사료', audience: '반려견을 키우는 펫 부모' },
  { name: '전동드릴', audience: 'DIY 홈 인테리어 입문자' },
  { name: '에스프레소 머신', audience: '홈카페 아메리카노 애호가' }
];

const sleep = (ms) => new Promise(resolve => setTimeout(resolve, ms));

async function runAutopilotForProduct(product) {
  console.log(`\n======================================================`);
  console.log(`🚀 Starting Autopilot Pipeline Test for: "${product.name}"`);
  console.log(`======================================================`);

  // 1. Trigger POST request to Autopilot
  const triggerUrl = 'http://localhost:3000/api/autopilot';
  try {
    const response = await fetch(triggerUrl, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        isProductDriven: true,
        productName: product.name,
        targetAudience: product.audience,
        videoStyle: 'Cinematic',
        dryRun: true
      })
    });

    if (!response.ok) {
      throw new Error(`Failed to trigger Autopilot: ${response.status} ${await response.text()}`);
    }

    const startResult = await response.json();
    console.log(`Trigger Status: ${JSON.stringify(startResult)}`);

    // 2. Poll GET status
    let lastStep = '';
    while (true) {
      await sleep(1500);
      const statusRes = await fetch('http://localhost:3000/api/autopilot');
      if (!statusRes.ok) {
        console.error(`Status check failed: ${statusRes.status}`);
        continue;
      }
      const data = await statusRes.json();

      if (data.step !== lastStep) {
        console.log(`[Status Update] Step: ${data.step} | Msg: ${data.message} | Progress: ${data.progress}%`);
        lastStep = data.step;
      }

      if (data.status === 'completed') {
        console.log(`✨ Autopilot Completed for: "${product.name}"!`);
        return { success: true, data };
      } else if (data.status === 'error') {
        console.error(`❌ Autopilot Error for: "${product.name}"! Msg: ${data.error_message}`);
        return { success: false, error: data.error_message };
      }
    }
  } catch (err) {
    console.error(`Network or runtime error for "${product.name}":`, err.message);
    return { success: false, error: err.message };
  }
}

async function runAll() {
  const results = [];

  for (let i = 0; i < PRODUCTS.length; i++) {
    const product = PRODUCTS[i];
    const res = await runAutopilotForProduct(product);
    
    if (res.success) {
      const data = res.data;
      const qScore = data.quality_score;
      const rScore = data.product_relevance_score || 100;
      const fScore = data.product_fact_score || 100;
      const passed = rScore >= 80;

      results.push({
        product: product.name,
        success: true,
        qScore,
        rScore,
        fScore,
        passed,
        details: data
      });

      // For the first product "소고기", print out step-by-step results and the script
      if (product.name === '소고기') {
        console.log("\n=================== SO-GOGI (BEEF) PIPELINE DETAILS ===================");
        console.log(`Product Name: ${data.productTitle}`);
        console.log(`Product Understanding Profile:`);
        console.log(JSON.stringify(data.scriptData?.product_analysis || {}, null, 2));
        console.log(`\nScript Output:`);
        console.log(`Title: "${data.scriptData?.title}"`);
        console.log(`Description: "${data.scriptData?.youtube_description}"`);
        (data.scriptData?.cuts || []).forEach((cut, cIdx) => {
          console.log(`  Cut ${cIdx + 1}:`);
          console.log(`    Subtitle: "${cut.subtitle}"`);
          console.log(`    Direction: "${cut.description}"`);
          console.log(`    Image Prompt: "${cut.prompt}"`);
          console.log(`    Vision Score: ${cut.vision_score} | Feedback: ${cut.vision_feedback}`);
        });
        console.log(`\nQuality Board Evaluation:`);
        console.log(JSON.stringify(data.preUploadAnalysis || {}, null, 2));
        console.log("====================================================================\n");
      }
    } else {
      results.push({
        product: product.name,
        success: false,
        error: res.error,
        passed: false
      });
    }
    
    // Wait a brief moment before starting next product
    await sleep(2000);
  }

  console.log("\n=================== FINAL INTEGRATION VERIFICATION SUMMARY ===================");
  console.log("| Product | Success | Quality Score | Relevance Score | Fact Score | Passed (Relevance >= 80) |");
  console.log("|---------|---------|---------------|-----------------|------------|--------------------------|");
  results.forEach(r => {
    if (r.success) {
      console.log(`| ${r.product.padEnd(7)} | Yes     | ${r.qScore.toString().padEnd(13)} | ${r.rScore.toString().padEnd(15)} | ${r.fScore.toString().padEnd(10)} | ${r.passed ? 'PASS' : 'FAIL'} |`);
    } else {
      console.log(`| ${r.product.padEnd(7)} | NO (ERR) | N/A           | N/A             | N/A        | FAIL                     |`);
    }
  });
  console.log("===============================================================================");

  // Write results array as a temp JSON file for further analysis/reporting
  fs.writeFileSync(path.join(__dirname, 'test_pipeline_results.json'), JSON.stringify(results, null, 2), 'utf-8');
}

runAll();
