const fs = require('fs');
const path = require('path');

function updateDnaInfluenceScores() {
  try {
    const historyPath = path.join(process.cwd(), 'public', 'shorts', 'history.json');
    const perfPath = path.join(process.cwd(), '..', '_company', '_shared', 'video_performance_db.json');
    
    if (!fs.existsSync(historyPath)) return;
    
    const history = JSON.parse(fs.readFileSync(historyPath, 'utf-8'));
    let perfList = [];
    if (fs.existsSync(perfPath)) {
      perfList = JSON.parse(fs.readFileSync(perfPath, 'utf-8')).video_performance || [];
    }
    
    // Create a map of performance data by video ID
    const perfMap = {};
    perfList.forEach(p => {
      perfMap[p.video_id] = p;
    });
    
    // Helper to calculate statistics for a given set of matching video IDs
    function calculateStats(matchedIds) {
      if (matchedIds.length === 0) return null;
      
      let totalViews = 0;
      let totalClicks = 0;
      let totalConversions = 0;
      let totalRoi = 0;
      let count = 0;
      
      matchedIds.forEach(id => {
        // Check history item first, then perfMap
        const histItem = history.find(h => h.id === id);
        const perfItem = perfMap[id];
        
        const views = (perfItem ? perfItem.views : 0) || (histItem ? histItem.views : 0) || 0;
        const clicks = (perfItem ? perfItem.affiliate_clicks : 0) || 0;
        const conversions = (perfItem ? perfItem.affiliate_conversions : 0) || 0;
        const roi = (perfItem ? perfItem.roi : 0) || 0;
        
        totalViews += views;
        totalClicks += clicks;
        totalConversions += conversions;
        totalRoi += roi;
        count++;
      });
      
      if (count === 0) return null;
      
      const avgViews = totalViews / count;
      const avgCtr = totalViews > 0 ? (totalClicks / totalViews) * 100 : 0;
      const avgConversionRate = totalClicks > 0 ? (totalConversions / totalClicks) * 100 : 0;
      const avgRoi = totalRoi / count;
      
      // Calculate influence score normalized out of 100
      const viewsScore = Math.min(100, (avgViews / 30000) * 100);
      const ctrScore = Math.min(100, (avgCtr / 8) * 100);
      const convScore = Math.min(100, (avgConversionRate / 12) * 100);
      const roiScore = Math.min(100, (avgRoi / 1500) * 100);
      
      const influenceScore = parseFloat((0.25 * viewsScore + 0.25 * ctrScore + 0.25 * convScore + 0.25 * roiScore).toFixed(1));
      
      return {
        uses: count,
        avgViews: parseFloat(avgViews.toFixed(1)),
        avgCtr: parseFloat(avgCtr.toFixed(2)),
        avgConversionRate: parseFloat(avgConversionRate.toFixed(2)),
        avgRoi: parseFloat(avgRoi.toFixed(1)),
        dna_influence_score: Math.max(5, influenceScore) // floor of 5
      };
    }
    
    // 1. Update Success DNA DB
    const successPath = path.join(process.cwd(), '..', '_company', '_shared', 'success_dna_db.json');
    if (fs.existsSync(successPath)) {
      const db = JSON.parse(fs.readFileSync(successPath, 'utf-8'));
      const list = db.success_dna_list || [];
      list.forEach(item => {
        const matchedIds = history
          .filter(h => h.youtubeVideoId !== 'DRY_RUN' && !h.isDryRun && h.used_success_dna && h.used_success_dna.some(d => d.id === item.id))
          .map(h => h.id);
        
        const stats = calculateStats(matchedIds);
        if (stats) {
          Object.assign(item, stats);
        } else {
          item.uses = 0;
          item.avgViews = 0;
          item.avgCtr = 0;
          item.avgConversionRate = 0;
          item.avgRoi = 0;
          item.dna_influence_score = 50.0; // baseline
        }
      });
      fs.writeFileSync(successPath, JSON.stringify(db, null, 2), 'utf-8');
    }
    
    // 2. Update Revenue DNA DB
    const revenuePath = path.join(process.cwd(), '..', '_company', '_shared', 'revenue_dna_db.json');
    if (fs.existsSync(revenuePath)) {
      const db = JSON.parse(fs.readFileSync(revenuePath, 'utf-8'));
      const list = db.revenue_dna_list || [];
      list.forEach(item => {
        const matchedIds = history
          .filter(h => h.youtubeVideoId !== 'DRY_RUN' && !h.isDryRun && h.used_revenue_dna && h.used_revenue_dna.some(d => d.id === item.video_id))
          .map(h => h.id);
        
        const stats = calculateStats(matchedIds);
        if (stats) {
          Object.assign(item, stats);
        } else {
          item.uses = 0;
          item.avgViews = 0;
          item.avgCtr = 0;
          item.avgConversionRate = 0;
          item.avgRoi = 0;
          item.dna_influence_score = 50.0;
        }
      });
      fs.writeFileSync(revenuePath, JSON.stringify(db, null, 2), 'utf-8');
    }
    
    // 3. Update Failure DNA DB
    const failurePath = path.join(process.cwd(), '..', '_company', '_shared', 'failure_dna_db.json');
    if (fs.existsSync(failurePath)) {
      const db = JSON.parse(fs.readFileSync(failurePath, 'utf-8'));
      const list = db.failure_dna_list || [];
      list.forEach(item => {
        const matchedIds = history
          .filter(h => h.youtubeVideoId !== 'DRY_RUN' && !h.isDryRun && h.used_failure_dna && h.used_failure_dna.some(d => d.id === item.id))
          .map(h => h.id);
        
        const stats = calculateStats(matchedIds);
        if (stats) {
          Object.assign(item, stats);
        } else {
          item.uses = 0;
          item.avgViews = 0;
          item.avgCtr = 0;
          item.avgConversionRate = 0;
          item.avgRoi = 0;
          item.dna_influence_score = 50.0;
        }
      });
      fs.writeFileSync(failurePath, JSON.stringify(db, null, 2), 'utf-8');
    }
    
    // 4. Update Agent Lessons
    const intelPath = path.join(process.cwd(), '..', '_company', '_shared', 'agent_intelligence_db.json');
    if (fs.existsSync(intelPath)) {
      const db = JSON.parse(fs.readFileSync(intelPath, 'utf-8'));
      const list = db.agent_lessons || [];
      list.forEach(item => {
        const matchedIds = history
          .filter(h => h.youtubeVideoId !== 'DRY_RUN' && !h.isDryRun && h.used_agent_lessons && h.used_agent_lessons.some(l => l.lesson === item.lesson))
          .map(h => h.id);
        
        const stats = calculateStats(matchedIds);
        if (stats) {
          Object.assign(item, stats);
        } else {
          item.uses = 0;
          item.avgViews = 0;
          item.avgCtr = 0;
          item.avgConversionRate = 0;
          item.avgRoi = 0;
          item.dna_influence_score = 50.0;
        }
      });
      fs.writeFileSync(intelPath, JSON.stringify(db, null, 2), 'utf-8');
    }
    
    console.log('[Influence Engine] DNA Influence scores and contribution stats successfully updated.');
  } catch (e) {
    console.error('Failed to update DNA influence scores:', e);
  }
}

module.exports = {
  updateDnaInfluenceScores
};
