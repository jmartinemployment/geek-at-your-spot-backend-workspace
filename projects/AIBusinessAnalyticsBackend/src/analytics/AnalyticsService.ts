import { AnthropicHelper } from '@geekquote/shared';

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
  private readonly anthropic: AnthropicHelper;

  constructor(apiKey: string) {
    this.anthropic = new AnthropicHelper({ apiKey });
  }

  async analyzeData(query: AnalyticsQuery): Promise<AnalyticsResult> {
    const prompt = this.buildPrompt(query);
    const response = await this.anthropic.sendMessage(prompt);
    
    const parsed = this.anthropic.parseJSON<AnalyticsResult>(response);
    
    if (parsed) {
      return parsed;
    }

    // Fallback
    return {
      summary: response.substring(0, 200),
      insights: ['Analysis completed - see summary for details'],
      recommendations: ['Review the analysis and apply insights to your business']
    };
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
}
