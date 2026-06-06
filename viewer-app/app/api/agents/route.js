import { NextResponse } from 'next/server';
import path from 'path';
import fs from 'fs';

const AGENTS_DIR = path.join(process.cwd(), '..', '_company', '_agents');

// GET all agents, their prompts, goals, and tool configurations/schemas
export async function GET() {
  try {
    if (!fs.existsSync(AGENTS_DIR)) {
      return NextResponse.json({ success: false, error: '_agents 디렉토리가 존재하지 않습니다.' });
    }

    const folders = fs.readdirSync(AGENTS_DIR, { withFileTypes: true })
      .filter(dirent => dirent.isDirectory())
      .map(dirent => dirent.name);

    const agentsData = folders.map(agentName => {
      const agentPath = path.join(AGENTS_DIR, agentName);
      
      // Read prompt.md
      let promptContent = '';
      const promptPath = path.join(agentPath, 'prompt.md');
      if (fs.existsSync(promptPath)) {
        promptContent = fs.readFileSync(promptPath, 'utf-8');
      }

      // Read goal.md
      let goalContent = '';
      const goalPath = path.join(agentPath, 'goal.md');
      if (fs.existsSync(goalPath)) {
        goalContent = fs.readFileSync(goalPath, 'utf-8');
      }

      // Read tools folder configurations
      const tools = [];
      const toolsPath = path.join(agentPath, 'tools');
      if (fs.existsSync(toolsPath)) {
        const files = fs.readdirSync(toolsPath)
          .filter(file => file.endsWith('.json'));

        files.forEach(file => {
          try {
            const filePath = path.join(toolsPath, file);
            const content = JSON.parse(fs.readFileSync(filePath, 'utf-8'));
            const toolName = file.replace('.json', '');
            
            // Separate properties from the configuration schema
            const schema = content._schema || {};
            const configValues = {};
            
            Object.keys(content).forEach(key => {
              if (key !== '_schema') {
                configValues[key] = content[key];
              }
            });

            tools.push({
              name: toolName,
              values: configValues,
              schema: schema
            });
          } catch (e) {
            console.error(`Failed to parse tool config json: ${file} for agent: ${agentName}`, e);
          }
        });
      }

      return {
        name: agentName,
        prompt: promptContent,
        goal: goalContent,
        tools: tools
      };
    });

    return NextResponse.json({ success: true, agents: agentsData });

  } catch (error) {
    console.error('Failed to load agents:', error);
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}

// POST updates to an agent's prompt, goal, or tool configs
export async function POST(request) {
  try {
    const { agent, prompt, goal, toolName, toolConfig } = await request.json();

    if (!agent) {
      return NextResponse.json({ success: false, error: 'agent 이름이 필요합니다.' }, { status: 400 });
    }

    const agentPath = path.join(AGENTS_DIR, agent);
    if (!fs.existsSync(agentPath)) {
      return NextResponse.json({ success: false, error: `에이전트 폴더를 찾을 수 없습니다: ${agent}` }, { status: 400 });
    }

    // 1. Save prompt.md
    if (prompt !== undefined) {
      const promptPath = path.join(agentPath, 'prompt.md');
      fs.writeFileSync(promptPath, prompt, 'utf-8');
      console.log(`Saved prompt.md for agent: ${agent}`);
    }

    // 2. Save goal.md
    if (goal !== undefined) {
      const goalPath = path.join(agentPath, 'goal.md');
      fs.writeFileSync(goalPath, goal, 'utf-8');
      console.log(`Saved goal.md for agent: ${agent}`);
    }

    // 3. Save tool config JSON
    if (toolName && toolConfig) {
      const toolJsonPath = path.join(agentPath, 'tools', `${toolName}.json`);
      if (fs.existsSync(toolJsonPath)) {
        const originalContent = JSON.parse(fs.readFileSync(toolJsonPath, 'utf-8'));
        
        // Merge values, keeping the original _schema intact
        const updatedContent = {
          ...toolConfig,
          _schema: originalContent._schema // Preserve the UI labels/hints schema
        };

        fs.writeFileSync(toolJsonPath, JSON.stringify(updatedContent, null, 2), 'utf-8');
        console.log(`Saved tool config ${toolName}.json for agent: ${agent}`);
      } else {
        return NextResponse.json({ success: false, error: `지정한 도구 설정 파일을 찾을 수 없습니다: ${toolName}.json` }, { status: 400 });
      }
    }

    return NextResponse.json({ success: true, message: '에이전트 지침 및 설정이 성공적으로 저장되었습니다.' });

  } catch (error) {
    console.error('Failed to update agent config:', error);
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}
