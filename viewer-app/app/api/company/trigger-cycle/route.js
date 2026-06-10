import { NextResponse } from 'next/server';
import { spawn } from 'child_process';
import path from 'path';
import fs from 'fs';

const LOG_PATH = path.join(process.cwd(), 'public', 'cycle_run.log');
const STATUS_PATH = path.join(process.cwd(), 'public', 'cycle_status.json');

export async function GET() {
  try {
    if (fs.existsSync(STATUS_PATH)) {
      const status = JSON.parse(fs.readFileSync(STATUS_PATH, 'utf-8'));
      let logs = '';
      if (fs.existsSync(LOG_PATH)) {
        logs = fs.readFileSync(LOG_PATH, 'utf-8');
      }

      // If completed but session field is missing, try to resolve it dynamically
      if (status.status === 'completed' && !status.session) {
        try {
          const brainDir = path.join(process.cwd(), '..', '_company');
          const sessionsDir = path.join(brainDir, 'sessions');
          if (fs.existsSync(sessionsDir)) {
            const dirs = fs.readdirSync(sessionsDir).filter(f => {
              const fullPath = path.join(sessionsDir, f);
              return fs.statSync(fullPath).isDirectory() && f.startsWith('auto-');
            });
            if (dirs.length > 0) {
              dirs.sort((a, b) => {
                const aPath = path.join(sessionsDir, a);
                const bPath = path.join(sessionsDir, b);
                return fs.statSync(bPath).mtimeMs - fs.statSync(aPath).mtimeMs;
              });
              status.session = dirs[0];
              fs.writeFileSync(STATUS_PATH, JSON.stringify(status, null, 2), 'utf-8');
            }
          }
        } catch (err) {
          console.error('Failed to resolve missing session dynamically:', err);
        }
      }

      return NextResponse.json({ ...status, logs });
    }
    return NextResponse.json({ status: 'idle', message: '대기 중', logs: '' });
  } catch (e) {
    return NextResponse.json({ status: 'error', error: e.message, logs: '' });
  }
}

export async function POST(req) {
  try {
    const body = await req.json().catch(() => ({}));
    const model = body.model || 'qwen2.5-coder:3b';
    
    // Check if already running
    if (fs.existsSync(STATUS_PATH)) {
      const status = JSON.parse(fs.readFileSync(STATUS_PATH, 'utf-8'));
      if (status.status === 'running') {
        return NextResponse.json({ success: false, error: '이미 에이전트 자율 사이클이 실행 중입니다.' }, { status: 400 });
      }
    }

    // Reset log file
    fs.writeFileSync(LOG_PATH, '자율 사이클 실행 준비 중...\n', 'utf-8');
    fs.writeFileSync(STATUS_PATH, JSON.stringify({ status: 'running', message: '에이전트 자율 사이클 가동 중...' }, null, 2), 'utf-8');

    const scriptPath = path.join(process.cwd(), '..', 'scripts', 'cycle.js');
    const brainDir = path.join(process.cwd(), '..', '_company');

    console.log(`[Trigger Cycle] Starting script: ${scriptPath} with BRAIN_DIR: ${brainDir}, MODEL: ${model}`);

    const child = spawn('node', [scriptPath], {
      env: {
        ...process.env,
        BRAIN_DIR: brainDir,
        MODEL: model
      }
    });

    child.stdout.on('data', (data) => {
      fs.appendFileSync(LOG_PATH, data.toString());
    });

    child.stderr.on('data', (data) => {
      fs.appendFileSync(LOG_PATH, `[ERROR] ${data.toString()}`);
    });

    child.on('close', (code) => {
      console.log(`[Trigger Cycle] Finished with code: ${code}`);
      const success = code === 0;
      let sessionName = null;

      if (success) {
        try {
          const sessionsDir = path.join(brainDir, 'sessions');
          if (fs.existsSync(sessionsDir)) {
            const dirs = fs.readdirSync(sessionsDir).filter(f => {
              const fullPath = path.join(sessionsDir, f);
              return fs.statSync(fullPath).isDirectory() && f.startsWith('auto-');
            });
            if (dirs.length > 0) {
              dirs.sort((a, b) => {
                const aPath = path.join(sessionsDir, a);
                const bPath = path.join(sessionsDir, b);
                return fs.statSync(bPath).mtimeMs - fs.statSync(aPath).mtimeMs;
              });
              sessionName = dirs[0];
            }
          }
        } catch (err) {
          console.error('Failed to find latest session name:', err);
        }
      }

      fs.writeFileSync(STATUS_PATH, JSON.stringify({
        status: success ? 'completed' : 'error',
        message: success ? '자율 사이클 완료!' : `오류 발생 (종료 코드: ${code})`,
        session: sessionName,
        code
      }, null, 2), 'utf-8');
    });

    return NextResponse.json({ success: true, message: '에이전트 자율 사이클이 가동되었습니다.' });

  } catch (e) {
    console.error('Failed to trigger cycle:', e);
    fs.writeFileSync(STATUS_PATH, JSON.stringify({ status: 'error', message: e.message }), 'utf-8');
    return NextResponse.json({ success: false, error: e.message }, { status: 500 });
  }
}

