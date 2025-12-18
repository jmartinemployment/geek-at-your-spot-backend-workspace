// ============================================
// src/extended-context/ExtendedContextService.ts
// Extended Context Service - Main orchestrator for context management
// ============================================

import { ContextWindowManager } from './manager/ContextWindowManager';
import { ContextCompressor } from './compression/ContextCompressor';
import { TokenCounter } from './utils/TokenCounter';
import {
  ExtendedContextConfig,
  ContextWindow,
  ContextMessage,
  CompressionStrategy,
  ContextSnapshot,
  OptimizationResult,
  ContextManagerStats,
  SummarizationRequest,
  SummarizationResult,
  MessageRetrievalOptions,
  ContextSplitOptions,
  ConversationChunk,
} from './types';

export class ExtendedContextService {
  private config: ExtendedContextConfig;
  private windowManager: ContextWindowManager;
  private compressor: ContextCompressor;
  private initialized: boolean = false;

  // Statistics
  private stats = {
    totalConversations: 0,
    totalMessages: 0,
    totalCompressions: 0,
    totalTokensSaved: 0,
  };

  constructor(config: Partial<ExtendedContextConfig>) {
    this.config = {
      enabled: config.enabled ?? true,
      defaultMaxTokens: config.defaultMaxTokens || 180000,
      warningThreshold: config.warningThreshold || 0.8,
      autoCompression: config.autoCompression ?? true,
      defaultStrategy: config.defaultStrategy || 'hybrid',
      enableSnapshots: config.enableSnapshots ?? true,
      snapshotInterval: config.snapshotInterval || 10,
      maxSnapshots: config.maxSnapshots || 5,
      anthropicApiKey: config.anthropicApiKey || '',
      model: config.model || 'claude-sonnet-4-20250514',
    };

    if (!this.config.anthropicApiKey) {
      throw new Error('Anthropic API key is required for Extended Context Service');
    }

    // Initialize components
    this.windowManager = new ContextWindowManager(this.config.anthropicApiKey, {
      maxTokens: this.config.defaultMaxTokens,
      warningThreshold: this.config.warningThreshold,
      autoCompress: this.config.autoCompression,
      compressionStrategy: this.config.defaultStrategy,
      preserveSystemMessages: true,
      enableImportanceScoring: true,
    });

    this.compressor = new ContextCompressor(
      this.config.anthropicApiKey,
      this.config.model
    );
  }

  /**
   * Initialize service
   */
  async initialize(): Promise<void> {
    if (this.initialized) {
      return;
    }

    this.initialized = true;
    console.log('[Extended Context] Service initialized');
  }

  /**
   * Add message to conversation
   */
  async addMessage(
    conversationId: string,
    role: 'user' | 'assistant' | 'system',
    content: string,
    metadata?: Record<string, any>
  ): Promise<ContextMessage> {
    if (!this.config.enabled) {
      throw new Error('Extended Context Service is disabled');
    }

    if (!this.initialized) {
      await this.initialize();
    }

    // Track if this is a new conversation
    const isNew = !this.windowManager.hasWindow(conversationId);

    const message = await this.windowManager.addMessage(
      conversationId,
      role,
      content,
      metadata
    );

    if (isNew) {
      this.stats.totalConversations++;
    }

    this.stats.totalMessages++;

    // Auto-snapshot if enabled
    if (this.config.enableSnapshots) {
      const window = this.windowManager.getWindow(conversationId);
      if (window && window.messages.length % this.config.snapshotInterval === 0) {
        await this.windowManager.createSnapshot(
          conversationId,
          `Auto-snapshot at ${window.messages.length} messages`
        );
      }
    }

    return message;
  }

  /**
   * Get messages from conversation
   */
  getMessages(
    conversationId: string,
    options?: MessageRetrievalOptions
  ): ContextMessage[] {
    return this.windowManager.getMessages(conversationId, options);
  }

  /**
   * Get context window
   */
  getWindow(conversationId: string): ContextWindow | undefined {
    return this.windowManager.getWindow(conversationId);
  }

  /**
   * Get window statistics
   */
  getWindowStats(conversationId: string) {
    return this.windowManager.getWindowStats(conversationId);
  }

  /**
   * Compress conversation manually
   */
  async compress(
    conversationId: string,
    strategy?: CompressionStrategy
  ): Promise<OptimizationResult> {
    if (strategy) {
      this.windowManager.updateStrategy(conversationId, strategy);
    }

    const result = await this.windowManager.compressWindow(conversationId);
    this.stats.totalCompressions++;
    this.stats.totalTokensSaved += result.tokensSaved;

    return result;
  }

  /**
   * Create snapshot
   */
  async createSnapshot(
    conversationId: string,
    description?: string
  ): Promise<ContextSnapshot> {
    return this.windowManager.createSnapshot(conversationId, description);
  }

  /**
   * Restore from snapshot
   */
  async restoreSnapshot(
    conversationId: string,
    snapshotId: string
  ): Promise<void> {
    await this.windowManager.restoreFromSnapshot(conversationId, snapshotId);
  }

  /**
   * Get snapshots
   */
  getSnapshots(conversationId: string): ContextSnapshot[] {
    return this.windowManager.getSnapshots(conversationId);
  }

  /**
   * Summarize conversation
   */
  async summarize(request: SummarizationRequest): Promise<SummarizationResult> {
    const messages = request.messages || this.getMessages(request.conversationId);

    if (messages.length === 0) {
      throw new Error('No messages to summarize');
    }

    // Use compressor's summarization
    const result = await (this.compressor as any).summarizeMessages(messages);

    return result;
  }

  /**
   * Split conversation into chunks
   */
  splitIntoChunks(
    conversationId: string,
    options: ContextSplitOptions
  ): ConversationChunk[] {
    const messages = this.getMessages(conversationId);
    const chunks: ConversationChunk[] = [];

    let currentChunk: ContextMessage[] = [];
    let currentTokens = 0;
    let chunkIndex = 0;
    let startMessageIndex = 0;

    for (let i = 0; i < messages.length; i++) {
      const message = messages[i];
      const messageTokens = message.tokenCount;

      // Check if adding this message would exceed chunk size
      if (
        currentTokens + messageTokens > options.chunkSize &&
        currentChunk.length > 0
      ) {
        // Save current chunk
        const content = currentChunk.map((msg) => msg.content).join('\n\n');

        chunks.push({
          id: `${conversationId}-chunk-${chunkIndex}`,
          conversationId,
          chunkIndex,
          startMessageIndex,
          endMessageIndex: i - 1,
          content,
          tokenCount: currentTokens,
          timestamp: new Date(),
        });

        // Start new chunk with overlap
        if (options.overlapSize > 0) {
          const overlapMessages = this.getOverlapMessages(
            currentChunk,
            options.overlapSize
          );
          currentChunk = overlapMessages;
          currentTokens = overlapMessages.reduce(
            (sum, msg) => sum + msg.tokenCount,
            0
          );
        } else {
          currentChunk = [];
          currentTokens = 0;
        }

        chunkIndex++;
        startMessageIndex = i;
      }

      currentChunk.push(message);
      currentTokens += messageTokens;
    }

    // Add final chunk
    if (currentChunk.length > 0) {
      const content = currentChunk.map((msg) => msg.content).join('\n\n');

      chunks.push({
        id: `${conversationId}-chunk-${chunkIndex}`,
        conversationId,
        chunkIndex,
        startMessageIndex,
        endMessageIndex: messages.length - 1,
        content,
        tokenCount: currentTokens,
        timestamp: new Date(),
      });
    }

    return chunks;
  }

  /**
   * Get overlap messages for chunking
   */
  private getOverlapMessages(
    messages: ContextMessage[],
    overlapTokens: number
  ): ContextMessage[] {
    const overlap: ContextMessage[] = [];
    let tokens = 0;

    // Start from the end and work backwards
    for (let i = messages.length - 1; i >= 0; i--) {
      const message = messages[i];

      if (tokens + message.tokenCount <= overlapTokens) {
        overlap.unshift(message);
        tokens += message.tokenCount;
      } else {
        break;
      }
    }

    return overlap;
  }

  /**
   * Count tokens in text
   */
  countTokens(text: string): number {
    return TokenCounter.countTokens(text);
  }

  /**
   * Estimate conversation tokens
   */
  estimateTokens(params: {
    systemPrompt?: string;
    messages: Array<{ role: string; content: string }>;
    tools?: any[];
    maxResponseTokens?: number;
  }) {
    return TokenCounter.estimateConversationTokens(params);
  }

  /**
   * Check if conversation needs compression
   */
  needsCompression(conversationId: string): boolean {
    const stats = this.getWindowStats(conversationId);

    if (!stats) {
      return false;
    }

    return stats.usagePercent >= this.config.warningThreshold * 100;
  }

  /**
   * Get service statistics
   */
  getStats(): ContextManagerStats & typeof this.stats {
    const windows = this.windowManager.getAllWindows();

    const totalTokens = windows.reduce((sum, w) => sum + w.totalTokens, 0);
    const averageTokens =
      windows.length > 0 ? totalTokens / windows.length : 0;

    const largestConversation = windows.reduce(
      (max, w) => Math.max(max, w.totalTokens),
      0
    );

    const oldestConversation = windows.reduce((oldest, w) => {
      return !oldest || w.lastUpdated < oldest ? w.lastUpdated : oldest;
    }, null as Date | null);

    return {
      totalConversations: this.stats.totalConversations,
      averageTokensPerConversation: averageTokens,
      compressionsPerformed: this.stats.totalCompressions,
      averageCompressionRatio:
        this.stats.totalCompressions > 0
          ? this.stats.totalTokensSaved /
            (this.stats.totalCompressions * this.config.defaultMaxTokens)
          : 0,
      largestConversation,
      oldestConversation: oldestConversation || new Date(),
      ...this.stats,
    };
  }

  /**
   * Health check
   */
  async healthCheck(): Promise<{
    enabled: boolean;
    initialized: boolean;
    activeWindows: number;
    averageUsage: number;
  }> {
    const windows = this.windowManager.getAllWindows();
    const totalUsage = windows.reduce((sum, w) => {
      return sum + (w.totalTokens / w.maxTokens) * 100;
    }, 0);

    return {
      enabled: this.config.enabled,
      initialized: this.initialized,
      activeWindows: windows.length,
      averageUsage: windows.length > 0 ? totalUsage / windows.length : 0,
    };
  }

  /**
   * Clear conversation
   */
  clearConversation(conversationId: string): void {
    this.windowManager.clearWindow(conversationId);
  }

  /**
   * Update configuration
   */
  updateConfig(config: Partial<ExtendedContextConfig>): void {
    this.config = { ...this.config, ...config };

    // Update window manager config
    this.windowManager.updateConfig({
      maxTokens: config.defaultMaxTokens || this.config.defaultMaxTokens,
      warningThreshold: config.warningThreshold || this.config.warningThreshold,
      autoCompress: config.autoCompression ?? this.config.autoCompression,
      compressionStrategy: config.defaultStrategy || this.config.defaultStrategy,
    });
  }

  /**
   * Get configuration
   */
  getConfig(): ExtendedContextConfig {
    return { ...this.config };
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

  /**
   * Get events for conversation
   */
  getEvents(conversationId: string) {
    return this.windowManager.getEvents(conversationId);
  }

  /**
   * Update compression strategy
   */
  updateStrategy(
    conversationId: string,
    strategy: CompressionStrategy
  ): void {
    this.windowManager.updateStrategy(conversationId, strategy);
  }
}
