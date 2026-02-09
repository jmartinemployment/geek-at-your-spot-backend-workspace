// ============================================
// src/code-execution/executors/JavaScriptExecutor.ts
// Sandboxed JavaScript Execution using VM2
// ============================================

import { VM } from 'vm2';
import {
  CodeExecutionResult,
  ExecutionContext,
  SandboxConfig,
} from '../types';
import { toErrorMessage } from '../../utils/errors';

export class JavaScriptExecutor {
  private defaultConfig: SandboxConfig = {
    timeout: 5000,
    memoryLimit: 128 * 1024 * 1024, // 128MB
    allowedModules: ['lodash', 'moment', 'date-fns'],
    allowNetworkAccess: false,
    allowFileSystem: false,
    allowProcessSpawn: false,
  };

  constructor(private readonly config?: Partial<SandboxConfig>) {
    this.defaultConfig = { ...this.defaultConfig, ...config };
  }

  async execute(
    code: string,
    input?: any,
    context?: ExecutionContext
  ): Promise<CodeExecutionResult> {
    const startTime = Date.now();
    const logs: string[] = [];

    try {
      const sandboxConfig = {
        ...this.defaultConfig,
        timeout: context?.timeout || this.defaultConfig.timeout,
        allowedModules: context?.allowedModules || this.defaultConfig.allowedModules,
      };

      const vm = new VM({
        timeout: sandboxConfig.timeout,
        allowAsync: true,
        sandbox: {
          input: input || {},
          console: {
            log: (...args: any[]) => {
              logs.push(args.map(arg => this.stringify(arg)).join(' '));
            },
            error: (...args: any[]) => {
              logs.push('[ERROR] ' + args.map(arg => this.stringify(arg)).join(' '));
            },
            warn: (...args: any[]) => {
              logs.push('[WARN] ' + args.map(arg => this.stringify(arg)).join(' '));
            },
            info: (...args: any[]) => {
              logs.push('[INFO] ' + args.map(arg => this.stringify(arg)).join(' '));
            },
          },
          Math: Math,
          Date: Date,
          JSON: JSON,
          Array: Array,
          Object: Object,
          String: String,
          Number: Number,
          __result: undefined,
        },
      });

      const wrappedCode = `
        (async () => {
          ${code}
        })().then(result => {
          __result = result;
        }).catch(error => {
          throw error;
        });
      `;

      await vm.run(wrappedCode);

      const output = (vm as any).sandbox.__result;
      const executionTime = Date.now() - startTime;

      return {
        success: true,
        output,
        executionTime,
        logs,
      };
    } catch (error: unknown) {
      const executionTime = Date.now() - startTime;

      const rawMessage = toErrorMessage(error);
      let errorMessage = rawMessage;
      if (rawMessage.includes('Script execution timed out')) {
        errorMessage = `Execution timeout after ${this.defaultConfig.timeout}ms`;
      } else if (rawMessage.includes('memory limit')) {
        errorMessage = 'Memory limit exceeded';
      }

      return {
        success: false,
        error: errorMessage,
        executionTime,
        logs,
      };
    }
  }

  async executeCalculation(
    calculationCode: string,
    parameters: Record<string, any>
  ): Promise<CodeExecutionResult> {
    const code = `
      const calculate = ${calculationCode};
      return calculate(input);
    `;

    return this.execute(code, parameters);
  }

  validateSyntax(code: string): { valid: boolean; error?: string } {
    try {
      new Function(code);
      return { valid: true };
    } catch (error: unknown) {
      return {
        valid: false,
        error: toErrorMessage(error),
      };
    }
  }

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

        if (result.error?.includes('SyntaxError')) {
          return result;
        }
      } catch (error: unknown) {
        lastError = error;
      }

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

  async executeParallel(
    executions: Array<{ code: string; input?: any; context?: ExecutionContext }>
  ): Promise<CodeExecutionResult[]> {
    const promises = executions.map(({ code, input, context }) =>
      this.execute(code, input, context)
    );

    return Promise.all(promises);
  }

  private stringify(value: any): string {
    try {
      if (typeof value === 'string') return value;
      if (value === undefined) return 'undefined';
      if (value === null) return 'null';
      if (typeof value === 'function') return '[Function]';
      return JSON.stringify(value, null, 2);
    } catch {
      return String(value);
    }
  }

  private sleep(ms: number): Promise<void> {
    return new Promise(resolve => setTimeout(resolve, ms));
  }

  getConfig(): SandboxConfig {
    return { ...this.defaultConfig };
  }

  updateConfig(config: Partial<SandboxConfig>): void {
    this.defaultConfig = { ...this.defaultConfig, ...config };
  }
}

