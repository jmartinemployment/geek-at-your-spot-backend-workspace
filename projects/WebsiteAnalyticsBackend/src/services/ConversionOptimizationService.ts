import Anthropic from '@anthropic-ai/sdk';

export interface ConversionData {
  totalVisitors: number;
  conversions: number;
  conversionRate: number;
  goalType: string;
  pageData?: any;
}

export interface ConversionResult {
  currentPerformance: string;
  optimizations: string[];
  projectedImpact: string;
  priority: Array<{ action: string; impact: string; effort: string }>;
}

export class ConversionOptimizationService {
  private anthropic: Anthropic;

  constructor(apiKey: string) {
    this.anthropic = new Anthropic({ apiKey });
  }

  async analyzeConversion(data: ConversionData): Promise<ConversionResult> {
    const prompt = this.buildConversionPrompt(data);

    const response = await this.anthropic.messages.create({
      model: 'claude-sonnet-4-20250514',
      max_tokens: 2000,
      messages: [{ role: 'user', content: prompt }]
    });

    const firstBlock = response.content[0];
    const text = firstBlock.type === 'text' ? firstBlock.text : '';

    return this.parseConversionResponse(text);
  }

  private buildConversionPrompt(data: ConversionData): string {
    return `Analyze conversion optimization for:

Goal Type: ${data.goalType}
Total Visitors: ${data.totalVisitors}
Conversions: ${data.conversions}
Current Conversion Rate: ${data.conversionRate}%

Provide:
1. Current performance assessment
2. 5 specific optimization recommendations
3. Projected impact of improvements
4. Priority matrix (3-5 actions with impact/effort ratings)

Format as JSON with keys: currentPerformance, optimizations (array), projectedImpact, priority (array of objects with action, impact, effort)`;
  }

  private parseConversionResponse(text: string): ConversionResult {
    try {
      const jsonMatch = text.match(/\{[\s\S]*\}/);
      if (jsonMatch) {
        return JSON.parse(jsonMatch[0]);
      }
    } catch (e) {
      // Fallback
    }

    return {
      currentPerformance: text.substring(0, 150),
      optimizations: ['Review conversion funnel'],
      projectedImpact: 'Analysis needed',
      priority: []
    };
  }
}
