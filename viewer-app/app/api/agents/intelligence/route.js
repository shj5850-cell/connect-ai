import { NextResponse } from 'next/server';
import fs from 'fs';
import path from 'path';
import { runIngestion, startWatcher } from '../../../lib/AgentKnowledgeSync';

function resolveWorkspaceDir() {
  const cwd = process.cwd();
  if (fs.existsSync(path.join(cwd, '_company'))) return cwd;
  const parent = path.join(cwd, '..');
  if (fs.existsSync(path.join(parent, '_company'))) return parent;
  return 'C:\\Users\\user\\Desktop\\명철\\개발';
}
const WORKSPACE_DIR = resolveWorkspaceDir();
const SHARED_DIR = path.join(WORKSPACE_DIR, '_company', '_shared');
const INTEL_DB_PATH = path.join(SHARED_DIR, 'agent_intelligence_db.json');

// Ensure database file exists
function readIntelligenceDb() {
  if (fs.existsSync(INTEL_DB_PATH)) {
    try {
      return JSON.parse(fs.readFileSync(INTEL_DB_PATH, 'utf-8'));
    } catch (e) {
      console.error('[Intelligence API] Failed to parse JSON DB:', e);
    }
  }
  // If parsing fails or file doesn't exist, trigger ingestion to rebuild
  return runIngestion();
}

export async function GET() {
  try {
    // Start watcher just in case it hasn't been initialized
    startWatcher();
    
    // Trigger sync on request to ensure high-fidelity dynamic reading
    const db = runIngestion() || readIntelligenceDb();
    
    if (!db) {
      return NextResponse.json({ success: false, error: '에이전트 두뇌 DB를 파싱하거나 기동할 수 없습니다.' }, { status: 500 });
    }

    return NextResponse.json({
      success: true,
      ...db
    });
  } catch (e) {
    return NextResponse.json({ success: false, error: e.message }, { status: 500 });
  }
}

export async function POST(req) {
  try {
    const body = await req.json();
    const { action } = body;
    
    startWatcher();

    if (action === 'sync') {
      const db = runIngestion();
      return NextResponse.json({ success: true, message: '실시간 감시 대상 파일 스캔 및 데이터 동기화 완료!', db });
    }

    if (action === 'seed') {
      // Seed files if agent directories are empty or decisions.md is not present
      seedMockFilesIfMissing();
      const db = runIngestion();
      return NextResponse.json({ success: true, message: '에이전트 데모 지식 파일 세팅 완료!', db });
    }

    return NextResponse.json({ success: false, error: '지원하지 않는 action입니다.' }, { status: 400 });
  } catch (e) {
    return NextResponse.json({ success: false, error: e.message }, { status: 500 });
  }
}

function seedMockFilesIfMissing() {
  try {
    const agents = ['writer', 'ceo', 'developer', 'vision_critic', 'hook_specialist'];
    const agentsDir = path.join(process.cwd(), '..', '_company', '_agents');
    
    agents.forEach(agent => {
      const memoryPath = path.join(agentsDir, agent, 'memory.md');
      if (fs.existsSync(path.dirname(memoryPath)) && !fs.existsSync(memoryPath)) {
        const mockMemory = `# ${agent} Agent Memory & Log

## [Lessons Learned]
- ${agent} 관련 성공 요인 분석 결과 획득
- ${agent} 작업 시 개인정보 및 API 키 노출 주의 필요

## [Next Actions]
- 대본 템포 및 이미지 연출 품질 지속 향상
- 수익 지표 연동 로직 검증`;
        fs.writeFileSync(memoryPath, mockMemory, 'utf-8');
      }
    });
  } catch (e) {
    console.error('Failed to seed missing agent mock files:', e);
  }
}
