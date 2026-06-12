import { NextResponse } from 'next/server';
import fs from 'fs';
import path from 'path';

export async function POST(req) {
  try {
    const body = await req.json();
    const { videoId, conversions, affiliateRevenue, estimatedYoutubeRevenue } = body;

    if (!videoId) {
      return NextResponse.json({ error: 'Missing videoId' }, { status: 400 });
    }

    const conversionCount = Number(conversions || 0);
    const affRev = Number(affiliateRevenue || 0);
    const ytRev = Number(estimatedYoutubeRevenue || 0);
    const totalRev = affRev + ytRev;

    // Log in revenue_tracker.json
    const trackerPath = path.resolve(process.cwd(), '..', '_company', '_shared', 'revenue_tracker.json');
    let trackerData = [];
    if (fs.existsSync(trackerPath)) {
      try {
        trackerData = JSON.parse(fs.readFileSync(trackerPath, 'utf-8'));
      } catch (e) {
        console.error('Error parsing revenue_tracker.json:', e);
      }
    }
    trackerData.push({
      video_id: videoId,
      conversions: conversionCount,
      affiliate_revenue: affRev,
      estimated_youtube_revenue: ytRev,
      total_revenue: totalRev,
      timestamp: new Date().toISOString()
    });
    fs.mkdirSync(path.dirname(trackerPath), { recursive: true });
    fs.writeFileSync(trackerPath, JSON.stringify(trackerData, null, 2), 'utf-8');

    // Update history.json
    const historyPath = path.join(process.cwd(), 'public', 'shorts', 'history.json');
    if (fs.existsSync(historyPath)) {
      try {
        const history = JSON.parse(fs.readFileSync(historyPath, 'utf-8'));
        const item = history.find(h => h.id === videoId);
        if (item) {
          item.conversions = (item.conversions || 0) + conversionCount;
          item.affiliate_conversions = (item.affiliate_conversions || 0) + conversionCount;
          item.affiliate_revenue = (item.affiliate_revenue || 0) + affRev;
          item.estimated_youtube_revenue = (item.estimated_youtube_revenue || 0) + ytRev;
          item.revenue_per_video = (item.revenue_per_video || 0) + totalRev;
          fs.writeFileSync(historyPath, JSON.stringify(history, null, 2), 'utf-8');
        }
      } catch (e) {
        console.error('Error updating history.json:', e);
      }
    }

    // Update video_performance_db.json
    const perfDbPath = path.resolve(process.cwd(), '..', '_company', '_shared', 'video_performance_db.json');
    if (fs.existsSync(perfDbPath)) {
      try {
        const db = JSON.parse(fs.readFileSync(perfDbPath, 'utf-8'));
        const item = db.video_performance.find(v => v.video_id === videoId);
        if (item) {
          item.affiliate_conversions = (item.affiliate_conversions || 0) + conversionCount;
          item.affiliate_revenue = (item.affiliate_revenue || 0) + affRev;
          item.ad_revenue = (item.ad_revenue || 0) + ytRev;
          item.total_revenue = (item.total_revenue || 0) + totalRev;
          const cost = item.production_cost || 0;
          item.net_profit = item.total_revenue - cost;
          item.roi = cost > 0 ? (item.net_profit / cost) * 100 : 0;
          fs.writeFileSync(perfDbPath, JSON.stringify(db, null, 2), 'utf-8');
        }
      } catch (e) {
        console.error('Error updating video_performance_db.json:', e);
      }
    }

    return NextResponse.json({ success: true, logged: { videoId, conversions: conversionCount, affiliateRevenue: affRev, estimatedYoutubeRevenue: ytRev } });

  } catch (err) {
    console.error('Failed to log revenue:', err);
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}
