import Anthropic from '@anthropic-ai/sdk';

export interface ContentRequest {
  type: 'blog' | 'social' | 'email' | 'ad' | 'landing';
  topic: string;
  tone?: string;
  length?: string;
  keywords?: string[];
}

export interface ContentResult {
  content: string;
  title?: string;
  metadata?: {
    wordCount: number;
    readingTime: string;
  };
}

export class ContentService {
  private readonly anthropic: Anthropic;

  constructor(apiKey: string) {
    this.anthropic = new Anthropic({ apiKey });
  }

  async generateContent(request: ContentRequest): Promise<ContentResult> {
    const prompt = this.buildContentPrompt(request);

    const response = await this.anthropic.messages.create({
      model: 'claude-sonnet-4-20250514',
      max_tokens: 4000,
      messages: [{ role: 'user', content: prompt }]
    });

    const firstBlock = response.content[0];
    const content = firstBlock.type === 'text' ? firstBlock.text : '';
    const wordCount = content.split(/\s+/).length;
    const readingTime = Math.ceil(wordCount / 200);

    return {
      content,
      metadata: {
        wordCount,
        readingTime: `${readingTime} min read`
      }
    };
  }

  private buildContentPrompt(request: ContentRequest): string {
    let prompt = `Generate ${request.type} content about: ${request.topic}\n\n`;
    
    if (request.tone) prompt += `Tone: ${request.tone}\n`;
    if (request.length) prompt += `Length: ${request.length}\n`;
    if (request.keywords?.length) {
      prompt += `Keywords to include: ${request.keywords.join(', ')}\n`;
    }

    prompt += `\nProvide high-quality, engaging content suitable for ${request.type}.`;
    
    return prompt;
  }
}
