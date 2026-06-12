import { NextResponse } from 'next/server';
import fs from 'fs';
import path from 'path';

export async function GET(req) {
  const { searchParams } = new URL(req.url);
  const id = searchParams.get('id');
  const url = searchParams.get('url');

  if (!url) {
    return new NextResponse('Missing url parameter', { status: 400 });
  }

  // If no id, just redirect
  if (!id) {
    return NextResponse.redirect(url, 302);
  }

  try {
    const clickStatsPath = path.join(process.cwd(), 'public', 'shorts', 'click_stats.json');
    let clickStats = [];
    if (fs.existsSync(clickStatsPath)) {
      try {
        clickStats = JSON.parse(fs.readFileSync(clickStatsPath, 'utf-8'));
      } catch (e) {
        console.error('Error parsing click_stats.json:', e);
      }
    }

    clickStats.push({
      video_id: id,
      url: url,
      timestamp: new Date().toISOString()
    });

    fs.mkdirSync(path.dirname(clickStatsPath), { recursive: true });
    fs.writeFileSync(clickStatsPath, JSON.stringify(clickStats, null, 2), 'utf-8');

    // Update history.json
    const historyPath = path.join(process.cwd(), 'public', 'shorts', 'history.json');
    if (fs.existsSync(historyPath)) {
      try {
        const history = JSON.parse(fs.readFileSync(historyPath, 'utf-8'));
        const item = history.find(h => h.id === id);
        if (item) {
          item.affiliate_clicks = (item.affiliate_clicks || 0) + 1;
          item.clicks = (item.clicks || 0) + 1;
          const views = item.views || 0;
          item.click_rate = views > 0 ? (item.affiliate_clicks / views) : 0;
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
        const item = db.video_performance.find(v => v.video_id === id);
        if (item) {
          item.affiliate_clicks = (item.affiliate_clicks || 0) + 1;
          const views = item.views || 0;
          item.click_rate = views > 0 ? (item.affiliate_clicks / views) : 0;
          fs.writeFileSync(perfDbPath, JSON.stringify(db, null, 2), 'utf-8');
        }
      } catch (e) {
        console.error('Error updating video_performance_db.json:', e);
      }
    }

  } catch (err) {
    console.error('Failed to log click tracker:', err);
  }

  return NextResponse.redirect(url, 302);
}
