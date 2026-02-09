// ============================================
// src/batch/types/index.ts
// Batch Processing Type Definitions
// ============================================

/**
 * Job status
 */
export type JobStatus =
  | 'pending'
  | 'queued'
  | 'processing'
  | 'completed'
  | 'failed'
  | 'cancelled'
  | 'retrying';

/**
 * Job priority
 */
export type JobPriority = 'low' | 'normal' | 'high' | 'critical';

/**
 * Job type
 */
export type JobType =
  | 'code_execution'
  | 'cost_calculation'
  | 'timeline_generation'
  | 'feasibility_check'
  | 'a2a_workflow'
  | 'context_compression'
  | 'bulk_analysis'
  | 'report_generation'
  | 'data_export'
  | 'custom';

// Export queue
export { JobQueue } from './queue/JobQueue';

// Export main service
export { BatchService } from './BatchService';
/**
 * Job definition
 */
export interface Job {
  id: string;
  type: JobType;
  status: JobStatus;
  priority: JobPriority;
  data: any;
  result?: any;
  error?: string;
  progress?: number; // 0-100
  attempts: number;
  maxAttempts: number;
  createdAt: Date;
  startedAt?: Date;
  completedAt?: Date;
  updatedAt: Date;
  userId: string;
  metadata?: Record<string, any>;
  dependencies?: string[]; // Job IDs that must complete first
  timeout?: number; // Milliseconds
  retryDelay?: number; // Milliseconds between retries
}

/**
 * Job creation options
 */
export interface CreateJobOptions {
  type: JobType;
  data: any;
  priority?: JobPriority;
  userId: string;
  maxAttempts?: number;
  timeout?: number;
  retryDelay?: number;
  dependencies?: string[];
  metadata?: Record<string, any>;
}

/**
 * Job update
 */
export interface JobUpdate {
  status?: JobStatus;
  progress?: number;
  result?: any;
  error?: string;
  attempts?: number;
  startedAt?: Date;
  completedAt?: Date;
}

/**
 * Job queue configuration
 */
export interface QueueConfig {
  name: string;
  concurrency: number; // Max concurrent jobs
  maxRetries: number;
  retryDelay: number; // Base delay in ms
  timeout: number; // Default timeout in ms
  priorityLevels: number; // Number of priority levels
  processingInterval: number; // How often to check for jobs (ms)
}

/**
 * Job processor function
 */
export type JobProcessor<T = any, R = any> = (
  job: Job,
  context: ProcessingContext
) => Promise<R>;

/**
 * Processing context
 */
export interface ProcessingContext {
  jobId: string;
  userId: string;
  updateProgress: (progress: number) => Promise<void>;
  log: (message: string, level?: 'info' | 'warn' | 'error') => void;
  isCancelled: () => boolean;
}

/**
 * Job filter options
 */
export interface JobFilterOptions {
  status?: JobStatus | JobStatus[];
  type?: JobType | JobType[];
  priority?: JobPriority | JobPriority[];
  userId?: string;
  createdAfter?: Date;
  createdBefore?: Date;
  limit?: number;
  offset?: number;
  sortBy?: 'createdAt' | 'priority' | 'updatedAt';
  sortOrder?: 'asc' | 'desc';
}

/**
 * Job statistics
 */
export interface JobStatistics {
  total: number;
  pending: number;
  queued: number;
  processing: number;
  completed: number;
  failed: number;
  cancelled: number;
  retrying: number;
  averageProcessingTime: number; // milliseconds
  successRate: number; // 0-1
  byType: Record<JobType, number>;
  byPriority: Record<JobPriority, number>;
}

/**
 * Queue statistics
 */
export interface QueueStatistics {
  name: string;
  size: number;
  processing: number;
  completed: number;
  failed: number;
  averageWaitTime: number; // milliseconds
  averageProcessingTime: number; // milliseconds
  throughput: number; // jobs per minute
}

/**
 * Batch job - Multiple jobs executed together
 */
export interface BatchJob {
  id: string;
  name: string;
  jobs: string[]; // Job IDs
  status: JobStatus;
  progress: number; // 0-100 (average of all jobs)
  completedJobs: number;
  totalJobs: number;
  createdAt: Date;
  completedAt?: Date;
  userId: string;
  metadata?: Record<string, any>;
}

/**
 * Batch creation options
 */
export interface CreateBatchOptions {
  name: string;
  jobs: CreateJobOptions[];
  userId: string;
  sequential?: boolean; // Execute jobs in order
  stopOnError?: boolean; // Stop batch if any job fails
  metadata?: Record<string, any>;
}

/**
 * Job event
 */
export type JobEventType =
  | 'job_created'
  | 'job_queued'
  | 'job_started'
  | 'job_progress'
  | 'job_completed'
  | 'job_failed'
  | 'job_cancelled'
  | 'job_retrying';

/**
 * Job event
 */
export interface JobEvent {
  type: JobEventType;
  jobId: string;
  timestamp: Date;
  data?: any;
}

/**
 * Job result with metadata
 */
export interface JobResult<T = any> {
  jobId: string;
  status: JobStatus;
  result?: T;
  error?: string;
  duration: number; // milliseconds
  attempts: number;
  createdAt: Date;
  completedAt?: Date;
}

/**
 * Scheduled job configuration
 */
export interface ScheduledJobConfig {
  id: string;
  name: string;
  type: JobType;
  data: any;
  schedule: string; // Cron expression
  priority?: JobPriority;
  enabled: boolean;
  userId: string;
  lastRun?: Date;
  nextRun?: Date;
  metadata?: Record<string, any>;
}

/**
 * Job retry strategy
 */
export interface RetryStrategy {
  type: 'fixed' | 'exponential' | 'linear';
  baseDelay: number; // milliseconds
  maxDelay: number; // milliseconds
  multiplier?: number; // For exponential
  maxAttempts: number;
}

/**
 * Job dependencies result
 */
export interface DependencyResult {
  satisfied: boolean;
  pending: string[]; // Job IDs still pending
  failed: string[]; // Job IDs that failed
}

/**
 * Bulk operation result
 */
export interface BulkOperationResult {
  total: number;
  successful: number;
  failed: number;
  results: Array<{
    jobId: string;
    success: boolean;
    error?: string;
  }>;
}

/**
 * Queue health status
 */
export interface QueueHealth {
  healthy: boolean;
  queueSize: number;
  processingCount: number;
  errorRate: number; // 0-1
  averageLatency: number; // milliseconds
  oldestPendingJob?: Date;
  issues: string[];
}

/**
 * Job execution options
 */
export interface ExecutionOptions {
  timeout?: number;
  retryStrategy?: RetryStrategy;
  onProgress?: (progress: number) => void;
  onStatusChange?: (status: JobStatus) => void;
  signal?: AbortSignal; // For cancellation
}

/**
 * Batch processing configuration
 */
export interface BatchConfig {
  enabled: boolean;
  defaultConcurrency: number;
  defaultMaxRetries: number;
  defaultTimeout: number;
  defaultRetryDelay: number;
  maxJobAge: number; // Auto-cleanup after X milliseconds
  enableScheduledJobs: boolean;
  enableMetrics: boolean;
  storageType: 'memory' | 'redis' | 'database';
  redisUrl?: string;
}

/**
 * Job processor registry entry
 */
export interface ProcessorRegistryEntry {
  type: JobType;
 defaultTimeout?: number;
  defaultMaxAttempts?: number;
}

/**
 * Job webhook configuration
 */
export interface WebhookConfig {
  url: string;
  events: JobEventType[];
  secret?: string;
  enabled: boolean;
}

/**
 * Job notification
 */
export interface JobNotification {
  jobId: string;
  type: JobEventType;
  message: string;
  timestamp: Date;
  userId: string;
  metadata?: Record<string, any>;
}
