import { spawn } from 'child_process';
import path from 'path';
import fs from 'fs';

/**
 * Runs a python script and returns a promise that resolves with stdout
 * @param {string} scriptPath Absolute path to the python script
 * @param {string[]} args Array of arguments
 * @param {object} env Additional environment variables
 * @returns {Promise<string>} stdout output
 */
export async function runPythonScript(scriptPath, args = [], env = {}) {
  // Try different python command names
  const pythonCommands = ['python', 'python3', 'py -3', 'py'];
  
  // Try to read pythonPath from VS Code settings if exists
  let customPythonPath = '';
  try {
    const settingsPath = path.join(process.cwd(), '..', '.vscode', 'settings.json');
    if (fs.existsSync(settingsPath)) {
      const settings = JSON.parse(fs.readFileSync(settingsPath, 'utf8'));
      if (settings['connectAiLab.pythonPath']) {
        customPythonPath = settings['connectAiLab.pythonPath'];
      }
    }
  } catch (e) {
    console.error('Failed to read VS Code settings for pythonPath', e);
  }

  const commandsToTry = customPythonPath ? [customPythonPath, ...pythonCommands] : pythonCommands;
  
  let lastError = null;

  for (const cmd of commandsToTry) {
    try {
      return await new Promise((resolve, reject) => {
        let spawnCmd = cmd;
        let spawnArgs = [scriptPath, ...args];
        
        // Handle command string with spaces (e.g. "py -3")
        if (cmd.includes(' ')) {
          const parts = cmd.split(' ');
          spawnCmd = parts[0];
          spawnArgs = [...parts.slice(1), scriptPath, ...args];
        }

        const child = spawn(spawnCmd, spawnArgs, {
          env: {
            ...process.env,
            ...env,
            PYTHONIOENCODING: 'utf-8',
          },
          shell: true
        });

        let stdout = '';
        let stderr = '';

        child.stdout.on('data', (data) => {
          stdout += data.toString('utf8');
        });

        child.stderr.on('data', (data) => {
          stderr += data.toString('utf8');
        });

        child.on('close', (code) => {
          if (code === 0) {
            resolve(stdout);
          } else {
            reject(new Error(`Exit code ${code}. Stderr: ${stderr || stdout}`));
          }
        });

        child.on('error', (err) => {
          reject(err);
        });
      });
    } catch (err) {
      console.warn(`Python command '${cmd}' failed: ${err.message}`);
      lastError = err;
    }
  }

  throw new Error(`Failed to execute python script with any command. Last error: ${lastError?.message}`);
}
