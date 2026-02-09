import Anthropic from '@anthropic-ai/sdk';

export interface SEORequest {
  url?: string;
  content?: string;
  keywords?: string[];
  competitors?: string[];
}

export interface SEOResult {
  score: number;
  analysis: string;
  recommendations: string[];
  keywords: {
    primary: string[];
    secondary: string[];
  };
}

export class SEOService {
  private readonly anthropic: Anthropic;

  constructor(apiKey: string) {
    this.anthropic = new Anthropic({ apiKey });
  }

  async analyzeSEO(request: SEORequest): Promise<SEOResult> {
    const prompt = this.buildSEOPrompt(request);

    const response = await this.anthropic.messages.create({
      model: 'claude-sonnet-4-20250514',
      max_tokens: 2000,
      messages: [{ role: 'user', content: prompt }]
    });

    const firstBlock = response.content[0];
    const text = firstBlock.type === 'text' ? firstBlock.text : '';

    return this.parseSEOResponse(text);
  }

  private buildSEOPrompt(request: SEORequest): string {
    let prompt = 'Analyze SEO for the following:\n\n';
    
    if (request.url) prompt += `URL: ${request.url}\n`;
    if (request.content) prompt += `Content: ${request.content}\n`;
    if (request.keywords?.length) {
      prompt += `Target Keywords: ${request.keywords.join(', ')}\n`;
    }

    prompt += `\nProvide:
1. SEO Score (0-100)
2. Brief analysis
3. 5 specific recommendations
4. Keyword suggestions (primary and secondary)

Format as JSON with keys: score, analysis, recommendations (array), keywords (object with primary and secondary arrays)`;

    return prompt;
  }

  private parseSEOResponse(text: string): SEOResult {
    try {
      const jsonMatch = /\{[\s\S]*\}/.exec(text);
      if (jsonMatch) {
        return JSON.parse(jsonMatch[0]);
      }
    } catch {
      // Expected: AI response may not contain valid JSON; fall back to defaults
    }

    return {
      score: 0,
      analysis: text,
      recommendations: ['Review SEO analysis above'],
      keywords: {
        primary: [],
        secondary: []
      }
    };
  }
}
