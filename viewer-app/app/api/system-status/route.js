import { NextResponse } from 'next/server';
import { exec } from 'child_process';

// Helper to run shell commands
const runCmd = (cmd) => {
  return new Promise((resolve) => {
    exec(cmd, (error, stdout, stderr) => {
      if (error) {
        resolve({ success: false, stdout: '', stderr: error.message });
      } else {
        resolve({ success: true, stdout, stderr });
      }
    });
  });
};

// Helper for fetch with timeout
async function fetchWithTimeout(url, timeoutMs = 1500) {
  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), timeoutMs);
  
  try {
    const response = await fetch(url, { signal: controller.signal });
    clearTimeout(timeoutId);
    return response;
  } catch (err) {
    clearTimeout(timeoutId);
    throw err;
  }
}

export async function GET() {
  // 1. Probe Ollama (11434)
  let ollamaStatus = 'offline';
  let ollamaModels = [];
  try {
    const res = await fetchWithTimeout('http://127.0.0.1:11434/api/tags', 1500);
    if (res.ok) {
      const data = await res.json();
      ollamaStatus = 'online';
      if (data && Array.isArray(data.models)) {
        ollamaModels = data.models.map(m => m.name);
      }
    }
  } catch (e) {
    ollamaStatus = 'offline';
  }

  // 2. Probe LM Studio (1234)
  let lmStudioStatus = 'offline';
  let lmStudioModels = [];
  try {
    const res = await fetchWithTimeout('http://127.0.0.1:1234/v1/models', 1500);
    if (res.ok) {
      const data = await res.json();
      lmStudioStatus = 'online';
      if (data && Array.isArray(data.data)) {
        lmStudioModels = data.data.map(m => m.id);
      }
    }
  } catch (e) {
    lmStudioStatus = 'offline';
  }

  // 3. Check VRAM/GPU via nvidia-smi
  let gpuName = 'Unknown GPU';
  let usedVram = 0;
  let totalVram = 0;
  let hasGpu = false;
  let nvidiaSmiAvailable = false;

  const smiResult = await runCmd('nvidia-smi');
  if (smiResult.success && smiResult.stdout) {
    nvidiaSmiAvailable = true;
    hasGpu = true;
    const stdout = smiResult.stdout;

    // Parse GPU Name
    const gpuNameMatch = stdout.match(/\|\s+\d+\s+([^|]+?)\s+(?:WDDM|TCC)\s+\|/);
    if (gpuNameMatch) {
      gpuName = gpuNameMatch[1].trim();
    }

    // Parse VRAM usage (e.g. 3674MiB / 4096MiB)
    const vramMatch = stdout.match(/(\d+)\s*MiB\s*\/\s*(\d+)\s*MiB/);
    if (vramMatch) {
      usedVram = parseInt(vramMatch[1], 10);
      totalVram = parseInt(vramMatch[2], 10);
    }
  }

  return NextResponse.json({
    success: true,
    timestamp: new Date().toISOString(),
    llmServers: {
      ollama: {
        status: ollamaStatus,
        port: 11434,
        models: ollamaModels
      },
      lmStudio: {
        status: lmStudioStatus,
        port: 1234,
        models: lmStudioModels
      }
    },
    gpu: {
      available: hasGpu,
      nvidiaSmi: nvidiaSmiAvailable,
      name: gpuName,
      vram: {
        used: usedVram,
        total: totalVram,
        percentage: totalVram > 0 ? Math.round((usedVram / totalVram) * 100) : 0
      }
    },
    recommendations: {
      maxModelSize: totalVram > 0 && totalVram <= 4096 ? '3B (예: Qwen2.5-Coder-3B)' : '7B~8B',
      contextLimit: totalVram > 0 && totalVram <= 4096 ? '4096' : '8192',
      vramWarning: usedVram > 0 && (usedVram / totalVram) > 0.85
    }
  });
}
