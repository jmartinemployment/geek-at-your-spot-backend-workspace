// ============================================
// src/code-execution/CodeExecutionService.ts
// Code Execution Service - Orchestrates all execution & calculation features
// ============================================

import { JavaScriptExecutor } from './executors/JavaScriptExecutor';
import { PythonExecutor } from './executors/PythonExecutor';
import { CostCalculator } from './calculators/CostCalculator';
import { TimelineGenerator } from './calculators/TimelineGenerator';
import { FeasibilityChecker } from './calculators/FeasibilityChecker';
import {
  CodeExecutionRequest,
  CodeExecutionResult,
  CodeExecutionConfig,
  CostCalculationInput,
  CostCalculationResult,
  TimelineInput,
  TimelineResult,
  FeasibilityCheckInput,
  FeasibilityResult,
  ValidationRule,
  ValidationResult,
} from './types';
import { toErrorMessage } from '../utils/errors';

export class CodeExecutionService {
  private readonly jsExecutor: JavaScriptExecutor;
  private readonly pythonExecutor: PythonExecutor;
  private readonly costCalculator: CostCalculator;
  private readonly timelineGenerator: TimelineGenerator;
  private readonly feasibilityChecker: FeasibilityChecker;
  private config: CodeExecutionConfig;

  // Execution statistics
  private stats = {
    totalExecutions: 0,
    successfulExecutions: 0,
    failedExecutions: 0,
    averageExecutionTime: 0,
    totalExecutionTime: 0,
  };

  constructor(config?: Partial<CodeExecutionConfig>) {
    this.config = {
      enabled: config?.enabled ?? true,
      defaultTimeout: config?.defaultTimeout ?? 10000,
      defaultMemoryLimit: config?.defaultMemoryLimit ?? 256 * 1024 * 1024,
      allowedLanguages: config?.allowedLanguages ?? ['javascript', 'python'],
      pythonPath: config?.pythonPath,
      maxConcurrentExecutions: config?.maxConcurrentExecutions ?? 5,
    };

    // Initialize executors
    this.jsExecutor = new JavaScriptExecutor({
      timeout: this.config.defaultTimeout,
      memoryLimit: this.config.defaultMemoryLimit,
    });

    this.pythonExecutor = new PythonExecutor(
      this.config.pythonPath,
      {
        timeout: this.config.defaultTimeout,
        memoryLimit: this.config.defaultMemoryLimit,
      }
    );

    // Initialize calculators
    this.costCalculator = new CostCalculator();
    this.timelineGenerator = new TimelineGenerator();
    this.feasibilityChecker = new FeasibilityChecker();
  }

  /**
   * Execute code (auto-detect language)
   */
  async executeCode(request: CodeExecutionRequest): Promise<CodeExecutionResult> {
    if (!this.config.enabled) {
      return {
        success: false,
        error: 'Code execution is disabled',
        executionTime: 0,
      };
    }

    if (!this.config.allowedLanguages.includes(request.language)) {
      return {
        success: false,
        error: `Language ${request.language} is not allowed`,
        executionTime: 0,
      };
    }

    const startTime = Date.now();
    this.stats.totalExecutions++;

    try {
      let result: CodeExecutionResult;

      if (request.language === 'javascript') {
        result = await this.jsExecutor.execute(
          request.code,
          request.input,
          request.context
        );
      } else if (request.language === 'python') {
        result = await this.pythonExecutor.execute(
          request.code,
          request.input,
          request.context
        );
      } else {
        return {
          success: false,
          error: `Unsupported language: ${request.language}`,
          executionTime: 0,
        };
      }

      // Update stats
      const executionTime = Date.now() - startTime;
      this.stats.totalExecutionTime += executionTime;

      if (result.success) {
        this.stats.successfulExecutions++;
      } else {
        this.stats.failedExecutions++;
      }

      this.stats.averageExecutionTime =
        this.stats.totalExecutionTime / this.stats.totalExecutions;

      return result;
    } catch (error: unknown) {
      this.stats.failedExecutions++;

      return {
        success: false,
        error: toErrorMessage(error),
        executionTime: Date.now() - startTime,
      };
    }
  }

  /**
   * Calculate project cost
   */
  calculateCost(input: CostCalculationInput): CostCalculationResult {
    return this.costCalculator.calculate(input);
  }

  /**
   * Generate project timeline
   */
  generateTimeline(input: TimelineInput): TimelineResult {
    return this.timelineGenerator.generate(input);
  }

  /**
   * Check technical feasibility
   */
  checkFeasibility(input: FeasibilityCheckInput): FeasibilityResult {
    return this.feasibilityChecker.check(input);
  }

  /**
   * Validate data against rules
   */
  validate(data: any, rules: ValidationRule[]): ValidationResult {
    const errors: Array<{ field: string; message: string; value?: any }> = [];

    for (const rule of rules) {
      const value = this.getNestedValue(data, rule.field);
      const error = this.validateRule(rule, value);
      if (error) {
        errors.push(error);
      }
    }

    return {
      valid: errors.length === 0,
      errors,
    };
  }

  /**
   * Validate a single rule against a value
   */
  private validateRule(
    rule: ValidationRule,
    value: any
  ): { field: string; message: string; value?: any } | null {
    switch (rule.rule) {
      case 'required':
        return this.validateRequired(rule, value);
      case 'min':
        return this.validateBound(rule, value, 'min');
      case 'max':
        return this.validateBound(rule, value, 'max');
      case 'pattern':
        return this.validatePattern(rule, value);
      case 'custom':
        return this.validateCustom(rule, value);
      default:
        return null;
    }
  }

  private validateRequired(
    rule: ValidationRule,
    value: any
  ): { field: string; message: string; value?: any } | null {
    if (value === undefined || value === null || value === '') {
      return { field: rule.field, message: rule.message, value };
    }
    return null;
  }

  private validateBound(
    rule: ValidationRule,
    value: any,
    direction: 'min' | 'max'
  ): { field: string; message: string; value?: any } | null {
    const numericValue = typeof value === 'number' ? value : undefined;
    const lengthValue = typeof value === 'string' ? value.length : undefined;
    const comparable = numericValue ?? lengthValue;

    if (comparable === undefined) {
      return null;
    }

    const exceeded = direction === 'min'
      ? comparable < rule.value
      : comparable > rule.value;

    if (exceeded) {
      return { field: rule.field, message: rule.message, value };
    }
    return null;
  }

  private validatePattern(
    rule: ValidationRule,
    value: any
  ): { field: string; message: string; value?: any } | null {
    if (typeof value === 'string' && rule.value instanceof RegExp) {
      if (rule.value.exec(value) === null) {
        return { field: rule.field, message: rule.message, value };
      }
    }
    return null;
  }

  private validateCustom(
    rule: ValidationRule,
    value: any
  ): { field: string; message: string; value?: any } | null {
    if (rule.validator && !rule.validator(value)) {
      return { field: rule.field, message: rule.message, value };
    }
    return null;
  }

  /**
   * Execute calculation with dynamic code
   */
  async executeCalculation(
    language: 'javascript' | 'python',
    calculationCode: string,
    parameters: Record<string, any>
  ): Promise<CodeExecutionResult> {
    if (language === 'javascript') {
      return this.jsExecutor.executeCalculation(calculationCode, parameters);
    } else if (language === 'python') {
      return this.pythonExecutor.executeCalculation(calculationCode, parameters);
    }

    return {
      success: false,
      error: `Unsupported language: ${language}`,
      executionTime: 0,
    };
  }

  /**
   * Validate syntax without execution
   */
  async validateSyntax(language: 'javascript' | 'python', code: string): Promise<{
    valid: boolean;
    error?: string;
  }> {
    if (language === 'javascript') {
      return this.jsExecutor.validateSyntax(code);
    } else if (language === 'python') {
      return this.pythonExecutor.validateSyntax(code);
    }

    return {
      valid: false,
      error: `Unsupported language: ${language}`,
    };
  }

  /**
   * Get all available features
   */
  getAvailableFeatures(): string[] {
    return this.costCalculator.getAllFeatures();
  }

  /**
   * Get feature hours
   */
  getFeatureHours(feature: string): number {
    return this.costCalculator.getFeatureHours(feature);
  }

  /**
   * Add custom feature to cost calculator
   */
  addCustomFeature(feature: string, hours: number, dependencies?: string[]): void {
    this.costCalculator.addCustomFeature(feature, hours, dependencies);
  }

  /**
   * Calculate earliest project completion date
   */
  calculateEarliestCompletion(input: TimelineInput, startDate: Date): Date {
    return this.timelineGenerator.calculateEarliestCompletion(input, startDate);
  }

  /**
   * Optimize timeline
   */
  optimizeTimeline(input: TimelineInput): TimelineResult {
    return this.timelineGenerator.optimize(input);
  }

  /**
   * Compare cost scenarios
   */
  compareCostScenarios(
    baseInput: CostCalculationInput,
    scenarios: Array<Partial<CostCalculationInput>>
  ): Array<{ name: string; result: CostCalculationResult }> {
    return this.costCalculator.compareScenarios(baseInput, scenarios);
  }

  /**
   * Check if Python is available
   */
  async isPythonAvailable(): Promise<boolean> {
    return this.pythonExecutor.isPythonAvailable();
  }

  /**
   * Get Python version
   */
  async getPythonVersion(): Promise<string> {
    return this.pythonExecutor.getPythonVersion();
  }

  /**
   * Get service statistics
   */
  getStats() {
    return {
      ...this.stats,
      config: this.config,
    };
  }

  /**
   * Reset statistics
   */
  resetStats(): void {
    this.stats = {
      totalExecutions: 0,
      successfulExecutions: 0,
      failedExecutions: 0,
      averageExecutionTime: 0,
      totalExecutionTime: 0,
    };
  }

  /**
   * Health check
   */
  async healthCheck(): Promise<{
    enabled: boolean;
    javascript: boolean;
    python: boolean;
    calculators: boolean;
  }> {
    return {
      enabled: this.config.enabled,
      javascript: true, // Always available
      python: await this.pythonExecutor.isPythonAvailable(),
      calculators: true, // Always available
    };
  }

  /**
   * Update configuration
   */
  updateConfig(config: Partial<CodeExecutionConfig>): void {
    this.config = { ...this.config, ...config };

    // Update executors
    if (config.defaultTimeout || config.defaultMemoryLimit) {
      this.jsExecutor.updateConfig({
        timeout: config.defaultTimeout || this.config.defaultTimeout,
        memoryLimit: config.defaultMemoryLimit || this.config.defaultMemoryLimit,
      });

      this.pythonExecutor.updateConfig({
        timeout: config.defaultTimeout || this.config.defaultTimeout,
        memoryLimit: config.defaultMemoryLimit || this.config.defaultMemoryLimit,
      });
    }
  }

  /**
   * Get configuration
   */
  getConfig(): CodeExecutionConfig {
    return { ...this.config };
  }

  /**
   * Helper: Get nested value from object
   */
  private getNestedValue(obj: any, path: string): any {
    const keys = path.split('.');
    let value = obj;

    for (const key of keys) {
      if (value === undefined || value === null) {
        return undefined;
      }
      value = value[key];
    }

    return value;
  }
}
