import { NextResponse } from 'next/server';
import { exec } from 'child_process';
import fs from 'fs';
import path from 'path';

export async function POST(request) {
  try {
    const { script, image, title, templateStyle } = await request.json();

    if (!script || !image) {
      return NextResponse.json(
        { success: false, error: '대본 텍스트와 상품 대표 이미지가 필요합니다.' },
        { status: 400 }
      );
    }

    const timestamp = Date.now();
    const videoFilename = `coupang_${timestamp}.mp4`;
    const outputDir = path.join(process.cwd(), 'public', 'shorts');
    
    // Ensure output directory exists
    fs.mkdirSync(outputDir, { recursive: true });
    
    const absoluteOutputPath = path.join(outputDir, videoFilename);
    const relativeVideoUrl = `/shorts/${videoFilename}`;

    // Create temp config JSON for python script
    const tempDir = path.join(process.cwd(), 'public', 'shorts');
    const configFilename = `config_${timestamp}.json`;
    const configPath = path.join(tempDir, configFilename);

    const inputData = {
      script: script,
      image: image,
      output_path: absoluteOutputPath.replace(/\\/g, '/'), // python prefers forward slashes
      template_style: templateStyle || 'classic'
    };

    fs.writeFileSync(configPath, JSON.stringify(inputData, null, 2), 'utf-8');

    console.log(`Triggering video generation script for ${videoFilename}...`);
    const scriptPath = path.join(process.cwd(), 'scripts', 'generate_shorts_video.py');

    // Run Python script
    return new Promise((resolve) => {
      // Try 'python' first (common on Windows)
      exec(`python "${scriptPath}" "${configPath}"`, (error, stdout, stderr) => {
        // Clean up temp config file
        try {
          if (fs.existsSync(configPath)) {
            fs.unlinkSync(configPath);
          }
        } catch (e) {
          console.error('Error cleaning up temp json config:', e);
        }

        if (error) {
          console.error(`Python script error:`, error);
          console.error(`stderr: ${stderr}`);
          console.error(`stdout: ${stdout}`);
          
          // If python fails, maybe python3 is available
          console.log('Retrying with python3...');
          fs.writeFileSync(configPath, JSON.stringify(inputData, null, 2), 'utf-8');
          
          exec(`python3 "${scriptPath}" "${configPath}"`, (py3Error, py3Stdout, py3Stderr) => {
            try {
              if (fs.existsSync(configPath)) {
                fs.unlinkSync(configPath);
              }
            } catch (e) {}

            if (py3Error) {
              console.error(`Python3 script error:`, py3Error);
              console.error(`stderr: ${py3Stderr}`);
              resolve(
                NextResponse.json(
                  { 
                    success: false, 
                    error: '비디오 렌더링 스크립트 실행 실패', 
                    details: py3Stderr || py3Error.message 
                  },
                  { status: 500 }
                )
              );
            } else {
              console.log('Video rendered successfully with python3!');
              resolve(
                NextResponse.json({
                  success: true,
                  videoUrl: relativeVideoUrl,
                  videoPath: absoluteOutputPath
                })
              );
            }
          });
        } else {
          console.log('Video rendered successfully with python!');
          resolve(
            NextResponse.json({
              success: true,
              videoUrl: relativeVideoUrl,
              videoPath: absoluteOutputPath
            })
          );
        }
      });
    });

  } catch (error) {
    console.error('Generate Video API Handler Error:', error);
    return NextResponse.json(
      { success: false, error: error.message },
      { status: 500 }
    );
  }
}
