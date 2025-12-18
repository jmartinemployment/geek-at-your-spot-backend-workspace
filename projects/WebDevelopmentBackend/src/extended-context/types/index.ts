// ============================================
// src/extended-context/types/index.ts
// Extended Context Management Type Definitions
// ============================================

/**
 * Conversation chunk for splitting long conversations
 */
export interface ConversationChunk {
  id: string;
  conversationId: string;
  chunkIndex: number;
  startMessageIndex: number;
  endMessageIndex: number;
  content: string;
  tokenCount: number;
  summary?: string;
  timestamp: Date;
}

/**
 * Conversation summary
 */
export interface ConversationSummary {
  conversationId: string;
  type: 'progressive' | 'complete' | 'hierarchical';
  summary: string;
  keyPoints: string[];
  decisions: string[];
  actionItems: string[];
  participants: string[];
  tokenCount: number;
  originalTokenCount: number;
  compressionRatio: number;
  createdAt: Date;
  updatedAt: Date;
}

/**
 * Context window
 */
export interface ContextWindow {
  id: string;
  conversationId: string;
  messages: ContextMessage[];
  totalTokens: number;
  maxTokens: number;
  summary?: ConversationSummary;
  strategy: CompressionStrategy;
  lastUpdated: Date;
}

/**
 * Context message
 */
export interface ContextMessage {
  id: string;
  role: 'user' | 'assistant' | 'system';
  content: string;
  tokenCount: number;
  timestamp: Date;
  metadata?: Record<string, any>;
  importance?: number; // 0-1 scale
  compressed?: boolean;
}

/**
 * Compression strategy
 */
export type CompressionStrategy =
  | 'truncate' // Remove oldest messages
  | 'summarize' // Summarize old messages
  | 'hierarchical' // Multi-level summaries
  | 'importance' // Keep important messages
  | 'hybrid'; // Combine strategies

/**
 * Context compression options
 */
export interface CompressionOptions {
  strategy: CompressionStrategy;
  targetTokens: number;
  preserveRecent?: number; // Number of recent messages to preserve
  preserveSystem?: boolean; // Keep system messages
  minImportance?: number; // Minimum importance to preserve (0-1)
  summaryRatio?: number; // Target summary/original ratio (0-1)
}

/**
 * Compression result
 */
export interface CompressionResult {
  success: boolean;
  originalTokens: number;
  compressedTokens: number;
  compressionRatio: number;
  strategy: CompressionStrategy;
  messagesRemoved: number;
  messagesPreserved: number;
  summary?: string;
  error?: string;
}

/**
 * Token counting options
 */
export interface TokenCountOptions {
  model?: string;
  encoding?: string;
}

/**
 * Message importance factors
 */
export interface ImportanceFactors {
  recency: number; // 0-1 (recent = higher)
  userMessage: number; // 0-1 (user messages often more important)
  length: number; // 0-1 (longer = potentially more important)
  keywords: string[]; // Important keywords boost importance
  containsCode: boolean; // Code blocks often important
  containsDecision: boolean; // Decisions important
  containsQuestion: boolean; // Questions important
  referencedByLater: boolean; // Referenced later = important
}

/**
 * Context window config
 */
export interface ContextWindowConfig {
  maxTokens: number;
  warningThreshold: number; // Percentage (e.g., 0.8 for 80%)
  autoCompress: boolean;
  compressionStrategy: CompressionStrategy;
  preserveSystemMessages: boolean;
  enableImportanceScoring: boolean;
}

/**
 * Context manager statistics
 */
export interface ContextManagerStats {
  totalConversations: number;
  averageTokensPerConversation: number;
  compressionsPerformed: number;
  averageCompressionRatio: number;
  largestConversation: number;
  oldestConversation: Date;
}

/**
 * Summarization request
 */
export interface SummarizationRequest {
  conversationId: string;
  messages: ContextMessage[];
  targetLength?: number; // Target summary length in tokens
  focusAreas?: string[]; // Areas to focus on
  includeDecisions?: boolean;
  includeActionItems?: boolean;
}

/**
 * Summarization result
 */
export interface SummarizationResult {
  summary: string;
  keyPoints: string[];
  decisions: string[];
  actionItems: string[];
  tokenCount: number;
  originalTokenCount: number;
}

/**
 * Context snapshot (for rollback)
 */
export interface ContextSnapshot {
  id: string;
  conversationId: string;
  timestamp: Date;
  window: ContextWindow;
  description?: string;
}

/**
 * Message retrieval options
 */
export interface MessageRetrievalOptions {
  conversationId: string;
  startIndex?: number;
  endIndex?: number;
  limit?: number;
  includeCompressed?: boolean;
  minImportance?: number;
}

/**
 * Context merge options
 */
export interface ContextMergeOptions {
  conversationIds: string[];
  strategy: 'chronological' | 'importance' | 'interleaved';
  targetTokens?: number;
  preserveOrder?: boolean;
}

/**
 * Context split options
 */
export interface ContextSplitOptions {
  conversationId: string;
  chunkSize: number; // Tokens per chunk
  overlapSize: number; // Overlap between chunks
  preserveMessageBoundaries?: boolean;
}

/**
 * Token budget allocation
 */
export interface TokenBudget {
  total: number;
  system: number;
  history: number;
  current: number;
  response: number;
  buffer: number;
}

/**
 * Context optimization result
 */
export interface OptimizationResult {
  optimized: boolean;
  originalTokens: number;
  optimizedTokens: number;
  tokensSaved: number;
  changes: Array<{
    type: 'removed' | 'compressed' | 'summarized';
    messageId: string;
    tokensSaved: number;
  }>;
}

/**
 * Hierarchical summary node
 */
export interface HierarchicalSummaryNode {
  level: number;
  summary: string;
  tokenCount: number;
  messageRange: { start: number; end: number };
  children?: HierarchicalSummaryNode[];
}

/**
 * Context window event
 */
export type ContextWindowEvent =
  | 'message_added'
  | 'message_removed'
  | 'compressed'
  | 'summarized'
  | 'threshold_warning'
  | 'threshold_exceeded'
  | 'snapshot_created'
  | 'rollback_performed';

/**
 * Context event
 */
export interface ContextEvent {
  type: ContextWindowEvent;
  conversationId: string;
  timestamp: Date;
  data?: any;
}

/**
 * Extended context configuration
 */
export interface ExtendedContextConfig {
  enabled: boolean;
  defaultMaxTokens: number;
  warningThreshold: number;
  autoCompression: boolean;
  defaultStrategy: CompressionStrategy;
  enableSnapshots: boolean;
  snapshotInterval: number; // Messages between snapshots
  maxSnapshots: number;
  anthropicApiKey: string;
  model: string;
}
