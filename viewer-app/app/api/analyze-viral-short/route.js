import { NextResponse } from 'next/server';
import fs from 'fs';
import path from 'path';
import crypto from 'crypto';
import { spawn } from 'child_process';

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

function cleanVtt(vttContent) {
  const lines = vttContent.split('\n');
  const cleanLines = [];
  let lastLine = '';

  for (let line of lines) {
    line = line.trim();
    // Skip VTT headers, timing cues, and metadata
    if (
      !line ||
      line.includes('-->') ||
      line.startsWith('WEBVTT') ||
      line.startsWith('Kind:') ||
      line.startsWith('Language:') ||
      line.startsWith('Style:') ||
      line.startsWith('NOTE')
    ) {
      continue;
    }

    // Strip HTML/VTT tags like <c.color> or <00:00:00.123>
    let cleanText = line.replace(/<[^>]+>/g, '').trim();
    
    // Unescape HTML entities
    cleanText = cleanText
      .replace(/&amp;/g, '&')
      .replace(/&lt;/g, '<')
      .replace(/&gt;/g, '>')
      .replace(/&quot;/g, '"')
      .replace(/&#39;/g, "'");

    if (cleanText && cleanText !== lastLine) {
      cleanLines.push(cleanText);
      lastLine = cleanText;
    }
  }

  // Deduplicate consecutive identical phrases/cumulative words
  const finalWords = [];
  for (const text of cleanLines) {
    if (finalWords.length > 0 && finalWords[finalWords.length - 1] === text) {
      continue;
    }
    // Simple cumulative text deduplication (VTT specific)
    if (finalWords.length > 0 && text.startsWith(finalWords[finalWords.length - 1])) {
      finalWords[finalWords.length - 1] = text; // Update to the full sentence
    } else {
      finalWords.push(text);
    }
  }

  return finalWords.join('\n');
}

export async function GET(request) {
  let tempPrefix = '';
  try {
    const { searchParams } = new URL(request.url);
    const videoUrl = searchParams.get('url');

    if (!videoUrl) {
      return NextResponse.json({ success: false, error: 'url 파라미터가 필요합니다.' }, { status: 400 });
    }

    const pythonBin = getPythonPath();
    const tempId = crypto.createHash('md5').update(videoUrl).digest('hex');
    tempPrefix = path.join(process.cwd(), `temp_sub_${tempId}`);

    console.log(`[Subtitle Fetch] Extracting subtitles for: ${videoUrl}`);

    // Spawn yt-dlp to download subtitles only
    const child = spawn(pythonBin, [
      '-m', 'yt_dlp',
      '--write-subs',
      '--write-auto-subs',
      '--sub-langs', 'ko,en',
      '--sub-format', 'vtt',
      '--skip-download',
      '-o', tempPrefix,
      videoUrl
    ]);

    let stderrBuffer = '';
    child.stderr.on('data', (data) => {
      stderrBuffer += data.toString();
    });

    const exitCode = await new Promise((resolve) => {
      child.on('close', (code) => {
        resolve(code);
      });
    });

    // Find any subtitle files written using native fs.readdirSync
    const parentDir = path.dirname(tempPrefix);
    const baseName = path.basename(tempPrefix);
    const allFiles = fs.readdirSync(parentDir);
    const files = allFiles
      .filter(f => f.startsWith(baseName))
      .map(f => path.join(parentDir, f));
    
    if (files.length === 0) {
      console.warn(`[Subtitle Fetch] No subtitle files found for ${videoUrl}. Exit code: ${exitCode}`);
      return NextResponse.json({ 
        success: false, 
        error: '자막파일을 추출할 수 없습니다. (자막이 활성화되어 있지 않은 동영상이거나 지원되지 않는 언어입니다.)' 
      });
    }

    // Sort files to prioritize Korean (.ko) over English (.en) or others
    files.sort((a, b) => {
      if (a.includes('.ko.vtt')) return -1;
      if (b.includes('.ko.vtt')) return 1;
      if (a.includes('.en.vtt')) return -1;
      if (b.includes('.en.vtt')) return 1;
      return 0;
    });

    const targetSubFile = files[0];
    const rawContent = fs.readFileSync(targetSubFile, 'utf8');
    const cleanTranscript = cleanVtt(rawContent);

    // Clean up all generated temp files
    for (const f of files) {
      try { fs.unlinkSync(f); } catch (e) {}
    }

    if (!cleanTranscript.trim()) {
      return NextResponse.json({ success: false, error: '자막 데이터가 비어있습니다.' });
    }

    return NextResponse.json({
      success: true,
      transcript: cleanTranscript,
      language: targetSubFile.includes('.ko.vtt') ? 'ko' : 'en'
    });

  } catch (error) {
    console.error('[GET /api/analyze-viral-short Error]', error);
    // Cleanup files if they exist using native readdirSync
    if (tempPrefix) {
      try {
        const parentDir = path.dirname(tempPrefix);
        const baseName = path.basename(tempPrefix);
        if (fs.existsSync(parentDir)) {
          const allFiles = fs.readdirSync(parentDir);
          const files = allFiles
            .filter(f => f.startsWith(baseName))
            .map(f => path.join(parentDir, f));
          for (const f of files) {
            try { fs.unlinkSync(f); } catch (e) {}
          }
        }
      } catch (e) {
        console.error('Failed to cleanup temp files', e);
      }
    }
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}
