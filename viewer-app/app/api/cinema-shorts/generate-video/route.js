import { NextResponse } from 'next/server';
import { exec } from 'child_process';
import fs from 'fs';
import path from 'path';

// Helper to save base64 media files (image or video)
function saveBase64Media(base64Str, filenamePrefix, idx) {
  if (!base64Str || !base64Str.includes('base64,')) {
    return null;
  }
  
  try {
    const parts = base64Str.split(';base64,');
    const mimeType = parts[0].split(':')[1];
    const base64Data = parts[1];
    const buffer = Buffer.from(base64Data, 'base64');
    
    let ext = 'jpg';
    let isVideo = false;
    
    if (mimeType.includes('png')) ext = 'png';
    else if (mimeType.includes('webp')) ext = 'webp';
    else if (mimeType.includes('gif')) ext = 'gif';
    else if (mimeType.includes('mp4')) {
      ext = 'mp4';
      isVideo = true;
    } else if (mimeType.includes('webm')) {
      ext = 'webm';
      isVideo = true;
    } else if (mimeType.includes('ogg')) {
      ext = 'ogg';
      isVideo = true;
    } else if (mimeType.includes('quicktime') || mimeType.includes('mov')) {
      ext = 'mov';
      isVideo = true;
    }
    
    const uploadDir = path.join(process.cwd(), 'public', 'shorts', 'uploads');
    fs.mkdirSync(uploadDir, { recursive: true });
    
    const uploadFilename = `cinema_${filenamePrefix}_cut_${idx}_${Date.now()}.${ext}`;
    const absoluteUploadPath = path.join(uploadDir, uploadFilename);
    fs.writeFileSync(absoluteUploadPath, buffer);
    
    const savedPath = absoluteUploadPath.replace(/\\/g, '/');
    return {
      path: savedPath,
      isVideo: isVideo
    };
  } catch (e) {
    console.error(`[Base64 Media Save Error for Cut ${idx}]`, e);
    return null;
  }
}

export async function POST(request) {
  try {
    const { 
      title,
      purpose,
      atmosphere,
      stylePreset,
      colorPreset,
      captionStyle,
      captionPosition,
      transitionEffect,
      bgmStyle,
      bgmVolume,
      bgmBase64,
      bgmFileName,
      voice,
      cuts
    } = await request.json();

    if (!cuts || cuts.length !== 4) {
      return NextResponse.json(
        { success: false, error: '정확히 4개의 컷 설정이 필요합니다.' },
        { status: 400 }
      );
    }

    const timestamp = Date.now();
    const uploadPrefix = `run_${timestamp}`;

    // 1. Process BGM Upload if provided
    let bgmUploadPath = '';
    if (bgmBase64 && bgmBase64.includes('base64,')) {
      try {
        const parts = bgmBase64.split(';base64,');
        const mimeType = parts[0].split(':')[1];
        const base64Data = parts[1];
        const buffer = Buffer.from(base64Data, 'base64');
        
        let ext = 'mp3';
        if (mimeType.includes('wav')) ext = 'wav';
        else if (mimeType.includes('ogg')) ext = 'ogg';
        else if (mimeType.includes('aac')) ext = 'aac';
        else if (mimeType.includes('m4a')) ext = 'm4a';
        
        const uploadDir = path.join(process.cwd(), 'public', 'shorts', 'uploads');
        fs.mkdirSync(uploadDir, { recursive: true });
        
        const uploadFilename = `bgm_${uploadPrefix}.${ext}`;
        const absoluteUploadPath = path.join(uploadDir, uploadFilename);
        fs.writeFileSync(absoluteUploadPath, buffer);
        bgmUploadPath = absoluteUploadPath.replace(/\\/g, '/');
        console.log(`Saved uploaded BGM to: ${bgmUploadPath}`);
      } catch (e) {
        console.error('[BGM Upload Save Error]', e);
      }
    }

    // 2. Process and save base64 media for each cut
    const processedCuts = cuts.map((cut, idx) => {
      const cutCopy = { ...cut };
      
      // Save uploaded base64 image/video
      if (cut.uploadedBase64) {
        const savedMedia = saveBase64Media(cut.uploadedBase64, uploadPrefix, idx + 1);
        if (savedMedia) {
          if (savedMedia.isVideo) {
            cutCopy.video_path = savedMedia.path;
            cutCopy.image_path = '';
          } else {
            cutCopy.image_path = savedMedia.path;
            cutCopy.video_path = '';
          }
        }
      }
      
      // Resolve paths for local server (convert relative /shorts/ to absolute path if needed)
      // python script needs absolute paths if they are local
      if (cutCopy.image_path && cutCopy.image_path.startsWith('/shorts/')) {
        cutCopy.image_path = path.join(process.cwd(), 'public', cutCopy.image_path).replace(/\\/g, '/');
      }
      if (cutCopy.video_path && cutCopy.video_path.startsWith('/shorts/')) {
        cutCopy.video_path = path.join(process.cwd(), 'public', cutCopy.video_path).replace(/\\/g, '/');
      }
      
      return cutCopy;
    });

    const videoFilename = `cinema_shorts_${timestamp}.mp4`;
    const outputDir = path.join(process.cwd(), 'public', 'shorts');
    fs.mkdirSync(outputDir, { recursive: true });
    
    const absoluteOutputPath = path.join(outputDir, videoFilename);
    const relativeVideoUrl = `/shorts/${videoFilename}`;

    const configPath = path.join(outputDir, `cinema_config_${timestamp}.json`);
    const inputData = {
      cuts: processedCuts,
      bgm_style: bgmStyle || 'piano',
      bgm_volume: bgmVolume !== undefined ? bgmVolume : 15,
      bgm_upload_path: bgmUploadPath,
      output_path: absoluteOutputPath.replace(/\\/g, '/'),
      template_style: stylePreset || 'classic',
      color_preset: colorPreset || 'none',
      caption_style: captionStyle || 'minimal',
      caption_position: captionPosition || 'bottom',
      transition_effect: transitionEffect || 'fade',
      voice: voice || 'female'
    };

    fs.writeFileSync(configPath, JSON.stringify(inputData, null, 2), 'utf-8');

    console.log(`Triggering Cinema video generation script for ${videoFilename}...`);
    const scriptPath = path.join(process.cwd(), 'scripts', 'generate_cinema_shorts.py');

    // Run Python script
    return new Promise((resolve) => {
      exec(`python "${scriptPath}" "${configPath}"`, (error, stdout, stderr) => {
        // Clean up config file
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
          
          // Retry with python3
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
    console.error('Generate Cinema Video API Handler Error:', error);
    return NextResponse.json(
      { success: false, error: error.message },
      { status: 500 }
    );
  }
}
