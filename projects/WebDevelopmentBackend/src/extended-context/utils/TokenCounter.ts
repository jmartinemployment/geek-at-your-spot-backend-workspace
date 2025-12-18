// ============================================
// src/extended-context/utils/TokenCounter.ts
// Token Counter - Accurate token counting for context management
// ============================================

import { TokenCountOptions } from '../types';

export class TokenCounter {
  // Approximate tokens per character ratios for different content types
  private static readonly RATIOS = {
    text: 0.25, // ~4 characters per token
    code: 0.33, // ~3 characters per token (code is more token-dense)
    json: 0.28, // ~3.5 characters per token
  };

  /**
   * Count tokens in text (approximate)
   * Uses character-based estimation since we don't have tiktoken in Node.js
   */
  static countTokens(text: string, options?: TokenCountOptions): number {
    if (!text || text.length === 0) {
      return 0;
    }

    // Detect content type
    const contentType = this.detectContentType(text);

    // Base calculation
    let tokens = Math.ceil(text.length * this.RATIOS[contentType]);

    // Adjust for special patterns
    tokens += this.countSpecialTokens(text);

    return tokens;
  }

  /**
   * Count tokens in multiple messages
   */
  static countMessagesTokens(messages: Array<{ role: string; content: string }>): number {
    let total = 0;

    for (const message of messages) {
      // Count content tokens
      total += this.countTokens(message.content);

      // Add overhead for message structure (role, separators, etc.)
      total += 4; // Approximate overhead per message
    }

    return total;
  }

  /**
   * Detect content type for better token estimation
   */
  private static detectContentType(text: string): 'text' | 'code' | 'json' {
    // Check for JSON
    if (text.trim().startsWith('{') || text.trim().startsWith('[')) {
      try {
        JSON.parse(text);
        return 'json';
      } catch {
        // Not valid JSON
      }
    }

    // Check for code blocks
    if (text.includes('```') || text.includes('function') || text.includes('class ')) {
      return 'code';
    }

    // Check for code-like patterns
    const codePatterns = [
      /\bif\s*\(/,
      /\bfor\s*\(/,
      /\bwhile\s*\(/,
      /\bconst\s+\w+\s*=/,
      /\blet\s+\w+\s*=/,
      /\bvar\s+\w+\s*=/,
      /\bdef\s+\w+\(/,
      /\bclass\s+\w+/,
      /\bimport\s+/,
      /\bfrom\s+.*\bimport/,
    ];

    for (const pattern of codePatterns) {
      if (pattern.test(text)) {
        return 'code';
      }
    }

    return 'text';
  }

  /**
   * Count special tokens (emojis, special characters, etc.)
   */
  private static countSpecialTokens(text: string): number {
    let extraTokens = 0;

    // Count emojis (each emoji is typically 1-2 tokens)
    const emojiPattern = /[\u{1F300}-\u{1F9FF}]|[\u{2600}-\u{26FF}]|[\u{2700}-\u{27BF}]/gu;
    const emojis = text.match(emojiPattern);
    if (emojis) {
      extraTokens += emojis.length;
    }

    // Count URLs (URLs are more token-dense)
    const urlPattern = /https?:\/\/[^\s]+/g;
    const urls = text.match(urlPattern);
    if (urls) {
      extraTokens += urls.length * 2; // URLs typically use more tokens
    }

    return extraTokens;
  }

  /**
   * Estimate tokens for a conversation with history
   */
  static estimateConversationTokens(params: {
    systemPrompt?: string;
    messages: Array<{ role: string; content: string }>;
    tools?: any[];
    maxResponseTokens?: number;
  }): {
    system: number;
    messages: number;
    tools: number;
    maxResponse: number;
    total: number;
  } {
    const system = params.systemPrompt ? this.countTokens(params.systemPrompt) + 4 : 0;
    const messages = this.countMessagesTokens(params.messages);
    const tools = params.tools
      ? params.tools.reduce((sum, tool) => sum + this.countTokens(JSON.stringify(tool)), 0)
      : 0;
    const maxResponse = params.maxResponseTokens || 4096;

    return {
      system,
      messages,
      tools,
      maxResponse,
      total: system + messages + tools + maxResponse,
    };
  }

  /**
   * Calculate how many messages fit in token budget
   */
  static calculateMessageLimit(
    messages: Array<{ role: string; content: string }>,
    maxTokens: number,
    systemTokens: number = 0
  ): {
    messageCount: number;
    totalTokens: number;
    remainingTokens: number;
  } {
    let totalTokens = systemTokens;
    let messageCount = 0;

    // Start from most recent messages
    for (let i = messages.length - 1; i >= 0; i--) {
      const messageTokens = this.countTokens(messages[i].content) + 4;

      if (totalTokens + messageTokens > maxTokens) {
        break;
      }

      totalTokens += messageTokens;
      messageCount++;
    }

    return {
      messageCount,
      totalTokens,
      remainingTokens: maxTokens - totalTokens,
    };
  }

  /**
   * Split text into chunks that fit within token limit
   */
  static splitIntoChunks(
    text: string,
    maxTokensPerChunk: number,
    overlapTokens: number = 0
  ): string[] {
    const chunks: string[] = [];
    const sentences = text.match(/[^.!?]+[.!?]+/g) || [text];

    let currentChunk = '';
    let currentTokens = 0;

    for (const sentence of sentences) {
      const sentenceTokens = this.countTokens(sentence);

      // If single sentence exceeds limit, split it by words
      if (sentenceTokens > maxTokensPerChunk) {
        if (currentChunk) {
          chunks.push(currentChunk);
          currentChunk = '';
          currentTokens = 0;
        }

        const words = sentence.split(' ');
        let wordChunk = '';
        let wordTokens = 0;

        for (const word of words) {
          const wordToken = this.countTokens(word + ' ');

          if (wordTokens + wordToken > maxTokensPerChunk) {
            chunks.push(wordChunk.trim());
            wordChunk = word + ' ';
            wordTokens = wordToken;
          } else {
            wordChunk += word + ' ';
            wordTokens += wordToken;
          }
        }

        if (wordChunk) {
          chunks.push(wordChunk.trim());
        }

        continue;
      }

      // Check if adding sentence would exceed limit
      if (currentTokens + sentenceTokens > maxTokensPerChunk && currentChunk) {
        chunks.push(currentChunk);

        // Handle overlap
        if (overlapTokens > 0) {
          const overlapText = this.getLastNTokens(currentChunk, overlapTokens);
          currentChunk = overlapText + sentence;
          currentTokens = this.countTokens(currentChunk);
        } else {
          currentChunk = sentence;
          currentTokens = sentenceTokens;
        }
      } else {
        currentChunk += sentence;
        currentTokens += sentenceTokens;
      }
    }

    // Add remaining chunk
    if (currentChunk) {
      chunks.push(currentChunk);
    }

    return chunks;
  }

  /**
   * Get last N tokens from text (approximate)
   */
  private static getLastNTokens(text: string, tokens: number): string {
    const totalTokens = this.countTokens(text);

    if (totalTokens <= tokens) {
      return text;
    }

    // Approximate character position
    const ratio = tokens / totalTokens;
    const startPos = Math.floor(text.length * (1 - ratio));

    return text.substring(startPos);
  }

  /**
   * Trim text to fit within token limit
   */
  static trimToTokenLimit(text: string, maxTokens: number): string {
    const currentTokens = this.countTokens(text);

    if (currentTokens <= maxTokens) {
      return text;
    }

    // Calculate approximate character limit
    const ratio = maxTokens / currentTokens;
    const targetLength = Math.floor(text.length * ratio);

    // Trim to last complete sentence
    const trimmed = text.substring(0, targetLength);
    const lastSentence = trimmed.lastIndexOf('.');

    if (lastSentence > targetLength * 0.8) {
      return trimmed.substring(0, lastSentence + 1);
    }

    return trimmed + '...';
  }

  /**
   * Get token budget breakdown
   */
  static calculateTokenBudget(
    maxTokens: number,
    allocations: {
      system?: number;
      history?: number;
      current?: number;
      response?: number;
      buffer?: number;
    }
  ): {
    total: number;
    system: number;
    history: number;
    current: number;
    response: number;
    buffer: number;
  } {
    const system = allocations.system || Math.floor(maxTokens * 0.05); // 5%
    const response = allocations.response || Math.floor(maxTokens * 0.3); // 30%
    const buffer = allocations.buffer || Math.floor(maxTokens * 0.05); // 5%
    const remaining = maxTokens - system - response - buffer;

    const history = allocations.history || Math.floor(remaining * 0.7); // 70% of remaining
    const current = allocations.current || (remaining - history); // Rest

    return {
      total: maxTokens,
      system,
      history,
      current,
      response,
      buffer,
    };
  }

  /**
   * Check if text exceeds token limit
   */
  static exceedsLimit(text: string, limit: number): boolean {
    return this.countTokens(text) > limit;
  }

  /**
   * Get token usage percentage
   */
  static getUsagePercentage(currentTokens: number, maxTokens: number): number {
    return Math.min(100, (currentTokens / maxTokens) * 100);
  }

  /**
   * Estimate compression ratio needed
   */
  static estimateCompressionNeeded(
    currentTokens: number,
    targetTokens: number
  ): number {
    if (currentTokens <= targetTokens) {
      return 0;
    }

    return 1 - targetTokens / currentTokens;
  }
}

