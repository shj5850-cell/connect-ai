import { NextResponse } from 'next/server';
import fs from 'fs';
import path from 'path';
import crypto from 'crypto';
import { spawn } from 'child_process';

const outputDir = path.join(process.cwd(), 'public', 'shorts');

// Helper to find Python binary path from VS Code settings
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

// 1. POST handler to start the background clipping job
export async function POST(request) {
  try {
    const { url, count } = await request.json();

    if (!url) {
      return NextResponse.json({ success: false, error: '유튜브 URL이 필요합니다.' }, { status: 400 });
    }

    const apiKey = process.env.GEMINI_API_KEY;
    if (!apiKey) {
      return NextResponse.json({ success: false, error: '.env.local 파일에 GEMINI_API_KEY가 설정되어 있지 않습니다.' }, { status: 500 });
    }

    const projectNumber = process.env.GEMINI_PROJECT_NUMBER || '773040580705';

    // Create unique jobId based on video URL and count
    const jobId = crypto.createHash('md5').update(url + count).digest('hex');

    if (!fs.existsSync(outputDir)) {
      fs.mkdirSync(outputDir, { recursive: true });
    }

    const progressFile = path.join(outputDir, `progress_${jobId}.txt`);
    const resultFile = path.join(outputDir, `result_${jobId}.json`);

    // If result already exists, return immediately as cached success
    if (fs.existsSync(resultFile)) {
      try {
        const cachedResult = JSON.parse(fs.readFileSync(resultFile, 'utf8'));
        return NextResponse.json({ success: true, jobId, cached: true, shorts: cachedResult.shorts });
      } catch (e) {
        console.error('Failed to parse cached result file', e);
      }
    }

    // Clean start: write initial progress log
    fs.writeFileSync(progressFile, '[INIT] 숏폼 변환 백그라운드 작업을 시작합니다...\n', 'utf8');

    const pythonBin = getPythonPath();
    const scriptPath = path.join(process.cwd(), 'scripts', 'video_clipper.py');

    console.log(`[Job Spawn] Starting job ${jobId} using python: ${pythonBin}`);
    
    const child = spawn(pythonBin, [
      scriptPath,
      '--url', url,
      '--count', count.toString(),
      '--output_dir', outputDir,
      '--api_key', apiKey,
      '--project_number', projectNumber
    ]);

    let stdoutBuffer = '';

    child.stdout.on('data', (data) => {
      stdoutBuffer += data.toString();
    });

    child.stderr.on('data', (data) => {
      const logLine = data.toString();
      fs.appendFileSync(progressFile, logLine);
      console.log(`[Job ${jobId} stderr] ${logLine.trim()}`);
    });

    child.on('close', (code) => {
      console.log(`[Job ${jobId} close] Process exited with code ${code}`);
      if (code === 0) {
        try {
          const parsed = JSON.parse(stdoutBuffer);
          if (parsed.success && parsed.shorts) {
            fs.writeFileSync(resultFile, JSON.stringify({ shorts: parsed.shorts }, null, 2), 'utf8');
            fs.appendFileSync(progressFile, '\n[SUCCESS] 모든 숏폼 편집이 성공적으로 완료되었습니다!\n');
            return;
          }
        } catch (e) {
          console.error('[Job Close Error] Failed to parse stdout JSON', e);
        }
        fs.appendFileSync(progressFile, `\n[ERROR] 스크립트 실행은 끝났으나 데이터 결과가 올바르지 않습니다.\n`);
      } else {
        fs.appendFileSync(progressFile, `\n[ERROR] 스크립트 실행 실패 (종료 코드: ${code})\n`);
      }
    });

    return NextResponse.json({ success: true, jobId, cached: false });

  } catch (error) {
    console.error('[POST /api/video-shorts Error]', error);
    return NextResponse.json({ success: false, error: error.message || '작업 시작 도중 오류 발생' }, { status: 500 });
  }
}

// 2. GET handler to poll logs and completion status
export async function GET(request) {
  try {
    const { searchParams } = new URL(request.url);
    const jobId = searchParams.get('jobId');

    if (!jobId) {
      return NextResponse.json({ success: false, error: 'jobId가 필요합니다.' }, { status: 400 });
    }

    const progressFile = path.join(outputDir, `progress_${jobId}.txt`);
    const resultFile = path.join(outputDir, `result_${jobId}.json`);

    let progressText = '작업 대기 중...';
    if (fs.existsSync(progressFile)) {
      progressText = fs.readFileSync(progressFile, 'utf8');
    }

    const completed = progressText.includes('[SUCCESS]') || progressText.includes('[ERROR]');
    const isSuccess = progressText.includes('[SUCCESS]');

    let shorts = [];
    if (isSuccess && fs.existsSync(resultFile)) {
      try {
        const resultData = JSON.parse(fs.readFileSync(resultFile, 'utf8'));
        shorts = resultData.shorts || [];
      } catch (e) {
        console.error('Failed to read result file', e);
      }
    }

    return NextResponse.json({
      success: true,
      completed,
      isSuccess,
      progress: progressText,
      shorts
    });

  } catch (error) {
    console.error('[GET /api/video-shorts Error]', error);
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}
