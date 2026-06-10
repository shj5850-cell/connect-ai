import { NextResponse } from 'next/server';
import path from 'path';
import fs from 'fs';
import { exec } from 'child_process';

const HISTORY_PATH = path.join(process.cwd(), 'public', 'shorts', 'history.json');
const OUTPUT_IMG_DIR = path.join(process.cwd(), 'public', 'shorts', 'cinema_images');
const SCRIPT_PATH = path.join(process.cwd(), 'scripts', 'generate_cinema_shorts.py');

// Helper to download image
async function downloadAiImage(prompt) {
  const enhancedPrompt = `${prompt}, high quality, cinematic lighting, 8k, photorealistic, vertical shot, 9:16 aspect ratio`;
  const url = `https://image.pollinations.ai/prompt/${encodeURIComponent(enhancedPrompt)}?nologo=true`;
  const pollinationKey = process.env.POLLINATIONS_API_KEY || '';
  let headers = {};
  if (pollinationKey) {
    headers['Authorization'] = `Bearer ${pollinationKey}`;
  }
  let response = await fetch(url, { headers });
  if (!response.ok && pollinationKey) {
    headers = {};
    response = await fetch(url, { headers });
  }
  if (!response.ok) {
    throw new Error(`Pollinations API returned status: ${response.status}`);
  }
  return Buffer.from(await response.arrayBuffer());
}

async function getPexelsImage(keyword) {
  const pexelsKey = process.env.PEXELS_API_KEY;
  if (!pexelsKey) return null;
  try {
    const cleanKw = keyword.replace(/[^a-zA-Z0-9\s]/g, '').trim();
    const url = `https://api.pexels.com/v1/search?query=${encodeURIComponent(cleanKw)}&orientation=portrait&per_page=5`;
    const res = await fetch(url, { headers: { 'Authorization': pexelsKey } });
    if (res.ok) {
      const data = await res.json();
      if (Array.isArray(data.photos) && data.photos.length > 0) {
        const randomIndex = Math.floor(Math.random() * Math.min(data.photos.length, 3));
        const photoUrl = data.photos[randomIndex].src.large2x || data.photos[randomIndex].src.portrait;
        const imgRes = await fetch(photoUrl);
        if (imgRes.ok) return Buffer.from(await imgRes.arrayBuffer());
      }
    }
  } catch (e) {
    console.error('[Pexels] Error fetching image:', e);
  }
  return null;
}

async function downloadFallbackImage(keyword) {
  const pexelsBuf = await getPexelsImage(keyword);
  if (pexelsBuf) return pexelsBuf;
  
  const fallbackUrl = `https://images.unsplash.com/photo-1618005182384-a83a8bd57fbe?w=1080&h=1920&fit=crop`;
  const res = await fetch(fallbackUrl);
  return Buffer.from(await res.arrayBuffer());
}

export async function GET() {
  try {
    if (fs.existsSync(HISTORY_PATH)) {
      const data = JSON.parse(fs.readFileSync(HISTORY_PATH, 'utf-8'));
      return NextResponse.json(data);
    }
    return NextResponse.json([]);
  } catch (e) {
    return NextResponse.json({ error: e.message }, { status: 500 });
  }
}

export async function POST(req) {
  try {
    const body = await req.json();
    const { action } = body;

    // Action 1: Generate Single AI Image
    if (action === 'generate_image') {
      const { prompt, id, cutIndex } = body;
      if (!prompt || !id || cutIndex === undefined) {
        return NextResponse.json({ error: 'Missing required parameters (prompt, id, cutIndex)' }, { status: 400 });
      }

      fs.mkdirSync(OUTPUT_IMG_DIR, { recursive: true });
      const filename = `img_auto_${id}_cut_${cutIndex + 1}_edit_${Date.now()}.jpg`;
      const absolutePath = path.join(OUTPUT_IMG_DIR, filename);
      const relativeUrl = `/shorts/cinema_images/${filename}`;

      try {
        const buffer = await downloadAiImage(prompt);
        fs.writeFileSync(absolutePath, buffer);
      } catch (e) {
        console.warn('AI Image generation failed on edit, falling back to stock:', e.message);
        const fallbackBuf = await downloadFallbackImage(prompt);
        fs.writeFileSync(absolutePath, fallbackBuf);
      }

      return NextResponse.json({ success: true, imagePath: absolutePath.replace(/\\/g, '/'), imageUrl: relativeUrl });
    }

    // Action 2: Re-render whole Video
    if (action === 're_render') {
      const { id, cuts } = body;
      if (!id || !Array.isArray(cuts) || cuts.length !== 4) {
        return NextResponse.json({ error: 'Invalid cuts array or ID' }, { status: 400 });
      }

      if (!fs.existsSync(HISTORY_PATH)) {
        return NextResponse.json({ error: 'History database not found' }, { status: 404 });
      }

      const history = JSON.parse(fs.readFileSync(HISTORY_PATH, 'utf-8'));
      const itemIndex = history.findIndex(item => item.id === id);
      if (itemIndex === -1) {
        return NextResponse.json({ error: `Archive item with ID ${id} not found` }, { status: 404 });
      }

      const archiveItem = history[itemIndex];
      const videoFilename = `cinema_shorts_auto_${id}.mp4`;
      const outputDir = path.join(process.cwd(), 'public', 'shorts');
      const absoluteOutputPath = path.join(outputDir, videoFilename);
      
      const configPath = path.join(outputDir, `cinema_config_auto_edit_${id}.json`);

      // Prepare config for compiler
      const inputData = {
        cuts: cuts.map((c, idx) => ({
          cutIndex: idx + 1,
          subtitle: c.subtitle,
          description: c.description || '',
          prompt: c.prompt || '',
          cameraMovement: c.cameraMovement || 'zoom in',
          duration: c.duration || 5,
          keywords: c.keywords || 'AI',
          image_path: c.image_path,
          video_path: '',
          isVideo: false
        })),
        bgm_style: '시네마틱 앰비언트',
        bgm_volume: 15,
        bgm_upload_path: '',
        output_path: absoluteOutputPath.replace(/\\/g, '/'),
        template_style: '감성 광고형',
        color_preset: 'warm',
        caption_style: 'minimal',
        caption_position: 'bottom',
        transition_effect: '페이드',
        voice: 'female'
      };

      fs.writeFileSync(configPath, JSON.stringify(inputData, null, 2), 'utf-8');

      // Compile video
      await new Promise((resolve, reject) => {
        exec(`python "${SCRIPT_PATH}" "${configPath}"`, (error, stdout, stderr) => {
          try {
            if (fs.existsSync(configPath)) fs.unlinkSync(configPath);
          } catch (e) {}

          if (error) {
            exec(`python3 "${SCRIPT_PATH}" "${configPath}"`, (py3Error, py3Stdout, py3Stderr) => {
              try {
                if (fs.existsSync(configPath)) fs.unlinkSync(configPath);
              } catch (e) {}
              if (py3Error) reject(new Error(py3Stderr || py3Error.message));
              else resolve();
            });
          } else {
            resolve();
          }
        });
      });

      // Update history DB
      archiveItem.scriptData.cuts = cuts;
      archiveItem.updated_at = new Date().toISOString();
      archiveItem.videoUrl = `/shorts/${videoFilename}?v=${Date.now()}`;
      
      history[itemIndex] = archiveItem;
      fs.writeFileSync(HISTORY_PATH, JSON.stringify(history, null, 2), 'utf-8');

      return NextResponse.json({ success: true, item: archiveItem });
    }

    // Action 3: Delete video file & Hide item from list (Archive cleanup)
    if (action === 'delete_and_hide') {
      const { id } = body;
      if (!id) {
        return NextResponse.json({ error: 'Missing ID' }, { status: 400 });
      }

      if (!fs.existsSync(HISTORY_PATH)) {
        return NextResponse.json({ error: 'History database not found' }, { status: 404 });
      }

      const history = JSON.parse(fs.readFileSync(HISTORY_PATH, 'utf-8'));
      const itemIndex = history.findIndex(item => item.id === id);
      if (itemIndex === -1) {
        return NextResponse.json({ error: `Archive item with ID ${id} not found` }, { status: 404 });
      }

      const archiveItem = history[itemIndex];

      // Remove the physical video file if it exists
      if (archiveItem.videoUrl) {
        try {
          const cleanUrl = archiveItem.videoUrl.split('?')[0]; // Strip cache buster query string
          const relativePath = cleanUrl.startsWith('/') ? cleanUrl.substring(1) : cleanUrl;
          const absolutePath = path.join(process.cwd(), 'public', relativePath);
          
          if (fs.existsSync(absolutePath)) {
            fs.unlinkSync(absolutePath);
            console.log(`[Archive Cleanup] Successfully deleted video file: ${absolutePath}`);
          }
        } catch (err) {
          console.error(`[Archive Cleanup] Failed to delete video file for ID ${id}:`, err);
        }
      }

      // Update item properties to mark it deleted & hidden
      archiveItem.videoUrl = null;
      archiveItem.isHidden = true;
      archiveItem.videoDeletedAt = new Date().toISOString();

      history[itemIndex] = archiveItem;
      fs.writeFileSync(HISTORY_PATH, JSON.stringify(history, null, 2), 'utf-8');

      return NextResponse.json({ success: true, id });
    }

    return NextResponse.json({ error: 'Invalid action' }, { status: 400 });

  } catch (e) {
    console.error('[Archive API] Error:', e);
    return NextResponse.json({ error: e.message }, { status: 500 });
  }
}
