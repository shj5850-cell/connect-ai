const fs = require('fs');
const path = require('path');

const logPath = path.join(__dirname, 'audit_results.json');
if (!fs.existsSync(logPath)) {
  console.error("audit_results.json does not exist.");
  process.exit(1);
}

const data = JSON.parse(fs.readFileSync(logPath, 'utf-8'));
console.log(`Total runs in audit_results: ${data.length}`);

data.forEach((run, i) => {
  console.log(`\nRun #${run.index}: ${run.forcedParams.category} - ${run.forcedParams.productTitle}`);
  if (run.result) {
    console.log(`  Status: Completed`);
    console.log(`  Video URL: ${run.result.videoUrl}`);
    if (run.result.preUploadAnalysis) {
      const scores = run.result.preUploadAnalysis.scores;
      const avg = scores ? (Object.values(scores).reduce((a,b)=>a+b, 0) / Object.keys(scores).length).toFixed(1) : 'N/A';
      console.log(`  Avg Score: ${avg}`);
    } else {
      console.log(`  Pre-upload analysis: None`);
    }
  } else {
    console.log(`  Status: Failed/No Result`);
  }
});
