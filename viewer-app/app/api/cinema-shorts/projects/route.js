import { NextResponse } from 'next/server';
import fs from 'fs';
import path from 'path';

const getProjectsDir = () => {
  const dir = path.join(process.cwd(), 'projects');
  fs.mkdirSync(dir, { recursive: true });
  return dir;
};

// GET: list all projects or load one by id
export async function GET(request) {
  try {
    const { searchParams } = new URL(request.url);
    const id = searchParams.get('id');
    const projectsDir = getProjectsDir();

    if (id) {
      // Load specific project
      const safeId = id.replace(/[^a-zA-Z0-9_\-]/g, '');
      const filepath = path.join(projectsDir, `${safeId}.json`);
      
      if (!fs.existsSync(filepath)) {
        return NextResponse.json(
          { success: false, error: '프로젝트를 찾을 수 없습니다.' },
          { status: 404 }
        );
      }

      const data = JSON.parse(fs.readFileSync(filepath, 'utf8'));
      return NextResponse.json({ success: true, project: data });
    } else {
      // List all projects
      const files = fs.readdirSync(projectsDir).filter(file => file.endsWith('.json'));
      const projects = files.map(file => {
        try {
          const content = JSON.parse(fs.readFileSync(path.join(projectsDir, file), 'utf8'));
          return {
            id: file.replace('.json', ''),
            title: content.title || '제목 없음',
            updatedAt: content.updatedAt || new Date().toISOString(),
            purpose: content.purpose || '일반',
            atmosphere: content.atmosphere || '시네마틱'
          };
        } catch (e) {
          return null;
        }
      }).filter(Boolean);

      // Sort by updatedAt descending
      projects.sort((a, b) => new Date(b.updatedAt) - new Date(a.updatedAt));

      return NextResponse.json({ success: true, projects });
    }

  } catch (error) {
    console.error('Projects GET API Error:', error);
    return NextResponse.json(
      { success: false, error: error.message },
      { status: 500 }
    );
  }
}

// POST: Save project
export async function POST(request) {
  try {
    const projectData = await request.json();
    const { id, title } = projectData;

    const projectsDir = getProjectsDir();
    
    // Generate id if not exists
    const safeId = (id || `project_${Date.now()}`).replace(/[^a-zA-Z0-9_\-]/g, '');
    const filepath = path.join(projectsDir, `${safeId}.json`);

    const dataToSave = {
      ...projectData,
      id: safeId,
      updatedAt: new Date().toISOString()
    };

    fs.writeFileSync(filepath, JSON.stringify(dataToSave, null, 2), 'utf8');
    console.log(`Saved project ${safeId} to ${filepath}`);

    return NextResponse.json({
      success: true,
      id: safeId,
      message: '프로젝트가 성공적으로 저장되었습니다.'
    });

  } catch (error) {
    console.error('Projects POST API Error:', error);
    return NextResponse.json(
      { success: false, error: error.message },
      { status: 500 }
    );
  }
}

// DELETE: Remove project
export async function DELETE(request) {
  try {
    const { searchParams } = new URL(request.url);
    const id = searchParams.get('id');

    if (!id) {
      return NextResponse.json(
        { success: false, error: '삭제할 프로젝트 ID가 필요합니다.' },
        { status: 400 }
      );
    }

    const projectsDir = getProjectsDir();
    const safeId = id.replace(/[^a-zA-Z0-9_\-]/g, '');
    const filepath = path.join(projectsDir, `${safeId}.json`);

    if (!fs.existsSync(filepath)) {
      return NextResponse.json(
        { success: false, error: '삭제할 프로젝트를 찾을 수 없습니다.' },
        { status: 404 }
      );
    }

    fs.unlinkSync(filepath);
    console.log(`Deleted project file: ${filepath}`);

    return NextResponse.json({
      success: true,
      message: '프로젝트가 삭제되었습니다.'
    });

  } catch (error) {
    console.error('Projects DELETE API Error:', error);
    return NextResponse.json(
      { success: false, error: error.message },
      { status: 500 }
    );
  }
}
