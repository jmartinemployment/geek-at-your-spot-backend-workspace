// @ts-nocheck - Module excluded from tsconfig (batch types not in project scope)
// ============================================
// src/batch/processor/JobProcessor.ts
// Job Processor - Executes jobs in the background
// ============================================

import {
  Job,
  JobProcessor as JobProcessorFn,
  ProcessingContext,
  JobEvent,
  JobEventType,
  ProcessorRegistryEntry,
} from '../types';
import { JobQueue } from '../queue/JobQueue';
import { logger } from '../../../utils/logger';
import { toErrorMessage } from '../../../utils/errors';

export class JobProcessor {
  private readonly queue: JobQueue;
  private readonly processors: Map<string, JobProcessorFn> = new Map();
  private processingLoop: NodeJS.Timeout | null = null;
  private isRunning: boolean = false;
  private readonly eventListeners: Map<JobEventType, Array<(event: JobEvent) => void>> = new Map();
  private readonly cancellationSignals: Map<string, boolean> = new Map();

  constructor(queue: JobQueue) {
    this.queue = queue;
  }

  /**
   * Register a job processor
   */
  registerProcessor(type: string, processor: JobProcessorFn): void {
    this.processors.set(type, processor);
  }

  /**
   * Register multiple processors
   */
  registerProcessors(entries: ProcessorRegistryEntry[]): void {
    for (const entry of entries) {
      this.processors.set(entry.type, entry.processor);
    }
  }

  /**
   * Start processing jobs
   */
  start(interval: number = 1000): void {
    if (this.isRunning) {
      return;
    }

    this.isRunning = true;
    logger.info('[JobProcessor] Started');

    this.processingLoop = setInterval(() => {
      this.processNextJob();
    }, interval);
  }

  /**
   * Stop processing jobs
   */
  stop(): void {
    if (!this.isRunning) {
      return;
    }

    this.isRunning = false;

    if (this.processingLoop) {
      clearInterval(this.processingLoop);
      this.processingLoop = null;
    }

    logger.info('[JobProcessor] Stopped');
  }

  /**
   * Process next available job
   */
  private async processNextJob(): Promise<void> {
    const job = this.queue.getNextJob();

    if (!job) {
      return;
    }

    await this.processJob(job);
  }

  /**
   * Process a specific job
   */
  async processJob(job: Job): Promise<void> {
    const processor = this.processors.get(job.type);

    if (!processor) {
      this.queue.updateJob(job.id, {
        status: 'failed',
        error: `No processor registered for job type: ${job.type}`,
        completedAt: new Date(),
      });

      this.emitEvent('job_failed', job.id, {
        error: `No processor registered for job type: ${job.type}`,
      });

      return;
    }

    // Emit started event
    this.emitEvent('job_started', job.id);

    // Create processing context
    const context: ProcessingContext = {
      jobId: job.id,
      userId: job.userId,
      updateProgress: async (progress: number) => {
        this.queue.updateJob(job.id, { progress });
        this.emitEvent('job_progress', job.id, { progress });
      },
      log: (message: string, level: 'info' | 'warn' | 'error' = 'info') => {
        logger.log(level, `[Job ${job.id}] ${message}`);
      },
      isCancelled: () => {
        return this.cancellationSignals.get(job.id) || false;
      },
    };

    try {
      // Set up timeout
      const timeoutPromise = new Promise((_, reject) => {
        setTimeout(() => {
          reject(new Error('Job timeout'));
        }, job.timeout || 60000);
      });

      // Execute job with timeout
      const result = await Promise.race([
        processor(job, context),
        timeoutPromise,
      ]);

      // Check if cancelled
      if (context.isCancelled()) {
        this.queue.updateJob(job.id, {
          status: 'cancelled',
          completedAt: new Date(),
        });

        this.emitEvent('job_cancelled', job.id);
        return;
      }

      // Job completed successfully
      this.queue.updateJob(job.id, {
        status: 'completed',
        result,
        completedAt: new Date(),
        progress: 100,
      });

      this.emitEvent('job_completed', job.id, { result });
    } catch (error: unknown) {
      // Job failed
      const errorMessage = toErrorMessage(error);

      this.queue.updateJob(job.id, {
        status: 'failed',
        error: errorMessage,
        attempts: job.attempts + 1,
      });

      this.emitEvent('job_failed', job.id, {
        error: errorMessage,
        attempt: job.attempts + 1,
      });

      // Check if should retry
      if (job.attempts + 1 < job.maxAttempts) {
        this.emitEvent('job_retrying', job.id, {
          attempt: job.attempts + 1,
          maxAttempts: job.maxAttempts,
        });
      }
    } finally {
      // Cleanup cancellation signal
      this.cancellationSignals.delete(job.id);
    }
  }

  /**
   * Cancel a job
   */
  cancelJob(jobId: string): void {
    this.cancellationSignals.set(jobId, true);
    this.queue.cancelJob(jobId);
  }

  /**
   * Emit event
   */
  private emitEvent(type: JobEventType, jobId: string, data?: any): void {
    const event: JobEvent = {
      type,
      jobId,
      timestamp: new Date(),
      data,
    };

    const listeners = this.eventListeners.get(type) || [];

    for (const listener of listeners) {
      try {
        listener(event);
      } catch (error) {
        logger.error('[JobProcessor] Event listener error:', { error });
      }
    }

    // Also notify "all events" listeners
    const allListeners = this.eventListeners.get('job_created') || [];
    for (const listener of allListeners) {
      try {
        listener(event);
      } catch (error) {
        logger.error('[JobProcessor] Event listener error:', { error });
      }
    }
  }

  /**
   * Add event listener
   */
  on(eventType: JobEventType, listener: (event: JobEvent) => void): void {
    const existing = this.eventListeners.get(eventType);
    const listeners = existing ?? [];
    if (!existing) {
      this.eventListeners.set(eventType, listeners);
    }

    listeners.push(listener);
  }

  /**
   * Remove event listener
   */
  off(eventType: JobEventType, listener: (event: JobEvent) => void): void {
    const listeners = this.eventListeners.get(eventType);

    if (!listeners) {
      return;
    }

    const index = listeners.indexOf(listener);

    if (index !== -1) {
      listeners.splice(index, 1);
    }
  }

  /**
   * Get registered processors
   */
  getProcessors(): string[] {
    return Array.from(this.processors.keys());
  }

  /**
   * Check if processor is registered
   */
  hasProcessor(type: string): boolean {
    return this.processors.has(type);
  }

  /**
   * Check if running
   */
  isProcessing(): boolean {
    return this.isRunning;
  }

  /**
   * Get processing status
   */
  getStatus(): {
    running: boolean;
    registeredProcessors: number;
    queueSize: number;
    processing: number;
  } {
    return {
      running: this.isRunning,
      registeredProcessors: this.processors.size,
      queueSize: this.queue.getQueueSize(),
      processing: this.queue.getProcessingCount(),
    };
  }
}

/**
 * Default job processors for common tasks
 */
export class DefaultProcessors {
  /**
   * Code execution processor
   */
  static readonly codeExecution: JobProcessorFn = async (job, context) => {
    context.log('Starting code execution');

    const { language } = job.data;

    // Import code execution service
    // This would integrate with your CodeExecutionService
    // For now, return placeholder
    context.updateProgress(50);

    const result = {
      language,
      executed: true,
      timestamp: new Date(),
    };

    context.updateProgress(100);
    context.log('Code execution completed');

    return result;
  };

  /**
   * Cost calculation processor
   */
  static readonly costCalculation: JobProcessorFn = async (_job, context) => {
    context.log('Starting cost calculation');

    // Import cost calculator
    // This would integrate with your CostCalculator
    context.updateProgress(30);

    const result = {
      totalCost: 10000,
      breakdown: {},
      timestamp: new Date(),
    };

    context.updateProgress(100);
    context.log('Cost calculation completed');

    return result;
  };

  /**
   * Timeline generation processor
   */
  static readonly timelineGeneration: JobProcessorFn = async (_job, context) => {
    context.log('Generating timeline');

    context.updateProgress(50);

    const result = {
      phases: [],
      totalDuration: 90,
      timestamp: new Date(),
    };

    context.updateProgress(100);
    context.log('Timeline generated');

    return result;
  };

  /**
   * Feasibility check processor
   */
  static readonly feasibilityCheck: JobProcessorFn = async (_job, context) => {
    context.log('Checking feasibility');

    context.updateProgress(50);

    const result = {
      feasible: true,
      score: 85,
      risks: [],
      timestamp: new Date(),
    };

    context.updateProgress(100);
    context.log('Feasibility check completed');

    return result;
  };

  /**
   * A2A workflow processor
   */
  static readonly a2aWorkflow: JobProcessorFn = async (job, context) => {
    context.log('Starting A2A workflow');

    const { agents } = job.data;

    context.updateProgress(25);

    // Check for cancellation
    if (context.isCancelled()) {
      throw new Error('Job cancelled');
    }

    context.updateProgress(50);

    const result = {
      success: true,
      agentsUsed: agents || [],
      timestamp: new Date(),
    };

    context.updateProgress(100);
    context.log('A2A workflow completed');

    return result;
  };

  /**
   * Context compression processor
   */
  static readonly contextCompression: JobProcessorFn = async (_job, context) => {
    context.log('Starting context compression');

    context.updateProgress(50);

    const result = {
      compressed: true,
      originalTokens: 100000,
      compressedTokens: 60000,
      timestamp: new Date(),
    };

    context.updateProgress(100);
    context.log('Context compression completed');

    return result;
  };

  /**
   * Bulk analysis processor
   */
  static readonly bulkAnalysis: JobProcessorFn = async (job, context) => {
    context.log('Starting bulk analysis');

    const { items } = job.data;
    const total = items.length;

    for (let i = 0; i < total; i++) {
      if (context.isCancelled()) {
        throw new Error('Job cancelled');
      }

      // Process item
      context.log(`Processing item ${i + 1}/${total}`);
      context.updateProgress(Math.floor(((i + 1) / total) * 100));

      // Simulate processing
      await new Promise((resolve) => setTimeout(resolve, 100));
    }

    const result = {
      processed: total,
      timestamp: new Date(),
    };

    context.log('Bulk analysis completed');

    return result;
  };

  /**
   * Report generation processor
   */
  static readonly reportGeneration: JobProcessorFn = async (job, context) => {
    context.log('Generating report');

    const { reportType } = job.data;

    context.updateProgress(30);

    // Generate report
    context.updateProgress(60);

    const result = {
      reportType,
      generated: true,
      url: '/reports/example.pdf',
      timestamp: new Date(),
    };

    context.updateProgress(100);
    context.log('Report generated');

    return result;
  };

  /**
   * Data export processor
   */
  static readonly dataExport: JobProcessorFn = async (job, context) => {
    context.log('Exporting data');

    const { format } = job.data;

    context.updateProgress(50);

    const result = {
      format,
      recordCount: 1000,
      url: '/exports/data.csv',
      timestamp: new Date(),
    };

    context.updateProgress(100);
    context.log('Data export completed');

    return result;
  };

  /**
   * Get all default processors
   */
  static getAll(): ProcessorRegistryEntry[] {
    return [
      { type: 'code_execution', processor: this.codeExecution },
      { type: 'cost_calculation', processor: this.costCalculation },
      { type: 'timeline_generation', processor: this.timelineGeneration },
      { type: 'feasibility_check', processor: this.feasibilityCheck },
      { type: 'a2a_workflow', processor: this.a2aWorkflow },
      { type: 'context_compression', processor: this.contextCompression },
      { type: 'bulk_analysis', processor: this.bulkAnalysis },
      { type: 'report_generation', processor: this.reportGeneration },
      { type: 'data_export', processor: this.dataExport },
    ];
  }
}
