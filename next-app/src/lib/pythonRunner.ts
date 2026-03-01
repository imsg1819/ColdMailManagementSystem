import { spawn } from 'child_process';
import path from 'path';

/**
 * Utility to spawn a Python script and return its JSON output.
 * @param {string} scriptName - Name of the script (e.g. 'parse_resume.py')
 * @param {string[]} args - Arguments to pass to the script (e.g. file path)
 * @param {string?} input - Optional stringified JSON to pipe into stdin (for send_email.py)
 * @returns {Promise<any>}
 */
export async function runPythonScript(scriptName: string, args: string[] = [], input: string | null = null): Promise<any> {
  return new Promise((resolve, reject) => {
    // Determine the absolute path to the Python services folder
    const servicesPath = path.join(process.cwd(), '..', 'python-services');
    const scriptPath = path.join(servicesPath, scriptName);
    const pythonExe = path.join(servicesPath, 'venv', 'Scripts', 'python.exe');

    const pyProcess = spawn(pythonExe, [scriptPath, ...args]);
    
    let output = '';
    let errorOutput = '';

    if (input) {
      pyProcess.stdin.write(input);
      pyProcess.stdin.end();
    }

    pyProcess.stdout.on('data', (data) => {
      output += data.toString();
    });

    pyProcess.stderr.on('data', (data) => {
      errorOutput += data.toString();
    });

    pyProcess.on('close', (code) => {
      if (code !== 0) {
        console.error(`Python script exited with code ${code}`, errorOutput);
        return reject(new Error(`Python Error: ${errorOutput}`));
      }

      try {
        // Parse the stdout from Python as JSON
        const jsonResponse = JSON.parse(output.trim());
        if (!jsonResponse.success) {
          reject(new Error(jsonResponse.error || "Unknown Python Error"));
        } else {
          resolve(jsonResponse);
        }
      } catch (parseError) {
        console.error("Failed to parse Python output:", output);
        reject(new Error("Failed to parse Python output as JSON"));
      }
    });
  });
}
