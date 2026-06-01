import fs from 'fs';
import path from 'path';

// The _company directory is two levels up from viewer-app
// viewer-app is at /c/Users/user/Desktop/명철/개발/viewer-app
// _company is at /c/Users/user/Desktop/명철/개발/_company
const COMPANY_DIR = path.join(process.cwd(), '..', '_company');

export function getSessions() {
  const sessionsDir = path.join(COMPANY_DIR, 'sessions');
  if (!fs.existsSync(sessionsDir)) {
    return [];
  }
  
  const folders = fs.readdirSync(sessionsDir, { withFileTypes: true })
    .filter(dirent => dirent.isDirectory())
    .map(dirent => dirent.name)
    .sort((a, b) => b.localeCompare(a)); // Newest first

  return folders;
}

export function getSessionFiles(sessionId) {
  const sessionDir = path.join(COMPANY_DIR, 'sessions', sessionId);
  if (!fs.existsSync(sessionDir)) {
    return [];
  }
  
  const files = fs.readdirSync(sessionDir)
    .filter(file => file.endsWith('.md'))
    .map(file => {
      const content = fs.readFileSync(path.join(sessionDir, file), 'utf8');
      return {
        name: file,
        content
      };
    });
    
  return files;
}

export function getSessionMindmap(sessionId) {
  const files = getSessionFiles(sessionId);
  const briefFile = files.find(f => f.name === '_brief.md');
  
  let globalGoal = '';
  if (briefFile) {
    const goalMatch = briefFile.content.match(/\*\*원 명령:\*\*\s*(.*?)(?:\n|$)/);
    if (goalMatch && goalMatch[1]) {
      globalGoal = goalMatch[1].trim();
    } else {
      const summaryMatch = briefFile.content.match(/## 요약\s*([\s\S]*?)(?:##|$)/);
      if (summaryMatch && summaryMatch[1]) {
        globalGoal = summaryMatch[1].trim();
      }
    }
  }

  const agentNodes = [];
  files.forEach(file => {
    if (file.name.startsWith('_')) return;

    const content = file.content;
    const agentName = file.name.replace('.md', '');

    let displayName = agentName;
    let role = '';
    const headerMatch = content.match(/^#\s*(.*?)\s*—\s*(.*?)$/m);
    if (headerMatch) {
      displayName = headerMatch[1].trim();
      role = headerMatch[2].trim();
    }

    const deliverables = [];
    const sectionRegex = /^###\s+(.+)$/gm;
    let match;
    while ((match = sectionRegex.exec(content)) !== null) {
      const secName = match[1].trim();
      if (!['이달의 목표 및 현재 상태', '최근의 이벤트 및 데이터', '관련 두뇌 지식', '인용 가능한 1차 자료 라이브러리 구축'].some(s => secName.includes(s))) {
        deliverables.push(secName);
      }
    }

    const nextActions = [];
    const nextStepMatch = content.match(/(?:📝 다음 단계:|## 다음 단계)[\s\S]*?(?:\n\n|\n---|#|$)/);
    if (nextStepMatch) {
      const actionText = nextStepMatch[0].replace(/📝 다음 단계:|## 다음 단계/g, '').trim();
      if (actionText) {
        actionText.split('\n').forEach(line => {
          const clean = line.replace(/^[-*+\d.\s<>#\s]+/, '').trim();
          if (clean && clean.length > 2) {
            nextActions.push(clean);
          }
        });
      }
    }

    const insights = [];
    const lines = content.split('\n');
    lines.forEach(line => {
      const trimmed = line.trim();
      if (trimmed.startsWith('-') || trimmed.startsWith('*') || /^\d+\./.test(trimmed)) {
        const clean = trimmed.replace(/^[-*+\d.\s]+/, '').trim();
        if (clean.length > 6 && !clean.includes('http') && !clean.includes('다음 단계') && insights.length < 4) {
          if (!nextActions.some(a => a.includes(clean)) && !deliverables.some(d => d.includes(clean))) {
            insights.push(clean);
          }
        }
      }
    });

    agentNodes.push({
      agent: agentName,
      displayName,
      role,
      deliverables: deliverables.length > 0 ? deliverables : ['기본 작업 보고서'],
      insights: insights.length > 0 ? insights : ['세부 업무 내용 진행 완료'],
      nextActions: nextActions.length > 0 ? nextActions : ['후속 지침 검토 및 승인 대기']
    });
  });

  return {
    sessionId,
    globalGoal: globalGoal || '세션 자율 작업 수행',
    agents: agentNodes
  };
}

export function getAgents() {
  const agentsDir = path.join(COMPANY_DIR, 'agents');
  if (!fs.existsSync(agentsDir)) {
    return [];
  }
  
  // Just listing folders inside agents for now
  const folders = fs.readdirSync(agentsDir, { withFileTypes: true })
    .filter(dirent => dirent.isDirectory())
    .map(dirent => dirent.name);
    
  return folders;
}

export function getLatestSummary() {
  const sessions = getSessions();
  if (sessions.length === 0) return null;
  
  const latestSession = sessions[0];
  const briefPath = path.join(COMPANY_DIR, 'sessions', latestSession, '_brief.md');
  
  if (fs.existsSync(briefPath)) {
    const content = fs.readFileSync(briefPath, 'utf8');
    
    // Extract text between ## 요약 and ## 분배
    const summaryMatch = content.match(/## 요약([\s\S]*?)## 분배/);
    let summaryText = '';
    if (summaryMatch && summaryMatch[1]) {
      summaryText = summaryMatch[1].trim();
    } else {
      summaryText = "최신 브리프 문서에서 요약을 추출할 수 없습니다.";
    }
    
    // Extract tasks
    const distributeMatch = content.match(/## 분배([\s\S]*?)$/);
    let tasksText = '';
    if (distributeMatch && distributeMatch[1]) {
      tasksText = distributeMatch[1].trim();
    }
    
    return {
      session: latestSession,
      summary: summaryText,
      tasks: tasksText
    };
  }
  return null;
}

export function getCompanyDirection() {
  const sharedDir = path.join(COMPANY_DIR, '_shared');
  const goalsPath = path.join(sharedDir, 'goals.md');
  const decisionsPath = path.join(sharedDir, 'decisions.md');
  
  let goals = "현재 설정된 회사 목표가 없습니다.";
  let decisions = "아직 기록된 주요 의사결정이 없습니다.";
  
  if (fs.existsSync(goalsPath)) {
    goals = fs.readFileSync(goalsPath, 'utf8');
  }
  
  if (fs.existsSync(decisionsPath)) {
    const fullDecisions = fs.readFileSync(decisionsPath, 'utf8');
    // '## [날짜]' 기준으로 섹션을 나눕니다.
    const sections = fullDecisions.split(/(?=## \[\d{4}-\d{2}-\d{2}\])/);
    
    if (sections.length > 1) {
      // 첫 번째 요소는 보통 제목과 설명 등 헤더 부분이므로 제외하고 최신 3개의 의사결정만 가져옵니다.
      sections.shift();
      const recentSections = sections.slice(-3); // 가장 최근(마지막) 3개
      decisions = recentSections.join('\n');
    } else {
      decisions = fullDecisions;
    }
  }
  
  return {
    goals,
    decisions
  };
}

export function getMonetizationProgress() {
  const statePath = path.join(COMPANY_DIR, '..', 'company_state.json');
  let tasksCompleted = 0;
  
  if (fs.existsSync(statePath)) {
    try {
      const stateData = JSON.parse(fs.readFileSync(statePath, 'utf8'));
      if (stateData.tasksCompleted) {
        tasksCompleted = stateData.tasksCompleted;
      }
    } catch (e) {
      console.error("Failed to parse company_state.json", e);
    }
  }
  
  // 가상의 수익화 목표 (예: 100개의 주요 태스크 완료 시 1차 수익화 실현)
  const TARGET_TASKS = 100;
  let percentage = (tasksCompleted / TARGET_TASKS) * 100;
  if (percentage > 100) percentage = 100;
  
  return {
    tasksCompleted,
    targetTasks: TARGET_TASKS,
    percentage: Math.round(percentage)
  };
}

export function getActiveAgents() {
  const activePath = path.join(COMPANY_DIR, '_shared', 'active.json');
  if (!fs.existsSync(activePath)) return [];
  
  try {
    const data = JSON.parse(fs.readFileSync(activePath, 'utf8'));
    // Filter out internal keys like _migrated
    const agents = Object.keys(data).filter(k => !k.startsWith('_'));
    return agents.map(agentName => ({
      name: agentName,
      status: 'online',
      activatedAt: data[agentName].activatedAt
    }));
  } catch (e) {
    console.error("Failed to parse active.json", e);
    return [];
  }
}

export function getRecentTasks() {
  const trackerPath = path.join(COMPANY_DIR, '_shared', 'tracker.json');
  if (!fs.existsSync(trackerPath)) return [];
  
  try {
    const data = JSON.parse(fs.readFileSync(trackerPath, 'utf8'));
    if (data.tasks && Array.isArray(data.tasks)) {
      // Return the 5 most recently completed tasks, assuming they are appended or we sort by completedAt
      const completedTasks = data.tasks.filter(t => t.status === 'done');
      // Sort by completedAt descending
      completedTasks.sort((a, b) => new Date(b.completedAt) - new Date(a.completedAt));
      return completedTasks.slice(0, 5);
    }
    return [];
  } catch (e) {
    console.error("Failed to parse tracker.json", e);
    return [];
  }
}

export function getSessionDirection(sessionId) {
  const files = getSessionFiles(sessionId);
  const briefFile = files.find(f => f.name === '_brief.md');
  
  let summary = '이 세션에 대한 요약 브리프가 없습니다.';
  let originalCommand = '자율 사이클 운영 중';
  
  if (briefFile) {
    const summaryMatch = briefFile.content.match(/## 요약([\s\S]*?)(?:##|$)/);
    if (summaryMatch && summaryMatch[1]) {
      summary = summaryMatch[1].trim();
    }
    const commandMatch = briefFile.content.match(/\*\*원 명령:\*\*\s*(.*?)(?:\n|$)/);
    if (commandMatch && commandMatch[1]) {
      originalCommand = commandMatch[1].trim();
    }
  }

  const companyDirection = getCompanyDirection();
  const mindmap = getSessionMindmap(sessionId);
  
  const roadmapSteps = mindmap.agents.map(agentData => ({
    agent: agentData.displayName,
    role: agentData.role,
    mainDeliverable: agentData.deliverables[0] || '기본 성과물',
    nextAction: agentData.nextActions[0] || '다음 작업 대기 중'
  }));

  return {
    sessionId,
    summary,
    originalCommand,
    companyGoals: companyDirection.goals,
    roadmap: roadmapSteps
  };
}

