// @ts-nocheck - Module excluded from tsconfig (batch types not in project scope)
// ============================================
// src/batch/BatchService.ts
// Batch Service - Main orchestrator for batch processing
// ============================================

import { JobQueue } from './queue/JobQueue';
import { JobProcessor, DefaultProcessors } from './processor/JobProcessor';
import { logger } from '../../utils/logger';
import {
  BatchConfig,
  Job,
  CreateJobOptions,
  JobFilterOptions,
  JobStatistics,
  JobType,
  JobPriority,
  BatchJob,
  CreateBatchOptions,
  JobResult,
  QueueStatistics,
  QueueHealth,
  JobEvent,
  JobEventType,
  BulkOperationResult,
} from './types';

export class BatchService {
  private config: BatchConfig;
  private readonly queue: JobQueue;
  private readonly processor: JobProcessor;
  private initialized: boolean = false;
  private readonly batches: Map<string, BatchJob> = new Map();

  constructor(config: Partial<BatchConfig>) {
    this.config = {
      enabled: config.enabled ?? true,
      defaultConcurrency: config.defaultConcurrency || 5,
      defaultMaxRetries: config.defaultMaxRetries || 3,
      defaultTimeout: config.defaultTimeout || 60000,
      defaultRetryDelay: config.defaultRetryDelay || 1000,
      maxJobAge: config.maxJobAge || 86400000, // 24 hours
      enableScheduledJobs: config.enableScheduledJobs ?? false,
      enableMetrics: config.enableMetrics ?? true,
      storageType: config.storageType || 'memory',
      redisUrl: config.redisUrl,
    };

    // Initialize components
    this.queue = new JobQueue({
      name: 'main',
      concurrency: this.config.defaultConcurrency,
      maxRetries: this.config.defaultMaxRetries,
      retryDelay: this.config.defaultRetryDelay,
      timeout: this.config.defaultTimeout,
    });

    this.processor = new JobProcessor(this.queue);
  }

  /**
   * Initialize service
   */
  async initialize(): Promise<void> {
    if (this.initialized) {
      return;
    }

    // Register default processors
    this.processor.registerProcessors(DefaultProcessors.getAll());

    // Start processor
    this.processor.start(1000);

    this.initialized = true;
    logger.info('[Batch Service] Initialized');
  }

  /**
   * Create a job
   */
  async createJob(options: CreateJobOptions): Promise<Job> {
    if (!this.config.enabled) {
      throw new Error('Batch Service is disabled');
    }

    if (!this.initialized) {
      await this.initialize();
    }

    const job = this.queue.createJob(options);

    logger.info(`[Batch Service] Created job ${job.id} (${job.type})`);

    return job;
  }

  /**
   * Create multiple jobs at once
   */
  async createJobs(options: CreateJobOptions[]): Promise<Job[]> {
    const jobs: Job[] = [];

    for (const opt of options) {
      const job = await this.createJob(opt);
      jobs.push(job);
    }

    return jobs;
  }

  /**
   * Create a batch of jobs
   */
  async createBatch(options: CreateBatchOptions): Promise<BatchJob> {
    const jobs: Job[] = [];

    // Create all jobs
    for (let i = 0; i < options.jobs.length; i++) {
      const jobOptions = options.jobs[i];

      // Add dependencies for sequential execution
      if (options.sequential && i > 0) {
        jobOptions.dependencies = [jobs[i - 1].id];
      }

      const job = await this.createJob(jobOptions);
      jobs.push(job);
    }

    // Create batch record
    const batch: BatchJob = {
      id: `batch-${Date.now()}`,
      name: options.name,
      jobs: jobs.map((j) => j.id),
      status: 'queued',
      progress: 0,
      completedJobs: 0,
      totalJobs: jobs.length,
      createdAt: new Date(),
      userId: options.userId,
      metadata: options.metadata,
    };

    this.batches.set(batch.id, batch);

    logger.info(`[Batch Service] Created batch ${batch.id} with ${jobs.length} jobs`);

    return batch;
  }

  /**
   * Get job by ID
   */
  getJob(jobId: string): Job | undefined {
    return this.queue.getJob(jobId);
  }

  /**
   * Get jobs by filter
   */
  getJobs(filter?: JobFilterOptions): Job[] {
    return this.queue.getJobs(filter);
  }

  /**
   * Get batch by ID
   */
  getBatch(batchId: string): BatchJob | undefined {
    const batch = this.batches.get(batchId);

    if (batch) {
      // Update batch status
      this.updateBatchStatus(batch);
    }

    return batch;
  }

  /**
   * Update batch status based on job statuses
   */
  private updateBatchStatus(batch: BatchJob): void {
    const jobs = batch.jobs.map((id) => this.queue.getJob(id)).filter((j): j is Job => j !== undefined);

    const completedJobs = jobs.filter(
      (j) => j.status === 'completed' || j.status === 'failed' || j.status === 'cancelled'
    );

    batch.completedJobs = completedJobs.length;
    batch.progress = Math.floor((completedJobs.length / batch.totalJobs) * 100);

    // Determine batch status
    if (completedJobs.length === batch.totalJobs) {
      const failedJobs = jobs.filter((j) => j.status === 'failed');

      if (failedJobs.length > 0) {
        batch.status = 'failed';
      } else {
        batch.status = 'completed';
        batch.completedAt = new Date();
      }
    } else if (jobs.some((j) => j.status === 'processing')) {
      batch.status = 'processing';
    }
  }

  /**
   * Cancel job
   */
  cancelJob(jobId: string): void {
    this.processor.cancelJob(jobId);
    logger.info(`[Batch Service] Cancelled job ${jobId}`);
  }

  /**
   * Cancel batch
   */
  cancelBatch(batchId: string): void {
    const batch = this.batches.get(batchId);

    if (!batch) {
      throw new Error(`Batch not found: ${batchId}`);
    }

    // Cancel all jobs in batch
    for (const jobId of batch.jobs) {
      try {
        this.cancelJob(jobId);
      } catch (error) {
        // Continue cancelling other jobs
      }
    }

    batch.status = 'cancelled';
    logger.info(`[Batch Service] Cancelled batch ${batchId}`);
  }

  /**
   * Delete job
   */
  deleteJob(jobId: string): void {
    this.queue.deleteJob(jobId);
  }

  /**
   * Get job result
   */
  getJobResult<T = any>(jobId: string): JobResult<T> | null {
    const job = this.queue.getJob(jobId);

    if (!job) {
      return null;
    }

    const duration =
      job.completedAt && job.startedAt
        ? job.completedAt.getTime() - job.startedAt.getTime()
        : 0;

    return {
      jobId: job.id,
      status: job.status,
      result: job.result,
      error: job.error,
      duration,
      attempts: job.attempts,
      createdAt: job.createdAt,
      completedAt: job.completedAt,
    };
  }

  /**
   * Wait for job completion
   */
  async waitForJob<T = any>(
    jobId: string,
    timeout: number = 60000
  ): Promise<JobResult<T>> {
    const startTime = Date.now();

    return new Promise((resolve, reject) => {
      const checkInterval = setInterval(() => {
        const job = this.queue.getJob(jobId);

        if (!job) {
          clearInterval(checkInterval);
          reject(new Error('Job not found'));
          return;
        }

        if (job.status === 'completed' || job.status === 'failed' || job.status === 'cancelled') {
          clearInterval(checkInterval);
          const result = this.getJobResult<T>(jobId);
          if (result) {
            resolve(result);
          } else {
            reject(new Error('Job result not available'));
          }
          return;
        }

        // Check timeout
        if (Date.now() - startTime > timeout) {
          clearInterval(checkInterval);
          reject(new Error('Job wait timeout'));
        }
      }, 100);
    });
  }

  /**
   * Wait for batch completion
   */
  async waitForBatch(batchId: string, timeout: number = 300000): Promise<BatchJob> {
    const startTime = Date.now();

    return new Promise((resolve, reject) => {
      const checkInterval = setInterval(() => {
        const batch = this.getBatch(batchId);

        if (!batch) {
          clearInterval(checkInterval);
          reject(new Error('Batch not found'));
          return;
        }

        if (
          batch.status === 'completed' ||
          batch.status === 'failed' ||
          batch.status === 'cancelled'
        ) {
          clearInterval(checkInterval);
          resolve(batch);
          return;
        }

        // Check timeout
        if (Date.now() - startTime > timeout) {
          clearInterval(checkInterval);
          reject(new Error('Batch wait timeout'));
        }
      }, 500);
    });
  }

  /**
   * Get job statistics
   */
  getJobStatistics(): JobStatistics {
    const allJobs = this.queue.getJobs();

    const byStatus = {
      pending: 0,
      queued: 0,
      processing: 0,
      completed: 0,
      failed: 0,
      cancelled: 0,
      retrying: 0,
    };

    const byType: Partial<Record<JobType, number>> = {};
    const byPriority: Partial<Record<JobPriority, number>> = {};

    let totalProcessingTime = 0;
    let processedCount = 0;

    for (const job of allJobs) {
      // Count by status
      byStatus[job.status]++;

      // Count by type
      byType[job.type] = (byType[job.type] || 0) + 1;

      // Count by priority
      byPriority[job.priority] = (byPriority[job.priority] || 0) + 1;

      // Calculate processing time
      if (job.startedAt && job.completedAt) {
        totalProcessingTime += job.completedAt.getTime() - job.startedAt.getTime();
        processedCount++;
      }
    }

    const averageProcessingTime =
      processedCount > 0 ? totalProcessingTime / processedCount : 0;

    const successRate =
      byStatus.completed + byStatus.failed > 0
        ? byStatus.completed / (byStatus.completed + byStatus.failed)
        : 0;

    return {
      total: allJobs.length,
      pending: byStatus.pending,
      queued: byStatus.queued,
      processing: byStatus.processing,
      completed: byStatus.completed,
      failed: byStatus.failed,
      cancelled: byStatus.cancelled,
      retrying: byStatus.retrying,
      averageProcessingTime,
      successRate,
      byType,
      byPriority,
    };
  }

  /**
   * Get queue statistics
   */
  getQueueStatistics(): QueueStatistics {
    return this.queue.getStatistics();
  }

  /**
   * Get queue health
   */
  getQueueHealth(): QueueHealth {
    return this.queue.getHealth();
  }

  /**
   * Register custom processor
   */
  registerProcessor(type: JobType, processor: any): void {
    this.processor.registerProcessor(type, processor);
  }

  /**
   * Add event listener
   */
  on(eventType: JobEventType, listener: (event: JobEvent) => void): void {
    this.processor.on(eventType, listener);
  }

  /**
   * Remove event listener
   */
  off(eventType: JobEventType, listener: (event: JobEvent) => void): void {
    this.processor.off(eventType, listener);
  }

  /**
   * Clear completed jobs
   */
  clearCompleted(): number {
    return this.queue.clearCompleted();
  }

  /**
   * Cleanup old jobs
   */
  cleanupOldJobs(): number {
    const cutoffTime = Date.now() - this.config.maxJobAge;
    const oldJobs = this.queue
      .getJobs()
      .filter(
        (job) =>
          (job.status === 'completed' || job.status === 'failed') &&
          job.completedAt &&
          job.completedAt.getTime() < cutoffTime
      );

    for (const job of oldJobs) {
      this.queue.deleteJob(job.id);
    }

    return oldJobs.length;
  }

  /**
   * Retry failed job
   */
  retryJob(jobId: string): void {
    const job = this.queue.getJob(jobId);

    if (!job) {
      throw new Error(`Job not found: ${jobId}`);
    }

    if (job.status !== 'failed') {
      throw new Error(`Job is not failed: ${job.status}`);
    }

    // Reset job
    this.queue.updateJob(jobId, {
      status: 'queued',
      error: undefined,
      attempts: 0,
    });
  }

  /**
   * Bulk retry failed jobs
   */
  retryFailedJobs(filter?: JobFilterOptions): BulkOperationResult {
    const failedJobs = this.queue.getJobs({
      ...filter,
      status: 'failed',
    });

    const results: BulkOperationResult['results'] = [];

    for (const job of failedJobs) {
      try {
        this.retryJob(job.id);
        results.push({ jobId: job.id, success: true });
      } catch (error: unknown) {
        results.push({ jobId: job.id, success: false, error: error instanceof Error ? error.message : String(error) });
      }
    }

    return {
      total: failedJobs.length,
      successful: results.filter((r) => r.success).length,
      failed: results.filter((r) => !r.success).length,
      results,
    };
  }

  /**
   * Health check
   */
  async healthCheck(): Promise<{
    enabled: boolean;
    initialized: boolean;
    processing: boolean;
    queueHealth: QueueHealth;
  }> {
    return {
      enabled: this.config.enabled,
      initialized: this.initialized,
      processing: this.processor.isProcessing(),
      queueHealth: this.queue.getHealth(),
    };
  }

  /**
   * Shutdown service
   */
  async shutdown(): Promise<void> {
    logger.info('[Batch Service] Shutting down...');

    this.processor.stop();

    // Wait for processing jobs to complete (with timeout)
    const timeout = 30000;
    const startTime = Date.now();

    while (this.queue.getProcessingCount() > 0) {
      if (Date.now() - startTime > timeout) {
        logger.warn('[Batch Service] Shutdown timeout, some jobs may not have completed');
        break;
      }

      await new Promise((resolve) => setTimeout(resolve, 100));
    }

    this.initialized = false;
    logger.info('[Batch Service] Shutdown complete');
  }

  /**
   * Get configuration
   */
  getConfig(): BatchConfig {
    return { ...this.config };
  }

  /**
   * Update configuration
   */
  updateConfig(config: Partial<BatchConfig>): void {
    this.config = { ...this.config, ...config };

    // Update queue config if needed
    if (config.defaultConcurrency !== undefined) {
      this.queue.updateConfig({ concurrency: config.defaultConcurrency });
    }
  }

  /**
   * Check if enabled
   */
  isEnabled(): boolean {
    return this.config.enabled;
  }

  /**
   * Check if initialized
   */
  isInitialized(): boolean {
    return this.initialized;
  }
}
