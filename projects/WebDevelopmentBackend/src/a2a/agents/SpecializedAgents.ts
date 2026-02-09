// ============================================
// src/a2a/agents/SpecializedAgents.ts
// Specialized Agent Implementations
// ============================================

import { BaseAgent } from './BaseAgent';
import { AgentTask } from '../types';

/**
 * CoordinatorAgent - Orchestrates multi-agent workflows
 */
export class CoordinatorAgent extends BaseAgent {
  protected async executeTaskLogic(task: AgentTask): Promise<any> {
    // Coordinator analyzes the task and creates a plan
    const prompt = `
As a Coordinator Agent, analyze this task and create an execution plan:

Task: ${task.title}
Description: ${task.description}
Input: ${JSON.stringify(task.input)}

Provide:
1. Required agents and their roles
2. Task breakdown with dependencies
3. Estimated timeline
4. Success criteria

Format as JSON.
`;

    const response = await this.client.messages.create({
      model: this.config.model || 'claude-sonnet-4-20250514',
      max_tokens: 4096,
      system: this.config.systemPrompt,
      messages: [{ role: 'user', content: prompt }],
    });

    const content = response.content
      .filter((block: any) => block.type === 'text')
      .map((block: any) => block.text)
      .join('\n');

    return {
      plan: content,
      taskBreakdown: this.parseTaskBreakdown(content),
    };
  }

  private parseTaskBreakdown(content: string): any {
    try {
      // Try to extract JSON from response
      const jsonMatch = /\{[\s\S]*\}/.exec(content);
      if (jsonMatch) {
        return JSON.parse(jsonMatch[0]);
      }
    } catch {
      // Return raw content if parsing fails
    }
    return { rawPlan: content };
  }
}

/**
 * ResearcherAgent - Gathers and analyzes information
 */
export class ResearcherAgent extends BaseAgent {
  protected async executeTaskLogic(task: AgentTask): Promise<any> {
    const prompt = `
As a Researcher Agent, conduct research on this topic:

Task: ${task.title}
Description: ${task.description}
Context: ${JSON.stringify(task.input)}

Provide:
1. Key findings
2. Relevant data and statistics
3. Best practices
4. Recommendations
5. Sources and references
`;

    const response = await this.client.messages.create({
      model: this.config.model || 'claude-sonnet-4-20250514',
      max_tokens: 4096,
      system: this.config.systemPrompt,
      messages: [{ role: 'user', content: prompt }],
    });

    const findings = response.content
      .filter((block: any) => block.type === 'text')
      .map((block: any) => block.text)
      .join('\n');

    return {
      findings,
      keyPoints: this.extractKeyPoints(findings),
      recommendations: this.extractRecommendations(findings),
    };
  }

  private extractKeyPoints(text: string): string[] {
    const lines = text.split('\n');
    return lines
      .filter(line => /^[-•*]\s+/.exec(line.trim()))
      .map(line => line.trim().replaceAll(/^[-•*]\s+/, ''));
  }

  private extractRecommendations(text: string): string[] {
    const recommendationSection = /recommendations?:?([\s\S]*?)(?=\n\n|\n#|$)/i.exec(text);
    if (recommendationSection) {
      return this.extractKeyPoints(recommendationSection[1]);
    }
    return [];
  }
}

/**
 * DeveloperAgent - Writes and reviews code
 */
export class DeveloperAgent extends BaseAgent {
  protected async executeTaskLogic(task: AgentTask): Promise<any> {
    const prompt = `
As a Developer Agent, work on this development task:

Task: ${task.title}
Description: ${task.description}
Requirements: ${JSON.stringify(task.input)}

Provide:
1. Implementation approach
2. Code structure
3. Key functions/components needed
4. Testing strategy
5. Potential challenges
`;

    const response = await this.client.messages.create({
      model: this.config.model || 'claude-sonnet-4-20250514',
      max_tokens: 4096,
      system: this.config.systemPrompt,
      messages: [{ role: 'user', content: prompt }],
    });

    const implementation = response.content
      .filter((block: any) => block.type === 'text')
      .map((block: any) => block.text)
      .join('\n');

    return {
      implementation,
      codeBlocks: this.extractCodeBlocks(implementation),
      approach: implementation,
    };
  }

  private extractCodeBlocks(text: string): Array<{ language: string; code: string }> {
    const blocks: Array<{ language: string; code: string }> = [];
    const regex = /```(\w+)?\n([\s\S]*?)```/g;
    let match;

    while ((match = regex.exec(text)) !== null) {
      blocks.push({
        language: match[1] || 'text',
        code: match[2].trim(),
      });
    }

    return blocks;
  }
}

/**
 * DesignerAgent - Creates designs and mockups
 */
export class DesignerAgent extends BaseAgent {
  protected async executeTaskLogic(task: AgentTask): Promise<any> {
    const prompt = `
As a Designer Agent, create a design solution for:

Task: ${task.title}
Description: ${task.description}
Requirements: ${JSON.stringify(task.input)}

Provide:
1. Design concept
2. Color scheme and typography
3. Layout structure
4. Component hierarchy
5. User experience flow
6. Accessibility considerations
`;

    const response = await this.client.messages.create({
      model: this.config.model || 'claude-sonnet-4-20250514',
      max_tokens: 4096,
      system: this.config.systemPrompt,
      messages: [{ role: 'user', content: prompt }],
    });

    const design = response.content
      .filter((block: any) => block.type === 'text')
      .map((block: any) => block.text)
      .join('\n');

    return {
      designConcept: design,
      specifications: this.parseDesignSpecs(design),
    };
  }

  private parseDesignSpecs(text: string): any {
    return {
      colorScheme: this.extractSection(text, 'color'),
      typography: this.extractSection(text, 'typography'),
      layout: this.extractSection(text, 'layout'),
    };
  }

  private extractSection(text: string, sectionName: string): string {
    const regex = new RegExp(`${sectionName}[:\\s]+(.*?)(?=\\n\\n|\\n[A-Z]|$)`, 'i');
    const match = regex.exec(text);
    return match ? match[1].trim() : '';
  }
}

/**
 * AnalystAgent - Analyzes data and provides insights
 */
export class AnalystAgent extends BaseAgent {
  protected async executeTaskLogic(task: AgentTask): Promise<any> {
    const prompt = `
As an Analyst Agent, analyze the following:

Task: ${task.title}
Description: ${task.description}
Data: ${JSON.stringify(task.input)}

Provide:
1. Data summary
2. Key metrics
3. Trends and patterns
4. Insights and findings
5. Recommendations
6. Risk assessment
`;

    const response = await this.client.messages.create({
      model: this.config.model || 'claude-sonnet-4-20250514',
      max_tokens: 4096,
      system: this.config.systemPrompt,
      messages: [{ role: 'user', content: prompt }],
    });

    const analysis = response.content
      .filter((block: any) => block.type === 'text')
      .map((block: any) => block.text)
      .join('\n');

    return {
      analysis,
      keyMetrics: this.extractMetrics(analysis),
      insights: this.extractInsights(analysis),
      recommendations: this.extractRecommendations(analysis),
    };
  }

  private extractMetrics(text: string): Record<string, any> {
    const metrics: Record<string, any> = {};
    const lines = text.split('\n');

    for (const line of lines) {
      const match = /(\w+(?:\s+\w+)*?):\s*([0-9.]+%?)/.exec(line);
      if (match) {
        metrics[match[1].toLowerCase().replaceAll(/\s+/g, '_')] = match[2];
      }
    }

    return metrics;
  }

  private extractInsights(text: string): string[] {
    const insightsSection = /insights?:?([\s\S]*?)(?=\n\n|\n#|recommendations|$)/i.exec(text);
    if (insightsSection) {
      return this.extractKeyPoints(insightsSection[1]);
    }
    return [];
  }

  private extractKeyPoints(text: string): string[] {
    const lines = text.split('\n');
    return lines
      .filter(line => /^[-•*]\s+/.exec(line.trim()))
      .map(line => line.trim().replaceAll(/^[-•*]\s+/, ''));
  }

  private extractRecommendations(text: string): string[] {
    const recommendationSection = /recommendations?:?([\s\S]*?)(?=\n\n|\n#|$)/i.exec(text);
    if (recommendationSection) {
      return this.extractKeyPoints(recommendationSection[1]);
    }
    return [];
  }
}

/**
 * WriterAgent - Creates documentation and content
 */
export class WriterAgent extends BaseAgent {
  protected async executeTaskLogic(task: AgentTask): Promise<any> {
    const prompt = `
As a Writer Agent, create content for:

Task: ${task.title}
Description: ${task.description}
Requirements: ${JSON.stringify(task.input)}

Provide well-structured, clear, and professional content.
`;

    const response = await this.client.messages.create({
      model: this.config.model || 'claude-sonnet-4-20250514',
      max_tokens: 4096,
      system: this.config.systemPrompt,
      messages: [{ role: 'user', content: prompt }],
    });

    const content = response.content
      .filter((block: any) => block.type === 'text')
      .map((block: any) => block.text)
      .join('\n');

    return {
      content,
      wordCount: content.split(/\s+/).length,
      sections: this.extractSections(content),
    };
  }

  private extractSections(text: string): string[] {
    const headers = text.match(/^#+\s+.+$/gm);
    return headers ? headers.map(h => h.replaceAll(/^#+\s+/, '')) : [];
  }
}

/**
 * QATesterAgent - Tests and ensures quality
 */
export class QATesterAgent extends BaseAgent {
  protected async executeTaskLogic(task: AgentTask): Promise<any> {
    const prompt = `
As a QA Tester Agent, review and test:

Task: ${task.title}
Description: ${task.description}
Artifact to test: ${JSON.stringify(task.input)}

Provide:
1. Test plan
2. Test cases
3. Quality assessment
4. Issues found
5. Recommendations for improvement
`;

    const response = await this.client.messages.create({
      model: this.config.model || 'claude-sonnet-4-20250514',
      max_tokens: 4096,
      system: this.config.systemPrompt,
      messages: [{ role: 'user', content: prompt }],
    });

    const testResults = response.content
      .filter((block: any) => block.type === 'text')
      .map((block: any) => block.text)
      .join('\n');

    return {
      testResults,
      testCases: this.extractTestCases(testResults),
      issues: this.extractIssues(testResults),
      qualityScore: this.calculateQualityScore(testResults),
    };
  }

  private extractTestCases(text: string): string[] {
    const testSection = /test cases?:?([\s\S]*?)(?=\n\n|\n#|quality|$)/i.exec(text);
    if (testSection) {
      return this.extractKeyPoints(testSection[1]);
    }
    return [];
  }

  private extractIssues(text: string): string[] {
    const issuesSection = /issues? found:?([\s\S]*?)(?=\n\n|\n#|recommendations|$)/i.exec(text);
    if (issuesSection) {
      return this.extractKeyPoints(issuesSection[1]);
    }
    return [];
  }

  private extractKeyPoints(text: string): string[] {
    const lines = text.split('\n');
    return lines
      .filter(line => /^[-•*]\s+/.exec(line.trim()))
      .map(line => line.trim().replaceAll(/^[-•*]\s+/, ''));
  }

  private calculateQualityScore(text: string): number {
    // Simple heuristic: fewer issues = higher score
    const issues = this.extractIssues(text);
    const baseScore = 100;
    const deduction = issues.length * 10;
    return Math.max(0, baseScore - deduction);
  }
}

/**
 * ProjectManagerAgent - Manages projects and coordinates teams
 */
export class ProjectManagerAgent extends BaseAgent {
  protected async executeTaskLogic(task: AgentTask): Promise<any> {
    const prompt = `
As a Project Manager Agent, manage this project aspect:

Task: ${task.title}
Description: ${task.description}
Context: ${JSON.stringify(task.input)}

Provide:
1. Project plan
2. Timeline and milestones
3. Resource allocation
4. Risk assessment
5. Success metrics
`;

    const response = await this.client.messages.create({
      model: this.config.model || 'claude-sonnet-4-20250514',
      max_tokens: 4096,
      system: this.config.systemPrompt,
      messages: [{ role: 'user', content: prompt }],
    });

    const plan = response.content
      .filter((block: any) => block.type === 'text')
      .map((block: any) => block.text)
      .join('\n');

    return {
      projectPlan: plan,
      milestones: this.extractMilestones(plan),
      risks: this.extractRisks(plan),
    };
  }

  private extractMilestones(text: string): string[] {
    const milestoneSection = /milestones?:?([\s\S]*?)(?=\n\n|\n#|resources|$)/i.exec(text);
    if (milestoneSection) {
      return this.extractKeyPoints(milestoneSection[1]);
    }
    return [];
  }

  private extractRisks(text: string): string[] {
    const riskSection = /risks?:?([\s\S]*?)(?=\n\n|\n#|success|$)/i.exec(text);
    if (riskSection) {
      return this.extractKeyPoints(riskSection[1]);
    }
    return [];
  }

  private extractKeyPoints(text: string): string[] {
    const lines = text.split('\n');
    return lines
      .filter(line => /^[-•*]\s+/.exec(line.trim()))
      .map(line => line.trim().replaceAll(/^[-•*]\s+/, ''));
  }
}

/**
 * CostEstimatorAgent - Estimates costs and budgets
 */
export class CostEstimatorAgent extends BaseAgent {
  protected async executeTaskLogic(task: AgentTask): Promise<any> {
    const prompt = `
As a Cost Estimator Agent, estimate costs for:

Task: ${task.title}
Description: ${task.description}
Requirements: ${JSON.stringify(task.input)}

Provide:
1. Detailed cost breakdown
2. Total estimated cost
3. Cost assumptions
4. Risk factors affecting cost
5. Cost optimization suggestions
`;

    const response = await this.client.messages.create({
      model: this.config.model || 'claude-sonnet-4-20250514',
      max_tokens: 4096,
      system: this.config.systemPrompt,
      messages: [{ role: 'user', content: prompt }],
    });

    const estimate = response.content
      .filter((block: any) => block.type === 'text')
      .map((block: any) => block.text)
      .join('\n');

    return {
      costEstimate: estimate,
      breakdown: this.extractCostBreakdown(estimate),
      totalCost: this.extractTotalCost(estimate),
      assumptions: this.extractAssumptions(estimate),
    };
  }

  private extractCostBreakdown(text: string): Record<string, number> {
    const breakdown: Record<string, number> = {};
    const lines = text.split('\n');

    for (const line of lines) {
      const match = /(.+?):\s*\$?([\d,]+(?:\.\d{2})?)/.exec(line);
      if (match) {
        const key = match[1].trim().toLowerCase().replaceAll(/\s+/g, '_');
        const value = Number.parseFloat(match[2].replaceAll(',', ''));
        breakdown[key] = value;
      }
    }

    return breakdown;
  }

  private extractTotalCost(text: string): number {
    const match = /total.*?:\s*\$?([\d,]+(?:\.\d{2})?)/i.exec(text);
    if (match) {
      return Number.parseFloat(match[1].replaceAll(',', ''));
    }
    return 0;
  }

  private extractAssumptions(text: string): string[] {
    const assumptionSection = /assumptions?:?([\s\S]*?)(?=\n\n|\n#|risk|$)/i.exec(text);
    if (assumptionSection) {
      return this.extractKeyPoints(assumptionSection[1]);
    }
    return [];
  }

  private extractKeyPoints(text: string): string[] {
    const lines = text.split('\n');
    return lines
      .filter(line => /^[-•*]\s+/.exec(line.trim()))
      .map(line => line.trim().replaceAll(/^[-•*]\s+/, ''));
  }
}

/**
 * TechnicalArchitectAgent - Designs system architecture
 */
export class TechnicalArchitectAgent extends BaseAgent {
  protected async executeTaskLogic(task: AgentTask): Promise<any> {
    const prompt = `
As a Technical Architect Agent, design architecture for:

Task: ${task.title}
Description: ${task.description}
Requirements: ${JSON.stringify(task.input)}

Provide:
1. Architecture overview
2. Technology stack recommendations
3. System components
4. Data flow
5. Scalability considerations
6. Security considerations
`;

    const response = await this.client.messages.create({
      model: this.config.model || 'claude-sonnet-4-20250514',
      max_tokens: 4096,
      system: this.config.systemPrompt,
      messages: [{ role: 'user', content: prompt }],
    });

    const architecture = response.content
      .filter((block: any) => block.type === 'text')
      .map((block: any) => block.text)
      .join('\n');

    return {
      architecture,
      techStack: this.extractTechStack(architecture),
      components: this.extractComponents(architecture),
    };
  }

  private extractTechStack(text: string): string[] {
    const techSection = /technology stack:?([\s\S]*?)(?=\n\n|\n#|system|$)/i.exec(text);
    if (techSection) {
      return this.extractKeyPoints(techSection[1]);
    }
    return [];
  }

  private extractComponents(text: string): string[] {
    const componentSection = /components?:?([\s\S]*?)(?=\n\n|\n#|data|$)/i.exec(text);
    if (componentSection) {
      return this.extractKeyPoints(componentSection[1]);
    }
    return [];
  }

  private extractKeyPoints(text: string): string[] {
    const lines = text.split('\n');
    return lines
      .filter(line => /^[-•*]\s+/.exec(line.trim()))
      .map(line => line.trim().replaceAll(/^[-•*]\s+/, ''));
  }
}
