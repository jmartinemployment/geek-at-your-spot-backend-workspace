import Anthropic from '@anthropic-ai/sdk';
import { logger } from '../utils/logger';

export interface IntentClassification {
  primaryIntent: 'web_development' | 'analytics' | 'marketing' | 'website_analytics' | 'general';
  confidence: number;
  suggestedBackend?: string;
  reasoning: string;
}

export class IntentClassifier {
  private readonly anthropic: Anthropic;

  constructor(apiKey: string) {
    this.anthropic = new Anthropic({ apiKey });
  }

  async classifyIntent(userMessage: string, conversationHistory: string[] = []): Promise<IntentClassification> {
    const prompt = this.buildClassificationPrompt(userMessage, conversationHistory);

    const response = await this.anthropic.messages.create({
      model: 'claude-sonnet-4-20250514',
      max_tokens: 500,
      messages: [{ role: 'user', content: prompt }]
    });

    const firstBlock = response.content[0];
    const text = firstBlock.type === 'text' ? firstBlock.text : '';

    return this.parseClassification(text);
  }

  private buildClassificationPrompt(userMessage: string, history: string[]): string {
    let prompt = `Classify the user's intent for routing to the appropriate backend service.

USER MESSAGE: "${userMessage}"

`;

    if (history.length > 0) {
      prompt += `CONVERSATION HISTORY:
${history.join('\n')}

`;
    }

    prompt += `AVAILABLE SERVICES:
1. web_development - Website building, app development, technical implementation, project estimation
2. analytics - Business analytics, revenue analysis, financial forecasting, data insights
3. marketing - Content creation, SEO, blog posts, social media, copywriting
4. website_analytics - Website traffic analysis, bounce rate, conversion optimization, user behavior

Respond ONLY with JSON:
{
  "primaryIntent": "service_name",
  "confidence": 0-100,
  "suggestedBackend": "/api/service-name",
  "reasoning": "brief explanation"
}`;

    return prompt;
  }

  private parseClassification(text: string): IntentClassification {
    try {
      const jsonMatch = /\{[\s\S]*\}/.exec(text);
      if (jsonMatch) {
        const parsed = JSON.parse(jsonMatch[0]);
        return {
          primaryIntent: parsed.primaryIntent || 'general',
          confidence: parsed.confidence || 0,
          suggestedBackend: parsed.suggestedBackend,
          reasoning: parsed.reasoning || 'Unable to classify'
        };
      }
    } catch (e) {
      logger.error('Failed to parse classification', { error: e });
    }

    return {
      primaryIntent: 'general',
      confidence: 0,
      reasoning: 'Classification failed'
    };
  }
}
