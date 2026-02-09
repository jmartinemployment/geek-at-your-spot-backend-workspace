// ============================================
// src/mcp/client/MCPClient.ts
// MCP Client: Claude API Integration with Tools
// ============================================

import Anthropic from '@anthropic-ai/sdk';
import { MCPRegistry } from '../registry/MCPRegistry';
import { MCPTool } from '../types';
import { toErrorMessage } from '../../utils/errors';

export interface MCPClientConfig {
  apiKey: string;
  model?: string;
  maxTokens?: number;
  temperature?: number;
}

export interface ChatMessage {
  role: 'user' | 'assistant';
  content: string;
}

export interface ChatOptions {
  systemPrompt?: string;
  maxToolUses?: number;
  temperature?: number;
}

export interface ChatResponse {
  content: string;
  toolsUsed: string[];
  stopReason: string;
  usage: {
    inputTokens: number;
    outputTokens: number;
  };
}

export class MCPClient {
  private readonly client: Anthropic;
  private readonly registry: MCPRegistry;
  private readonly config: MCPClientConfig;

  constructor(registry: MCPRegistry, config: MCPClientConfig) {
    this.registry = registry;
    this.config = config;
    this.client = new Anthropic({
      apiKey: config.apiKey,
    });
  }

  /**
   * Send a chat message with MCP tool support
   */
  async chat(
    messages: ChatMessage[],
    options: ChatOptions = {}
  ): Promise<ChatResponse> {
    const toolsUsed: string[] = [];
    const currentMessages = [...messages];
    const maxToolUses = options.maxToolUses || 10;
    let toolUseCount = 0;

    // Get available tools from registry
    const tools = this.registry.getTools();
    const claudeTools = this.convertToClaudeTools(tools);

    try {
      while (toolUseCount < maxToolUses) {
        // Call Claude API
        const response = await this.client.messages.create({
          model: this.config.model || 'claude-sonnet-4-20250514',
          max_tokens: this.config.maxTokens || 4096,
          temperature: options.temperature ?? this.config.temperature ?? 1,
          system: options.systemPrompt,
          messages: currentMessages.map((msg) => ({
            role: msg.role,
            content: msg.content,
          })),
          tools: claudeTools,
        });

        // Check if Claude wants to use tools
        const toolUseBlocks = response.content.filter(
          (block): block is Anthropic.ToolUseBlock => block.type === 'tool_use'
        );

        if (toolUseBlocks.length === 0) {
          // No more tool uses, return final response
          const textBlocks = response.content.filter(
            (block): block is Anthropic.TextBlock => block.type === 'text'
          );
          const finalContent = textBlocks.map((block) => block.text).join('\n');

          return {
            content: finalContent,
            toolsUsed,
            stopReason: response.stop_reason,
            usage: {
              inputTokens: response.usage.input_tokens,
              outputTokens: response.usage.output_tokens,
            },
          };
        }

        // Execute tools
        const toolResults = [];
        for (const toolUseBlock of toolUseBlocks) {
          const toolName = toolUseBlock.name;
          const toolInput = toolUseBlock.input;
          const toolUseId = toolUseBlock.id;

          toolsUsed.push(toolName);
          toolUseCount++;

          // Execute tool via registry
          const result = await this.registry.executeTool(toolName, toolInput);

          toolResults.push({
            type: 'tool_result',
            tool_use_id: toolUseId,
            content: JSON.stringify(result),
          });
        }

        // Add assistant response and tool results to conversation
        currentMessages.push(
          {
            role: 'assistant',
            content: JSON.stringify(response.content),
          },
          {
            role: 'user',
            content: JSON.stringify(toolResults),
          },
        );
      }

      // Max tool uses reached
      return {
        content: 'Maximum tool uses reached. Please simplify your request.',
        toolsUsed,
        stopReason: 'max_tool_uses',
        usage: {
          inputTokens: 0,
          outputTokens: 0,
        },
      };
    } catch (error: unknown) {
      throw new Error(`Chat failed: ${toErrorMessage(error)}`);
    }
  }

  /**
   * Simple chat without tool use (direct response)
   */
  async simpleCat(
    message: string,
    systemPrompt?: string
  ): Promise<string> {
    try {
      const response = await this.client.messages.create({
        model: this.config.model || 'claude-sonnet-4-20250514',
        max_tokens: this.config.maxTokens || 4096,
        temperature: this.config.temperature ?? 1,
        system: systemPrompt,
        messages: [
          {
            role: 'user',
            content: message,
          },
        ],
      });

      const textBlocks = response.content.filter(
        (block): block is Anthropic.TextBlock => block.type === 'text'
      );
      return textBlocks.map((block) => block.text).join('\n');
    } catch (error: unknown) {
      throw new Error(`Simple chat failed: ${toErrorMessage(error)}`);
    }
  }

  /**
   * Get available tools
   */
  getAvailableTools(): MCPTool[] {
    return this.registry.getTools();
  }

  /**
   * Execute a single tool directly
   */
  async executeTool(toolName: string, params: any): Promise<any> {
    const result = await this.registry.executeTool(toolName, params);
    return result;
  }

  /**
   * Convert MCP tools to Claude API format
   */
  private convertToClaudeTools(mcpTools: MCPTool[]): any[] {
    return mcpTools.map((tool) => ({
      name: tool.name,
      description: tool.description,
      input_schema: tool.input_schema,
    }));
  }

  /**
   * Health check
   */
  async healthCheck(): Promise<boolean> {
    try {
      // Check if API key is valid by making a simple request
      await this.client.messages.create({
        model: this.config.model || 'claude-sonnet-4-20250514',
        max_tokens: 10,
        messages: [
          {
            role: 'user',
            content: 'Hi',
          },
        ],
      });
      return true;
    } catch {
      return false;
    }
  }
}
