import Anthropic from '@anthropic-ai/sdk';

export interface AnalyticsQuery {
  type: 'revenue' | 'customer' | 'growth' | 'forecast' | 'custom';
  timeRange?: string;
  metrics?: string[];
  data?: any;
}

export interface AnalyticsResult {
  summary: string;
  insights: string[];
  recommendations: string[];
  data?: any;
}

export class AnalyticsService {
  private anthropic: Anthropic;

  constructor(apiKey: string) {
    this.anthropic = new Anthropic({ apiKey });
  }

  async analyzeData(query: AnalyticsQuery): Promise<AnalyticsResult> {
    const prompt = this.buildPrompt(query);

    const response = await this.anthropic.messages.create({
      model: 'claude-sonnet-4-20250514',
      max_tokens: 2000,
      messages: [
        {
          role: 'user',
          content: prompt
        }
      ]
    });

    return this.parseResponse(response);
  }

  private buildPrompt(query: AnalyticsQuery): string {
    let prompt = `You are an expert business analyst. Analyze the following:

Query Type: ${query.type}
Time Range: ${query.timeRange || 'Not specified'}
Metrics: ${query.metrics?.join(', ') || 'General analysis'}

`;

    if (query.data) {
      prompt += `\nData:\n${JSON.stringify(query.data, null, 2)}\n`;
    }

    prompt += `\nProvide:
1. A brief summary
2. Key insights (3-5 bullet points)
3. Actionable recommendations (3-5 bullet points)

Format your response as JSON with keys: summary, insights (array), recommendations (array)`;

    return prompt;
  }

  private parseResponse(response: any): AnalyticsResult {
    const text = response.content[0].text;
    
    try {
      // Try to extract JSON from response
      const jsonMatch = text.match(/\{[\s\S]*\}/);
      if (jsonMatch) {
        return JSON.parse(jsonMatch[0]);
      }
    } catch (e) {
      // Fallback if JSON parsing fails
    }

    return {
      summary: text.substring(0, 200),
      insights: ['Analysis completed - see summary for details'],
      recommendations: ['Review the analysis and apply insights to your business']
    };
  }
}
