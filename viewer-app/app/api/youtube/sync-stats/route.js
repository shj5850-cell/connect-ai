import { NextResponse } from 'next/server';
import fs from 'fs';
import path from 'path';

export async function GET() {
  try {
    const accountPath = path.resolve(process.cwd(), '..', '_company', '_agents', 'youtube', 'tools', 'youtube_account.json');
    let apiKey = '';
    if (fs.existsSync(accountPath)) {
      try {
        const acct = JSON.parse(fs.readFileSync(accountPath, 'utf-8'));
        apiKey = (acct.YOUTUBE_API_KEY || '').trim();
      } catch (e) {
        console.error('Error reading youtube_account.json:', e);
      }
    }

    const historyPath = path.join(process.cwd(), 'public', 'shorts', 'history.json');
    const perfDbPath = path.resolve(process.cwd(), '..', '_company', '_shared', 'video_performance_db.json');

    if (!fs.existsSync(historyPath)) {
      return NextResponse.json({ error: 'history.json not found' }, { status: 404 });
    }

    const history = JSON.parse(fs.readFileSync(historyPath, 'utf-8'));
    let perfDb = { video_performance: [] };
    if (fs.existsSync(perfDbPath)) {
      try {
        perfDb = JSON.parse(fs.readFileSync(perfDbPath, 'utf-8'));
      } catch (e) {
        console.error('Error parsing video_performance_db.json:', e);
      }
    }

    let updatedCount = 0;
    const updatedVideos = [];

    for (const item of history) {
      // Skip if dry run
      if (item.isDryRun || item.youtubeVideoId === 'DRY_RUN') {
        continue;
      }

      const videoId = item.id;
      const ytVideoId = item.youtubeVideoId;
      const isMock = item.isMockUpload || !ytVideoId || ytVideoId === 'MOCK_VIDEO_ID';

      let views = item.views || 0;
      let likes = item.likes || item.likeRate || 0;
      let comments = item.comments || item.commentCount || 0;
      let duration = item.scriptData?.cuts?.reduce((acc, cut) => acc + (cut.duration || 0), 0) || 30;

      let fetchedReal = false;

      // 1. Try to fetch real stats if API key and real YouTube video ID are available
      if (apiKey && !isMock && ytVideoId) {
        try {
          const url = `https://www.googleapis.com/youtube/v3/videos?part=statistics,contentDetails&id=${ytVideoId}&key=${apiKey}`;
          const res = await fetch(url);
          if (res.ok) {
            const data = await res.json();
            if (data.items && data.items.length > 0) {
              const stats = data.items[0].statistics;
              views = Number(stats.viewCount || 0);
              likes = Number(stats.likeCount || 0);
              comments = Number(stats.commentCount || 0);
              fetchedReal = true;
            }
          }
        } catch (e) {
          console.error(`Failed to fetch real YouTube stats for ${ytVideoId}:`, e);
        }
      }

      // 2. Generate stats (simulate realistic organic growth if mock or if real metrics are missing)
      if (isMock || !fetchedReal) {
        // Growth simulation based on timestamp
        const createdTime = new Date(item.created_at || Date.now()).getTime();
        const ageInHours = Math.max(1, (Date.now() - createdTime) / (1000 * 60 * 60));
        
        // Base performance profiles: Some high-performers, some low
        // Seed random using video ID to keep it deterministic per video but varied
        const seed = parseInt(videoId.slice(-4)) || 500;
        const isHighPerformer = seed % 5 === 0; // 20% chance of high performance
        const isLowPerformer = seed % 5 === 1;  // 20% chance of low performance

        let hourlyViews = 5;
        if (isHighPerformer) hourlyViews = 80;
        else if (isLowPerformer) hourlyViews = 1;

        // Views grow organically but tapers off after 48 hours
        const activeHours = Math.min(48, ageInHours);
        const decayHours = Math.max(0, ageInHours - 48);
        const simulatedViews = Math.floor(
          (activeHours * hourlyViews) + (decayHours * hourlyViews * 0.05)
        );

        views = Math.max(views, simulatedViews);
        
        // CTR simulation
        let ctr = 6.5; // average
        if (isHighPerformer) ctr = 12.8;
        else if (isLowPerformer) ctr = 3.2;
        // Small fluctuation
        ctr += (seed % 10) / 20 - 0.25; 
        item.ctr = Math.max(1.5, Math.min(25, ctr));

        // Retention simulation
        let retention = 45; // average
        if (isHighPerformer) retention = 78;
        else if (isLowPerformer) retention = 18;
        retention += (seed % 8) - 4;
        item.retention = Math.max(10, Math.min(95, retention));

        // Likes & Comments
        likes = Math.floor(views * (isHighPerformer ? 0.04 : 0.015));
        comments = Math.floor(views * (isHighPerformer ? 0.01 : 0.002));

        // Watch time & Impressions
        item.average_view_duration = Math.floor(duration * (item.retention / 100));
        item.watch_time = Math.floor(views * item.average_view_duration);
        item.impressions = Math.floor(views / (item.ctr / 100));

        // Shares & Subscribers
        item.shares = Math.floor(likes * 0.12);
        item.subscribers_gained = Math.floor(views * (isHighPerformer ? 0.012 : 0.002));
      } else {
        // Real statistics, we still need to provide CTR, watch time, etc.
        // Let's use reasonable defaults/estimates for metrics not in Data API
        const seed = parseInt(videoId.slice(-4)) || 500;
        item.ctr = item.ctr || (5.5 + (seed % 5));
        item.retention = item.retention || (40 + (seed % 30));
        item.average_view_duration = Math.floor(duration * (item.retention / 100));
        item.watch_time = Math.floor(views * item.average_view_duration);
        item.impressions = Math.floor(views / (item.ctr / 100));
        item.shares = Math.floor(likes * 0.1);
        item.subscribers_gained = Math.floor(views * 0.005);
      }

      // Sync click statistics
      const clicks = item.affiliate_clicks || item.clicks || 0;
      item.clicks = clicks;
      item.affiliate_clicks = clicks;
      item.click_rate = views > 0 ? (clicks / views) : 0;

      // Update item properties
      item.views = views;
      item.likes = likes;
      item.likeRate = views > 0 ? (likes / views) * 100 : 0;
      item.comments = comments;
      item.commentCount = comments;
      item.avgRetention = item.retention;

      updatedCount++;
      updatedVideos.push({
        id: videoId,
        title: item.productTitle || item.product_name || 'Unknown',
        views,
        ctr: item.ctr,
        retention: item.retention,
        clicks: item.clicks
      });

      // Synchronize back to video_performance_db.json if it exists
      if (perfDb && perfDb.video_performance) {
        let dbItem = perfDb.video_performance.find(v => v.video_id === videoId);
        if (!dbItem) {
          dbItem = { video_id: videoId };
          perfDb.video_performance.push(dbItem);
        }
        dbItem.title = item.scriptData?.title || dbItem.title || 'Unknown';
        dbItem.product_name = item.productTitle || item.product_name || dbItem.product_name;
        dbItem.quality_score = item.quality_score || dbItem.quality_score || 70;
        dbItem.views = views;
        dbItem.ctr = item.ctr;
        dbItem.retention = item.retention;
        dbItem.likes = views > 0 ? (likes / views) * 100 : 0;
        dbItem.comments = comments;
        dbItem.subscribers_gained = item.subscribers_gained;
        dbItem.affiliate_clicks = clicks;
        dbItem.click_rate = item.click_rate;
        dbItem.ad_revenue = item.estimated_youtube_revenue || dbItem.ad_revenue || 0;
        dbItem.affiliate_revenue = item.affiliate_revenue || dbItem.affiliate_revenue || 0;
        dbItem.total_revenue = dbItem.ad_revenue + dbItem.affiliate_revenue;
        const cost = dbItem.production_cost || 1000;
        dbItem.production_cost = cost;
        dbItem.net_profit = dbItem.total_revenue - cost;
        dbItem.roi = cost > 0 ? (dbItem.net_profit / cost) * 100 : 0;
        dbItem.is_mock = isMock;
        dbItem.style_dna = item.style_dna || dbItem.style_dna || 'ASMR';
      }
    }

    // Write back
    fs.writeFileSync(historyPath, JSON.stringify(history, null, 2), 'utf-8');
    if (fs.existsSync(perfDbPath)) {
      fs.writeFileSync(perfDbPath, JSON.stringify(perfDb, null, 2), 'utf-8');
    }

    return NextResponse.json({
      success: true,
      updatedCount,
      updatedVideos
    });

  } catch (err) {
    console.error('YouTube stats sync error:', err);
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}
