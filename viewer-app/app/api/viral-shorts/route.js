import { NextResponse } from 'next/server';
import fs from 'fs';
import path from 'path';
import { spawn } from 'child_process';

const cacheFile = path.join(process.cwd(), 'public', 'shorts', 'viral_cache.json');
const CACHE_TTL_MS = 2 * 60 * 60 * 1000; // 2 hours cache

function getPythonPath() {
  const settingsPath = path.join(process.cwd(), '..', '.vscode', 'settings.json');
  let pythonPath = 'python';
  if (fs.existsSync(settingsPath)) {
    try {
      const settings = JSON.parse(fs.readFileSync(settingsPath, 'utf8'));
      if (settings['connectAiLab.pythonPath']) {
        pythonPath = settings['connectAiLab.pythonPath'];
      }
    } catch (e) {
      console.error("Failed to parse settings.json", e);
    }
  }
  return pythonPath;
}

export async function GET(request) {
  try {
    // 1. Check Cache
    if (fs.existsSync(cacheFile)) {
      const stats = fs.statSync(cacheFile);
      const age = Date.now() - stats.mtimeMs;
      if (age < CACHE_TTL_MS) {
        try {
          const cachedData = JSON.parse(fs.readFileSync(cacheFile, 'utf8'));
          return NextResponse.json({ success: true, cached: true, shorts: cachedData });
        } catch (e) {
          console.error("Failed to read viral shorts cache", e);
        }
      }
    }

    // 2. Fetch fresh popular shorts from YouTube using the new crawler script
    const pythonBin = getPythonPath();
    const scriptPath = path.join(process.cwd(), 'scripts', 'fetch_viral_shorts.py');
    console.log(`[Viral Shorts Fetch] Running python script: ${scriptPath}`);

    const child = spawn(pythonBin, [scriptPath]);

    let stdoutBuffer = '';
    let stderrBuffer = '';

    child.stdout.on('data', (data) => {
      stdoutBuffer += data.toString();
    });

    child.stderr.on('data', (data) => {
      stderrBuffer += data.toString();
    });

    const runResult = await new Promise((resolve) => {
      child.on('close', (code) => {
        resolve(code);
      });
    });

    if (runResult !== 0) {
      console.error(`[Viral Shorts Fetch] Script exited with code ${runResult}. Stderr: ${stderrBuffer}`);
      // Fallback to cache if available, even if expired
      if (fs.existsSync(cacheFile)) {
        const cachedData = JSON.parse(fs.readFileSync(cacheFile, 'utf8'));
        return NextResponse.json({ success: true, cached: true, shorts: cachedData, warning: 'Failed to fetch fresh data' });
      }
      throw new Error(`fetch_viral_shorts.py failed with code ${runResult}`);
    }

    // 3. Parse JSON output and slice to top 24 for optimal UI grid layout
    let topShorts = [];
    try {
      const allShorts = JSON.parse(stdoutBuffer.trim());
      topShorts = allShorts.slice(0, 24);
    } catch (e) {
      console.error("Failed to parse script output JSON", e);
      throw new Error("Invalid output format from shorts fetcher script");
    }

    // Ensure directory exists
    const dir = path.dirname(cacheFile);
    if (!fs.existsSync(dir)) {
      fs.mkdirSync(dir, { recursive: true });
    }

    // Save to cache
    fs.writeFileSync(cacheFile, JSON.stringify(topShorts, null, 2), 'utf8');

    return NextResponse.json({ success: true, cached: false, shorts: topShorts });

  } catch (error) {
    console.error('[GET /api/viral-shorts Error]', error);
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}
