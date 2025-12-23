import Anthropic from '@anthropic-ai/sdk';

export interface EstimateResult {
  summary: string;
  pricing: {
    basePrice: number;
    additionalCosts: Array<{ item: string; cost: number }>;
    totalMin: number;
    totalMax: number;
  };
  timeline: string;
  nextSteps: string[];
  formattedEstimate: string;
}

export class EstimateGenerator {
  private anthropic: Anthropic;

  constructor(apiKey: string) {
    this.anthropic = new Anthropic({ apiKey });
  }

  async generate(
    serviceType: string,
    requirements: Record<string, any>
  ): Promise<EstimateResult> {
    
    const prompt = this.buildEstimatePrompt(serviceType, requirements);

    const response = await this.anthropic.messages.create({
      model: 'claude-sonnet-4-20250514',
      max_tokens: 2000,
      messages: [{ role: 'user', content: prompt }]
    });

    const firstBlock = response.content[0];
    const text = firstBlock.type === 'text' ? firstBlock.text : '';

    return this.parseEstimate(text, requirements);
  }

  private buildEstimatePrompt(serviceType: string, requirements: Record<string, any>): string {
    return `You are a professional project estimator for Geek @ Your Spot, an AI solutions company.

SERVICE TYPE: ${serviceType}

PROJECT REQUIREMENTS:
${JSON.stringify(requirements, null, 2)}

YOUR TASK:
Generate a detailed, professional project estimate with realistic pricing.

PRICING GUIDELINES:
- Web Development: $3,000-15,000 (based on complexity)
- Marketing/SEO: $500-5,000 per month (ongoing) or $2,000-10,000 (project)
- Business Analytics: $1,500-8,000 (one-time) or $200-2,000/month (recurring)
- Website Analytics: $1,000-5,000 (optimization project)

Consider:
- Scope and complexity
- Timeline (rush = higher cost)
- Required integrations
- Content creation needs
- Ongoing vs one-time

Respond with ONLY valid JSON:
{
  "summary": "Brief project overview (2-3 sentences)",
  "basePrice": number (starting price),
  "additionalCosts": [
    {"item": "description", "cost": number}
  ],
  "totalMin": number (minimum total),
  "totalMax": number (maximum total),
  "timeline": "estimated timeline",
  "nextSteps": ["step 1", "step 2", "step 3"]
}`;
  }

  private parseEstimate(text: string, requirements: Record<string, any>): EstimateResult {
    try {
      const jsonMatch = text.match(/\{[\s\S]*\}/);
      if (!jsonMatch) {
        throw new Error('No JSON found in response');
      }

      const parsed = JSON.parse(jsonMatch[0]);

      const formatted = this.formatEstimateHTML(parsed, requirements);

      return {
        summary: parsed.summary || 'Project estimate generated',
        pricing: {
          basePrice: parsed.basePrice || 0,
          additionalCosts: parsed.additionalCosts || [],
          totalMin: parsed.totalMin || 0,
          totalMax: parsed.totalMax || 0
        },
        timeline: parsed.timeline || 'TBD',
        nextSteps: parsed.nextSteps || [],
        formattedEstimate: formatted
      };

    } catch (error) {
      console.error('Failed to parse estimate:', error);
      
      return {
        summary: 'Custom project estimate based on your requirements',
        pricing: {
          basePrice: 2500,
          additionalCosts: [],
          totalMin: 2500,
          totalMax: 5000
        },
        timeline: '4-8 weeks',
        nextSteps: [
          'Review this estimate',
          'Schedule a consultation call',
          'Finalize project scope'
        ],
        formattedEstimate: '<p><strong>Estimate:</strong> $2,500 - $5,000</p>'
      };
    }
  }

  private formatEstimateHTML(parsed: any, requirements: Record<string, any>): string {
    const contactName = requirements.contactName || 'Valued Client';
    const companyName = requirements.companyName || 'Your Business';
    const contactEmail = requirements.contactEmail || 'your email';
    
    let html = `
<div style="font-family: system-ui, -apple-system, sans-serif; max-width: 800px; margin: 0 auto;">
  <div style="background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); color: white; padding: 30px; border-radius: 12px 12px 0 0; text-align: center;">
    <h2 style="margin: 0 0 10px 0; font-size: 28px;">PROJECT ESTIMATE</h2>
    <h3 style="margin: 0; font-size: 20px; font-weight: normal;">${companyName}</h3>
    <p style="margin: 10px 0 0 0; opacity: 0.9;">Prepared for: ${contactName}</p>
  </div>

  <div style="background: white; padding: 30px; border: 1px solid #e0e0e0;">
    <div style="margin-bottom: 30px;">
      <h4 style="margin: 0 0 10px 0; color: #333; font-size: 16px; text-transform: uppercase; letter-spacing: 1px;">Project Summary</h4>
      <p style="margin: 0; color: #666; line-height: 1.6;">${parsed.summary}</p>
    </div>

    <table style="width: 100%; border-collapse: collapse; margin-bottom: 30px;">
      <thead>
        <tr style="background: #f5f5f5;">
          <th style="padding: 15px; text-align: left; border-bottom: 2px solid #667eea; font-weight: 600; color: #333;">Item</th>
          <th style="padding: 15px; text-align: right; border-bottom: 2px solid #667eea; font-weight: 600; color: #333;">Cost</th>
        </tr>
      </thead>
      <tbody>
        <tr>
          <td style="padding: 15px; border-bottom: 1px solid #e0e0e0; color: #333;">Base Project Cost</td>
          <td style="padding: 15px; text-align: right; border-bottom: 1px solid #e0e0e0; color: #333; font-weight: 500;">$${parsed.basePrice.toLocaleString()}</td>
        </tr>`;

    if (parsed.additionalCosts && parsed.additionalCosts.length > 0) {
      parsed.additionalCosts.forEach((item: any) => {
        html += `
        <tr>
          <td style="padding: 15px; border-bottom: 1px solid #e0e0e0; color: #555;">${item.item}</td>
          <td style="padding: 15px; text-align: right; border-bottom: 1px solid #e0e0e0; color: #555;">$${item.cost.toLocaleString()}</td>
        </tr>`;
      });
    }

    html += `
        <tr style="background: #f9f9f9; font-weight: bold; font-size: 18px;">
          <td style="padding: 20px; border-top: 2px solid #667eea; color: #333;">Total Investment</td>
          <td style="padding: 20px; text-align: right; border-top: 2px solid #667eea; color: #667eea;">$${parsed.totalMin.toLocaleString()} - $${parsed.totalMax.toLocaleString()}</td>
        </tr>
      </tbody>
    </table>

    <div style="background: #f9f9f9; padding: 20px; border-radius: 8px; margin-bottom: 30px;">
      <p style="margin: 0; color: #333;"><strong>⏱️ Estimated Timeline:</strong> ${parsed.timeline}</p>
    </div>

    <div style="margin-bottom: 30px;">
      <h4 style="margin: 0 0 15px 0; color: #333; font-size: 16px; text-transform: uppercase; letter-spacing: 1px;">Next Steps</h4>
      <ol style="margin: 0; padding-left: 20px; color: #666; line-height: 1.8;">`;

    parsed.nextSteps.forEach((step: string) => {
      html += `<li style="margin-bottom: 8px;">${step}</li>`;
    });

    html += `
      </ol>
    </div>

    <div style="border-top: 2px solid #e0e0e0; padding-top: 20px; text-align: center; color: #666;">
      <p style="margin: 0 0 10px 0;">📧 We'll email this estimate to: <strong>${contactEmail}</strong></p>
      <p style="margin: 0 0 10px 0;">⏰ This estimate is valid for 30 days</p>
      <p style="margin: 0;">💬 Questions? Reply to this conversation anytime!</p>
    </div>
  </div>
</div>`;

    return html;
  }
}
