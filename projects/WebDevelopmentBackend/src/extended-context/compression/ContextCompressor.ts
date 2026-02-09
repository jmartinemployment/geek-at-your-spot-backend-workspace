// ============================================
// src/extended-context/compression/ContextCompressor.ts
// Context Compressor - Compress conversations using multiple strategies
// ============================================

import Anthropic from '@anthropic-ai/sdk';
import { TokenCounter } from '../utils/TokenCounter';
import {
  ContextMessage,
  CompressionOptions,
  CompressionResult,
  SummarizationResult,
  HierarchicalSummaryNode,
} from '../types';

export class ContextCompressor {
  private readonly client: Anthropic;
  private readonly model: string;

  constructor(anthropicApiKey: string, model?: string) {
    this.client = new Anthropic({ apiKey: anthropicApiKey });
    this.model = model || 'claude-sonnet-4-20250514';
  }

  /**
   * Compress messages using specified strategy
   */
  async compress(
    messages: ContextMessage[],
    options: CompressionOptions
  ): Promise<CompressionResult> {
    const originalTokens = messages.reduce((sum, msg) => sum + msg.tokenCount, 0);

    try {
      let result: CompressionResult;

      switch (options.strategy) {
        case 'truncate':
          result = await this.compressByTruncation(messages, options);
          break;

        case 'summarize':
          result = await this.compressBySummarization(messages, options);
          break;

        case 'hierarchical':
          result = await this.compressByHierarchical(messages, options);
          break;

        case 'importance':
          result = await this.compressByImportance(messages, options);
          break;

        case 'hybrid':
          result = await this.compressByHybrid(messages, options);
          break;

        default:
          throw new Error(`Unknown compression strategy: ${options.strategy}`);
      }

      return result;
    } catch (error: unknown) {
      return {
        success: false,
        originalTokens,
        compressedTokens: originalTokens,
        compressionRatio: 0,
        strategy: options.strategy,
        messagesRemoved: 0,
        messagesPreserved: messages.length,
        error: error instanceof Error ? error.message : String(error),
      };
    }
  }

  /**
   * Truncate strategy - Remove oldest messages
   */
  private async compressByTruncation(
    messages: ContextMessage[],
    options: CompressionOptions
  ): Promise<CompressionResult> {
    const originalTokens = messages.reduce((sum, msg) => sum + msg.tokenCount, 0);
    const preserveRecent = options.preserveRecent || 10;

    // Keep recent messages
    const preservedMessages = messages.slice(-preserveRecent);
    let currentTokens = preservedMessages.reduce((sum, msg) => sum + msg.tokenCount, 0);

    // Add older messages if we have room
    const finalMessages = [...preservedMessages];
    for (let i = messages.length - preserveRecent - 1; i >= 0; i--) {
      if (currentTokens + messages[i].tokenCount <= options.targetTokens) {
        finalMessages.unshift(messages[i]);
        currentTokens += messages[i].tokenCount;
      } else {
        break;
      }
    }

    return {
      success: true,
      originalTokens,
      compressedTokens: currentTokens,
      compressionRatio: 1 - currentTokens / originalTokens,
      strategy: 'truncate',
      messagesRemoved: messages.length - finalMessages.length,
      messagesPreserved: finalMessages.length,
    };
  }

  /**
   * Summarize strategy - Summarize old messages
   */
  private async compressBySummarization(
    messages: ContextMessage[],
    options: CompressionOptions
  ): Promise<CompressionResult> {
    const originalTokens = messages.reduce((sum, msg) => sum + msg.tokenCount, 0);
    const preserveRecent = options.preserveRecent || 5;

    // Split messages
    const oldMessages = messages.slice(0, -preserveRecent);
    const recentMessages = messages.slice(-preserveRecent);

    if (oldMessages.length === 0) {
      return {
        success: true,
        originalTokens,
        compressedTokens: originalTokens,
        compressionRatio: 0,
        strategy: 'summarize',
        messagesRemoved: 0,
        messagesPreserved: messages.length,
      };
    }

    // Summarize old messages
    const summaryResult = await this.summarizeMessages(oldMessages);

    const recentTokens = recentMessages.reduce((sum, msg) => sum + msg.tokenCount, 0);
    const compressedTokens = summaryResult.tokenCount + recentTokens;

    return {
      success: true,
      originalTokens,
      compressedTokens,
      compressionRatio: 1 - compressedTokens / originalTokens,
      strategy: 'summarize',
      messagesRemoved: oldMessages.length,
      messagesPreserved: recentMessages.length,
      summary: summaryResult.summary,
    };
  }

  /**
   * Hierarchical strategy - Multi-level summaries
   */
  private async compressByHierarchical(
    messages: ContextMessage[],
    options: CompressionOptions
  ): Promise<CompressionResult> {
    const originalTokens = messages.reduce((sum, msg) => sum + msg.tokenCount, 0);

    // Build hierarchical summary tree
    const tree = await this.buildHierarchicalSummary(messages, options.targetTokens);

    // Calculate compressed tokens (sum of all summary tokens)
    const compressedTokens = this.calculateTreeTokens(tree);

    return {
      success: true,
      originalTokens,
      compressedTokens,
      compressionRatio: 1 - compressedTokens / originalTokens,
      strategy: 'hierarchical',
      messagesRemoved: messages.length,
      messagesPreserved: 0,
      summary: tree.summary,
    };
  }

  /**
   * Importance strategy - Keep important messages
   */
  private async compressByImportance(
    messages: ContextMessage[],
    options: CompressionOptions
  ): Promise<CompressionResult> {
    const originalTokens = messages.reduce((sum, msg) => sum + msg.tokenCount, 0);

    // Score all messages by importance
    const scoredMessages = messages.map((msg, index) => ({
      message: msg,
      importance: this.calculateImportance(msg, index, messages),
    }));

    // Sort by importance (descending)
    scoredMessages.sort((a, b) => b.importance - a.importance);

    // Keep messages until we hit target
    const preservedMessages: ContextMessage[] = [];
    let currentTokens = 0;
    const minImportance = options.minImportance || 0;

    for (const scored of scoredMessages) {
      if (
        scored.importance >= minImportance &&
        currentTokens + scored.message.tokenCount <= options.targetTokens
      ) {
        preservedMessages.push(scored.message);
        currentTokens += scored.message.tokenCount;
      }
    }

    // Sort preserved messages back to chronological order
    preservedMessages.sort((a, b) => a.timestamp.getTime() - b.timestamp.getTime());

    return {
      success: true,
      originalTokens,
      compressedTokens: currentTokens,
      compressionRatio: 1 - currentTokens / originalTokens,
      strategy: 'importance',
      messagesRemoved: messages.length - preservedMessages.length,
      messagesPreserved: preservedMessages.length,
    };
  }

  /**
   * Hybrid strategy - Combine multiple strategies
   */
  private async compressByHybrid(
    messages: ContextMessage[],
    options: CompressionOptions
  ): Promise<CompressionResult> {
    // First, use importance to filter messages
    const importanceResult = await this.compressByImportance(messages, {
      ...options,
      targetTokens: options.targetTokens * 1.5, // Leave room for summary
      minImportance: options.minImportance || 0.3,
    });

    // If still over target, summarize old messages
    if (importanceResult.compressedTokens > options.targetTokens) {
      const preserveRecent = options.preserveRecent || 5;
      const importantMessages = messages.filter(
        (msg) => this.calculateImportance(msg, 0, messages) >= (options.minImportance || 0.3)
      );

      const recentMessages = importantMessages.slice(-preserveRecent);
      const oldMessages = importantMessages.slice(0, -preserveRecent);

      if (oldMessages.length > 0) {
        const summaryResult = await this.summarizeMessages(oldMessages);
        const recentTokens = recentMessages.reduce((sum, msg) => sum + msg.tokenCount, 0);
        const compressedTokens = summaryResult.tokenCount + recentTokens;

        return {
          success: true,
          originalTokens: importanceResult.originalTokens,
          compressedTokens,
          compressionRatio: 1 - compressedTokens / importanceResult.originalTokens,
          strategy: 'hybrid',
          messagesRemoved: messages.length - recentMessages.length,
          messagesPreserved: recentMessages.length,
          summary: summaryResult.summary,
        };
      }
    }

    return {
      ...importanceResult,
      strategy: 'hybrid',
    };
  }

  /**
   * Calculate message importance
   */
  private calculateImportance(
    message: ContextMessage,
    index: number,
    allMessages: ContextMessage[]
  ): number {
    let score = 0;

    // Recency (newer = more important)
    const recencyScore = index / allMessages.length;
    score += recencyScore * 0.3;

    // User messages slightly more important
    if (message.role === 'user') {
      score += 0.1;
    }

    // Longer messages might be more important
    const avgLength = allMessages.reduce((sum, msg) => sum + msg.content.length, 0) / allMessages.length;
    if (message.content.length > avgLength) {
      score += 0.1;
    }

    // Keywords that indicate importance
    const importantKeywords = [
      'important',
      'critical',
      'must',
      'required',
      'decision',
      'action',
      'todo',
      'deadline',
      'urgent',
    ];

    const content = message.content.toLowerCase();
    for (const keyword of importantKeywords) {
      if (content.includes(keyword)) {
        score += 0.1;
      }
    }

    // Code blocks often important
    if (message.content.includes('```')) {
      score += 0.15;
    }

    // Questions often important
    if (message.content.includes('?')) {
      score += 0.05;
    }

    // Use explicit importance if provided
    if (message.importance !== undefined) {
      score = score * 0.5 + message.importance * 0.5;
    }

    return Math.min(1, score);
  }

  /**
   * Summarize messages using Claude
   */
  private async summarizeMessages(messages: ContextMessage[]): Promise<SummarizationResult> {
    const conversationText = messages
      .map((msg) => `${msg.role}: ${msg.content}`)
      .join('\n\n');

    const prompt = `Please provide a concise summary of the following conversation. Focus on:
1. Key points and main topics discussed
2. Important decisions made
3. Action items or next steps

Conversation:
${conversationText}

Provide a summary in 2-3 paragraphs.`;

    const response = await this.client.messages.create({
      model: this.model,
      max_tokens: 1024,
      messages: [{ role: 'user', content: prompt }],
    });

    const summary = response.content
      .filter((block): block is Anthropic.TextBlock => block.type === 'text')
      .map((block) => block.text)
      .join('\n');

    const originalTokenCount = messages.reduce((sum, msg) => sum + msg.tokenCount, 0);

    return {
      summary,
      keyPoints: this.extractKeyPoints(summary),
      decisions: this.extractDecisions(conversationText),
      actionItems: this.extractActionItems(conversationText),
      tokenCount: TokenCounter.countTokens(summary),
      originalTokenCount,
    };
  }

  /**
   * Build hierarchical summary tree
   */
  private async buildHierarchicalSummary(
    messages: ContextMessage[],
    _targetTokens: number
  ): Promise<HierarchicalSummaryNode> {
    const chunkSize = 10; // Messages per chunk

    // Level 0: Group messages into chunks
    const chunks: ContextMessage[][] = [];
    for (let i = 0; i < messages.length; i += chunkSize) {
      chunks.push(messages.slice(i, i + chunkSize));
    }

    // Level 1: Summarize each chunk
    const level1Summaries: HierarchicalSummaryNode[] = [];
    for (let i = 0; i < chunks.length; i++) {
      const chunk = chunks[i];
      const summaryResult = await this.summarizeMessages(chunk);

      level1Summaries.push({
        level: 1,
        summary: summaryResult.summary,
        tokenCount: summaryResult.tokenCount,
        messageRange: {
          start: i * chunkSize,
          end: Math.min((i + 1) * chunkSize, messages.length) - 1,
        },
      });
    }

    // Level 2: Summarize level 1 summaries
    const level2Summary = level1Summaries.map((node) => node.summary).join('\n\n');
    const finalSummaryResult = await this.summarizeMessages([
      {
        id: 'summary',
        role: 'assistant',
        content: level2Summary,
        tokenCount: TokenCounter.countTokens(level2Summary),
        timestamp: new Date(),
      },
    ]);

    return {
      level: 2,
      summary: finalSummaryResult.summary,
      tokenCount: finalSummaryResult.tokenCount,
      messageRange: { start: 0, end: messages.length - 1 },
      children: level1Summaries,
    };
  }

  /**
   * Calculate total tokens in hierarchical tree
   */
  private calculateTreeTokens(node: HierarchicalSummaryNode): number {
    let total = node.tokenCount;

    if (node.children) {
      for (const child of node.children) {
        total += this.calculateTreeTokens(child);
      }
    }

    return total;
  }

  /**
   * Extract key points from text
   */
  private extractKeyPoints(text: string): string[] {
    const lines = text.split('\n');
    const keyPoints: string[] = [];

    for (const line of lines) {
      const trimmed = line.trim();
      if ((/^[-•*]\s+/.exec(trimmed)) || (/^\d+\.\s+/.exec(trimmed))) {
        keyPoints.push(trimmed.replaceAll(/^[-•*]\s+/g, '').replaceAll(/^\d+\.\s+/g, ''));
      }
    }

    return keyPoints.slice(0, 5); // Top 5 key points
  }

  /**
   * Extract decisions from conversation
   */
  private extractDecisions(text: string): string[] {
    const decisions: string[] = [];
    const lines = text.split('\n');

    for (const line of lines) {
      const lower = line.toLowerCase();
      if (
        lower.includes('decided') ||
        lower.includes('decision') ||
        lower.includes('agreed') ||
        lower.includes('concluded')
      ) {
        decisions.push(line.trim());
      }
    }

    return decisions.slice(0, 3); // Top 3 decisions
  }

  /**
   * Extract action items from conversation
   */
  private extractActionItems(text: string): string[] {
    const actionItems: string[] = [];
    const lines = text.split('\n');

    for (const line of lines) {
      const lower = line.toLowerCase();
      if (
        lower.includes('todo') ||
        lower.includes('action item') ||
        lower.includes('next step') ||
        lower.includes('will do') ||
        lower.includes('should')
      ) {
        actionItems.push(line.trim());
      }
    }

    return actionItems.slice(0, 5); // Top 5 action items
  }
}
