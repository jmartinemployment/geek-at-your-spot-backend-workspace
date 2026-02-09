import Anthropic from '@anthropic-ai/sdk';

/**
 * Extract the outermost balanced JSON object from a string without regex backtracking.
 * Scans for the first '{' then counts balanced braces to find the matching '}'.
 * O(n) with no backtracking -- safe from ReDoS (SonarCloud S5852).
 */
export function extractBalancedJSON(text: string): string | null {
  const start = text.indexOf('{');
  if (start === -1) return null;

  let depth = 0;
  let inString = false;
  let escape = false;

  for (let i = start; i < text.length; i++) {
    const ch = text[i];

    if (escape) {
      escape = false;
      continue;
    }

    if (ch === '\\' && inString) {
      escape = true;
      continue;
    }

    if (ch === '"') {
      inString = !inString;
      continue;
    }

    if (inString) continue;

    if (ch === '{') depth++;
    else if (ch === '}') {
      depth--;
      if (depth === 0) {
        return text.substring(start, i + 1);
      }
    }
  }

  return null;
}

export interface AnthropicConfig {
  apiKey: string;
  model?: string;
  maxTokens?: number;
}

export class AnthropicHelper {
  private readonly client: Anthropic;
  private readonly model: string;
  private readonly maxTokens: number;

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
      const jsonStr = extractBalancedJSON(text);
      if (jsonStr) {
        return JSON.parse(jsonStr);
      }
    } catch {
      // Expected: AI response may not contain valid JSON
      return null;
    }
    return null;
  }
}
