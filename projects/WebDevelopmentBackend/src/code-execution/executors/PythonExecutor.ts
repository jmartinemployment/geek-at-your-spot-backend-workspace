// ============================================
// src/code-execution/executors/PythonExecutor.ts
// Sandboxed Python Execution
// ============================================

import { spawn } from 'node:child_process';
import * as path from 'node:path';
import * as fs from 'node:fs/promises';
import * as os from 'node:os';
import {
  CodeExecutionResult,
  ExecutionContext,
  SandboxConfig,
} from '../types';

export class PythonExecutor {
  private defaultConfig: SandboxConfig = {
    timeout: 10000,
    memoryLimit: 256 * 1024 * 1024, // 256MB
    allowedModules: ['math', 'json', 'datetime', 're'],
    allowNetworkAccess: false,
    allowFileSystem: false,
    allowProcessSpawn: false,
  };

  private readonly pythonPath: string;

  constructor(
    pythonPath?: string,
    config?: Partial<SandboxConfig>
  ) {
    this.pythonPath = pythonPath || 'python3';
    this.defaultConfig = { ...this.defaultConfig, ...config };
  }

  /**
   * Execute Python code in a sandboxed environment
   */
  async execute(
    code: string,
    input?: any,
    context?: ExecutionContext
  ): Promise<CodeExecutionResult> {
    const startTime = Date.now();
    const logs: string[] = [];

    try {
      // Merge context with defaults
      const sandboxConfig = {
        ...this.defaultConfig,
        timeout: context?.timeout || this.defaultConfig.timeout,
        allowedModules: context?.allowedModules || this.defaultConfig.allowedModules,
      };

      // Create temporary file for Python code
      const tempDir = await fs.mkdtemp(path.join(os.tmpdir(), 'python-exec-'));
      const scriptPath = path.join(tempDir, 'script.py');

      // Wrap code with safety restrictions and input handling
      const wrappedCode = this.wrapCode(code, input, sandboxConfig);

      // Write code to temporary file
      await fs.writeFile(scriptPath, wrappedCode, 'utf-8');

      // Execute Python script
      const result = await this.runPythonScript(scriptPath, sandboxConfig.timeout);

      // Cleanup
      await fs.rm(tempDir, { recursive: true, force: true });

      const executionTime = Date.now() - startTime;

      // Parse output
      const output = this.parseOutput(result.stdout);
      const errorLogs = result.stderr ? result.stderr.split('\n').filter(line => line.trim()) : [];

      return {
        success: result.exitCode === 0,
        output: output.result,
        error: result.exitCode === 0 ? undefined : result.stderr,
        executionTime,
        logs: [...output.logs, ...errorLogs],
      };
    } catch (error: unknown) {
      const executionTime = Date.now() - startTime;

      return {
        success: false,
        error: error instanceof Error ? error.message : String(error),
        executionTime,
        logs,
      };
    }
  }

  /**
   * Execute a calculation function
   */
  async executeCalculation(
    calculationCode: string,
    parameters: Record<string, any>
  ): Promise<CodeExecutionResult> {
    const code = `
import json

# User's calculation function
${calculationCode}

# Execute calculation with input
if __name__ == '__main__':
    result = calculate(__input__)
    print('__RESULT__', json.dumps(result))
`;

    return this.execute(code, parameters);
  }

  /**
   * Validate Python syntax without execution
   */
  async validateSyntax(code: string): Promise<{ valid: boolean; error?: string }> {
    try {
      const tempDir = await fs.mkdtemp(path.join(os.tmpdir(), 'python-check-'));
      const scriptPath = path.join(tempDir, 'check.py');

      await fs.writeFile(scriptPath, code, 'utf-8');

      const result = await this.runCommand(this.pythonPath, ['-m', 'py_compile', scriptPath], 5000);

      await fs.rm(tempDir, { recursive: true, force: true });

      return {
        valid: result.exitCode === 0,
        error: result.exitCode === 0 ? undefined : result.stderr,
      };
    } catch (error: unknown) {
      return {
        valid: false,
        error: error instanceof Error ? error.message : String(error),
      };
    }
  }

  /**
   * Execute with retry logic
   */
  async executeWithRetry(
    code: string,
    input?: any,
    context?: ExecutionContext,
    maxRetries: number = 2
  ): Promise<CodeExecutionResult> {
    let lastError: any;

    for (let attempt = 0; attempt <= maxRetries; attempt++) {
      try {
        const result = await this.execute(code, input, context);

        if (result.success) {
          return result;
        }

        lastError = result.error;

        // Don't retry on syntax errors
        if (result.error?.includes('SyntaxError') || result.error?.includes('IndentationError')) {
          return result;
        }
      } catch (error: unknown) {
        lastError = error;
      }

      // Wait before retry
      if (attempt < maxRetries) {
        await this.sleep(Math.pow(2, attempt) * 100);
      }
    }

    return {
      success: false,
      error: `Failed after ${maxRetries + 1} attempts: ${lastError}`,
      executionTime: 0,
      logs: [],
    };
  }

  /**
   * Wrap Python code with safety restrictions
   */
  private wrapCode(code: string, input: any, config: SandboxConfig): string {
    const inputJson = JSON.stringify(input || {});

    return `
import sys
import json
import signal

# Setup timeout
def timeout_handler(signum, frame):
    raise TimeoutError('Execution timeout')

signal.signal(signal.SIGALRM, timeout_handler)
signal.alarm(${Math.ceil(config.timeout / 1000)})

# Disable dangerous modules
_blocked_modules = ['os', 'subprocess', 'socket', 'http', 'urllib', 'requests']
_original_import = __builtins__.__import__

def _restricted_import(name, *args, **kwargs):
    if any(blocked in name for blocked in _blocked_modules):
        raise ImportError(f'Module {name} is not allowed')
    return _original_import(name, *args, **kwargs)

__builtins__.__import__ = _restricted_import

# Setup input
__input__ = json.loads('${inputJson.replaceAll("'", "\\'")}')

# Capture logs
_logs = []
_original_print = print

def print(*args, **kwargs):
    message = ' '.join(str(arg) for arg in args)
    if not message.startswith('__RESULT__') and not message.startswith('__LOG__'):
        _logs.append(message)
        _original_print('__LOG__', message)
    else:
        _original_print(*args, **kwargs)

__builtins__.print = print

# User code
try:
    ${code}
except Exception as e:
    print('__ERROR__', str(e))
    sys.exit(1)
`;
  }

  /**
   * Run Python script
   */
  private async runPythonScript(
    scriptPath: string,
    timeout: number
  ): Promise<{ stdout: string; stderr: string; exitCode: number }> {
    return this.runCommand(this.pythonPath, [scriptPath], timeout);
  }

  /**
   * Run command with timeout
   */
  private async runCommand(
    command: string,
    args: string[],
    timeout: number
  ): Promise<{ stdout: string; stderr: string; exitCode: number }> {
    return new Promise((resolve, reject) => {
      const process = spawn(command, args);

      let stdout = '';
      let stderr = '';
      let timedOut = false;

      const timeoutId = setTimeout(() => {
        timedOut = true;
        process.kill('SIGTERM');

        // Force kill after 1 second
        setTimeout(() => {
          if (!process.killed) {
            process.kill('SIGKILL');
          }
        }, 1000);
      }, timeout);

      process.stdout.on('data', (data) => {
        stdout += data.toString();
      });

      process.stderr.on('data', (data) => {
        stderr += data.toString();
      });

      process.on('close', (code) => {
        clearTimeout(timeoutId);

        if (timedOut) {
          reject(new Error(`Execution timeout after ${timeout}ms`));
        } else {
          resolve({
            stdout,
            stderr,
            exitCode: code || 0,
          });
        }
      });

      process.on('error', (error) => {
        clearTimeout(timeoutId);
        reject(error);
      });
    });
  }

  /**
   * Parse Python output
   */
  private parseOutput(stdout: string): { result: any; logs: string[] } {
    const lines = stdout.split('\n');
    const logs: string[] = [];
    let result: any = undefined;

    for (const line of lines) {
      if (line.startsWith('__RESULT__')) {
        try {
          const jsonStr = line.substring('__RESULT__'.length).trim();
          result = JSON.parse(jsonStr);
        } catch {
          result = line.substring('__RESULT__'.length).trim();
        }
      } else if (line.startsWith('__LOG__')) {
        logs.push(line.substring('__LOG__'.length).trim());
      } else if (line.startsWith('__ERROR__')) {
        logs.push('[ERROR] ' + line.substring('__ERROR__'.length).trim());
      } else if (line.trim()) {
        logs.push(line);
      }
    }

    return { result, logs };
  }

  /**
   * Helper: Sleep function
   */
  private sleep(ms: number): Promise<void> {
    return new Promise(resolve => setTimeout(resolve, ms));
  }

  /**
   * Get current configuration
   */
  getConfig(): SandboxConfig {
    return { ...this.defaultConfig };
  }

  /**
   * Update configuration
   */
  updateConfig(config: Partial<SandboxConfig>): void {
    this.defaultConfig = { ...this.defaultConfig, ...config };
  }

  /**
   * Get Python version
   */
  async getPythonVersion(): Promise<string> {
    try {
      const result = await this.runCommand(this.pythonPath, ['--version'], 5000);
      return result.stdout.trim() || result.stderr.trim();
    } catch {
      return 'Unknown';
    }
  }

  /**
   * Check if Python is available
   */
  async isPythonAvailable(): Promise<boolean> {
    try {
      const result = await this.runCommand(this.pythonPath, ['--version'], 5000);
      return result.exitCode === 0;
    } catch {
      return false;
    }
  }
}
