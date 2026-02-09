import Anthropic from '@anthropic-ai/sdk';

export interface TrafficData {
  pageViews: number;
  uniqueVisitors: number;
  bounceRate: number;
  avgSessionDuration: number;
  topPages?: Array<{ page: string; views: number }>;
  timeRange?: string;
}

export interface TrafficAnalysisResult {
  summary: string;
  insights: string[];
  recommendations: string[];
  metrics: {
    engagementScore: number;
    healthScore: number;
  };
}

export class TrafficAnalysisService {
  private readonly anthropic: Anthropic;

  constructor(apiKey: string) {
    this.anthropic = new Anthropic({ apiKey });
  }

  async analyzeTraffic(data: TrafficData): Promise<TrafficAnalysisResult> {
    const prompt = this.buildTrafficPrompt(data);

    const response = await this.anthropic.messages.create({
      model: 'claude-sonnet-4-20250514',
      max_tokens: 2000,
      messages: [{ role: 'user', content: prompt }]
    });

    const firstBlock = response.content[0];
    const text = firstBlock.type === 'text' ? firstBlock.text : '';

    return this.parseTrafficResponse(text);
  }

  private buildTrafficPrompt(data: TrafficData): string {
    const topPagesSection = data.topPages
      ? `Top Pages:\n${data.topPages.map(p => `- ${p.page}: ${p.views} views`).join('\n')}`
      : '';

    return `Analyze this website traffic data:

Page Views: ${data.pageViews}
Unique Visitors: ${data.uniqueVisitors}
Bounce Rate: ${data.bounceRate}%
Avg Session Duration: ${data.avgSessionDuration} seconds
Time Range: ${data.timeRange || 'Not specified'}

${topPagesSection}

Provide:
1. Brief summary of traffic performance
2. 3-5 key insights
3. 3-5 actionable recommendations
4. Engagement score (0-100)
5. Overall health score (0-100)

Format as JSON with keys: summary, insights (array), recommendations (array), metrics (object with engagementScore and healthScore)`;
  }

  private parseTrafficResponse(text: string): TrafficAnalysisResult {
    try {
      const jsonMatch = /\{[\s\S]*\}/.exec(text);
      if (jsonMatch) {
        return JSON.parse(jsonMatch[0]);
      }
    } catch {
      // Expected: AI response may not contain valid JSON; fall back to raw text
    }

    return {
      summary: text.substring(0, 200),
      insights: ['See analysis for details'],
      recommendations: ['Review traffic patterns'],
      metrics: {
        engagementScore: 0,
        healthScore: 0
      }
    };
  }
}
