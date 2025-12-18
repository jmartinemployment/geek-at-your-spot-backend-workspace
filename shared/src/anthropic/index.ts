import Anthropic from '@anthropic-ai/sdk';

export interface AnthropicConfig {
  apiKey: string;
  model?: string;
  maxTokens?: number;
}

export class AnthropicHelper {
  private client: Anthropic;
  private model: string;
  private maxTokens: number;

  constructor(config: AnthropicConfig) {
    this.client = new Anthropic({ apiKey: config.apiKey });
    this.model = config.model || 'claude-sonnet-4-20250514';
    this.maxTokens = config.maxTokens || 2000;
  }

  async sendMessage(prompt: string, maxTokens?: number): Promise<string> {
    const response = await this.client.messages.create({
      model: this.model,
      max_tokens: maxTokens || this.maxTokens,
      messages: [{ role: 'user', content: prompt }]
    });

    const firstBlock = response.content[0];
    return firstBlock.type === 'text' ? firstBlock.text : '';
  }

  async sendMessageWithSystem(
    prompt: string,
    systemPrompt: string,
    maxTokens?: number
  ): Promise<string> {
    const response = await this.client.messages.create({
      model: this.model,
      max_tokens: maxTokens || this.maxTokens,
      system: systemPrompt,
      messages: [{ role: 'user', content: prompt }]
    });

    const firstBlock = response.content[0];
    return firstBlock.type === 'text' ? firstBlock.text : '';
  }

  parseJSON<T>(text: string): T | null {
    try {
      const jsonMatch = text.match(/\{[\s\S]*\}/);
      if (jsonMatch) {
        return JSON.parse(jsonMatch[0]);
      }
    } catch (e) {
      return null;
    }
    return null;
  }
}
