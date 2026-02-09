import Anthropic from '@anthropic-ai/sdk';
import { Message } from '../types/conversation';
import { getAllFields } from './RequirementsSchema';
import { logger } from '../utils/logger';

export interface ExtractedRequirements {
  data: Record<string, any>;
  missingRequired: string[];
  readinessScore: number;
  completionReady: boolean;
}

export class RequirementsExtractor {
  private readonly anthropic: Anthropic;

  constructor(apiKey: string) {
    this.anthropic = new Anthropic({ apiKey });
  }

  async extract(
    serviceType: string,
    conversationHistory: Message[]
  ): Promise<ExtractedRequirements> {
    
    const fields = getAllFields(serviceType);
    const requiredFields = fields.filter(f => f.required);

    const prompt = this.buildExtractionPrompt(serviceType, fields, conversationHistory);

    const response = await this.anthropic.messages.create({
      model: 'claude-sonnet-4-20250514',
      max_tokens: 2000,
      messages: [{ role: 'user', content: prompt }]
    });

    const firstBlock = response.content[0];
    const text = firstBlock.type === 'text' ? firstBlock.text : '';

    return this.parseExtraction(text, requiredFields);
  }

  private buildExtractionPrompt(
    serviceType: string,
    fields: any[],
    history: Message[]
  ): string {
    const conversationText = history
      .map(m => `${m.role.toUpperCase()}: ${m.content}`)
      .join('\n');

    return `Extract structured requirements from this conversation for a ${serviceType} project.

CONVERSATION:
${conversationText}

FIELDS TO EXTRACT:
${fields.map(f => `- ${f.key} (${f.required ? 'REQUIRED' : 'optional'}): ${f.description}`).join('\n')}

INSTRUCTIONS:
1. Extract all mentioned information into structured JSON
2. If information is not explicitly stated, use null
3. Be specific - extract exact details mentioned, not assumptions
4. For arrays, extract all items mentioned
5. For budget, extract as {min: number, max: number} or {fixed: number}

Respond ONLY with valid JSON in this format:
{
  "extracted": {
    "fieldName": "value",
    ...
  },
  "confidence": 0-100
}`;
  }

  private parseExtraction(
    text: string,
    requiredFields: any[]
  ): ExtractedRequirements {
    try {
      const jsonMatch = /\{[\s\S]*\}/.exec(text);
      if (!jsonMatch) {
        throw new Error('No JSON found in response');
      }

      const parsed = JSON.parse(jsonMatch[0]);
      const extractedData = parsed.extracted || {};

      // Determine which required fields are missing
      const missingRequired = requiredFields
        .filter(f => !extractedData[f.key] || extractedData[f.key] === null)
        .map(f => f.key);

      // Calculate readiness score
      const totalRequired = requiredFields.length;
      const foundRequired = totalRequired - missingRequired.length;
      const readinessScore = totalRequired > 0 
        ? Math.round((foundRequired / totalRequired) * 100)
        : 0;

      // Ready for completion if all required fields present
      const completionReady = missingRequired.length === 0;

      return {
        data: extractedData,
        missingRequired,
        readinessScore,
        completionReady
      };

    } catch (error) {
      logger.error('Failed to parse extraction', { error });
      return {
        data: {},
        missingRequired: requiredFields.map(f => f.key),
        readinessScore: 0,
        completionReady: false
      };
    }
  }
}
