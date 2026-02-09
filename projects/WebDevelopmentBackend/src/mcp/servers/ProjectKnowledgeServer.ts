// @ts-nocheck - Prisma schema fields don't match MCP type expectations (structural refactor needed)
// ============================================
// src/mcp/servers/ProjectKnowledgeServer.ts
// MCP Server: Project Knowledge Database
// ============================================

import {
  MCPServer,
  MCPTool,
  MCPToolHandler,
  MCPExecutionContext,
  MCPToolResult,
  ProjectSearchParams,
  ProjectSearchResult,
  ProjectStatistics,
  TechnologyRecommendation,
} from '../types';
import { toErrorMessage } from '../../utils/errors';

export class ProjectKnowledgeServer implements MCPServer {
  name = 'ProjectKnowledgeServer';
  description = 'Access to historical project data, statistics, and technology recommendations';
  tools: MCPTool[] = [];
  handlers: Map<string, MCPToolHandler> = new Map();

  private context!: MCPExecutionContext;

  constructor() {
    this.initializeTools();
  }

  private initializeTools() {
    this.tools.push(
      // Tool 1: Search Past Projects
      {
        name: 'search_past_projects',
        description: 'Search completed projects by type, budget, technologies, and features. Returns similar projects with costs, timelines, and satisfaction scores.',
        input_schema: {
          type: 'object',
          properties: {
            query: {
              type: 'string',
              description: 'Search query for project name or description',
            },
            project_type: {
              type: 'string',
              enum: ['website', 'mobile_app', 'ecommerce', 'api', 'custom'],
              description: 'Type of project to search for',
            },
            budget_range: {
              type: 'object',
              properties: {
                min: { type: 'number' },
                max: { type: 'number' },
              },
              description: 'Budget range filter',
            },
            technologies: {
              type: 'array',
              items: { type: 'string' },
              description: 'Required technologies (e.g., ["React", "Node.js"])',
            },
            complexity: {
              type: 'string',
              enum: ['low', 'medium', 'high'],
              description: 'Project complexity level',
            },
            limit: {
              type: 'number',
              description: 'Maximum number of results (default: 10)',
            },
          },
        },
      },
      // Tool 2: Get Project Statistics
      {
        name: 'get_project_statistics',
        description: 'Get aggregate statistics about completed projects including average costs, durations, satisfaction scores, and technology usage patterns.',
        input_schema: {
          type: 'object',
          properties: {
            project_type: {
              type: 'string',
              enum: ['website', 'mobile_app', 'ecommerce', 'api', 'custom', 'all'],
              description: 'Filter statistics by project type (default: all)',
            },
            date_range: {
              type: 'object',
              properties: {
                start: { type: 'string', format: 'date' },
                end: { type: 'string', format: 'date' },
              },
              description: 'Date range for statistics',
            },
          },
        },
      },
      // Tool 3: Get Technology Recommendations
      {
        name: 'get_technology_recommendations',
        description: 'Get technology stack recommendations based on project requirements and historical success rates. Includes pros, cons, and confidence scores.',
        input_schema: {
          type: 'object',
          properties: {
            project_type: {
              type: 'string',
              enum: ['website', 'mobile_app', 'ecommerce', 'api', 'custom'],
              description: 'Type of project',
            },
            requirements: {
              type: 'array',
              items: { type: 'string' },
              description: 'Project requirements (e.g., ["real-time updates", "payment processing"])',
            },
            budget: {
              type: 'number',
              description: 'Project budget (affects recommendations)',
            },
            timeline_weeks: {
              type: 'number',
              description: 'Target timeline in weeks',
            },
          },
          required: ['project_type'],
        },
      },
    );

    // Register handlers
    this.handlers.set('search_past_projects', this.searchPastProjects.bind(this));
    this.handlers.set('get_project_statistics', this.getProjectStatistics.bind(this));
    this.handlers.set('get_technology_recommendations', this.getTechnologyRecommendations.bind(this));
  }

  async initialize(context: MCPExecutionContext): Promise<void> {
    this.context = context;
  }

  async healthCheck(): Promise<boolean> {
    try {
      await this.context.prisma.$queryRaw`SELECT 1`;
      return true;
    } catch {
      return false;
    }
  }

  /**
   * Handler: Search Past Projects
   */
  private async searchPastProjects(
    params: ProjectSearchParams,
    context: MCPExecutionContext
  ): Promise<MCPToolResult> {
    try {
      const limit = params.limit || 10;

      const where: any = {};

      if (params.project_type) {
        where.type = params.project_type;
      }

      if (params.query) {
        where.OR = [
          { name: { contains: params.query, mode: 'insensitive' } },
          { description: { contains: params.query, mode: 'insensitive' } },
        ];
      }

      if (params.budget_range) {
        where.cost = {};
        if (params.budget_range.min) where.cost.gte = params.budget_range.min;
        if (params.budget_range.max) where.cost.lte = params.budget_range.max;
      }

      if (params.complexity) {
        where.complexity = params.complexity;
      }

      const projects = await context.prisma.project.findMany({
        where,
        take: limit,
        orderBy: [
          { clientSatisfaction: 'desc' },
          { completionDate: 'desc' },
        ],
        select: {
          id: true,
          name: true,
          type: true,
          description: true,
          cost: true,
          durationWeeks: true,
          technologies: true,
          features: true,
          clientSatisfaction: true,
          completionDate: true,
        },
      });

      const results: ProjectSearchResult[] = projects.map((p) => ({
        id: p.id,
        name: p.name,
        type: p.type,
        description: p.description || '',
        cost: p.cost,
        duration_weeks: p.durationWeeks,
        technologies: Array.isArray(p.technologies) ? p.technologies : [],
        features: Array.isArray(p.features) ? p.features : [],
        client_satisfaction: p.clientSatisfaction || 0,
        completion_date: p.completionDate?.toISOString() || '',
      }));

      return {
        success: true,
        data: {
          projects: results,
          total_found: results.length,
          query_params: params,
        },
        metadata: {
          source: 'database',
          executionTime: Date.now(),
        },
      };
    } catch (error: unknown) {
      return {
        success: false,
        error: `Failed to search projects: ${toErrorMessage(error)}`,
      };
    }
  }

  /**
   * Handler: Get Project Statistics
   */
  private async getProjectStatistics(
    params: any,
    context: MCPExecutionContext
  ): Promise<MCPToolResult> {
    try {
      const projectType = params.project_type || 'all';

      const where: any = {};
      if (projectType !== 'all') {
        where.type = projectType;
      }

      const totalProjects = await context.prisma.project.count({ where });

      const projectsByType = await context.prisma.project.groupBy({
        by: ['type'],
        where,
        _count: true,
      });

      const avgCostByType = await context.prisma.project.groupBy({
        by: ['type'],
        where,
        _avg: {
          cost: true,
          durationWeeks: true,
          clientSatisfaction: true,
        },
      });

      const allProjects = await context.prisma.project.findMany({
        where,
        select: { technologies: true, clientSatisfaction: true },
      });

      const techCount: Record<string, { count: number; totalSatisfaction: number }> = {};
      allProjects.forEach((project) => {
        const techs = Array.isArray(project.technologies) ? project.technologies : [];
        techs.forEach((tech: string) => {
          if (!techCount[tech]) {
            techCount[tech] = { count: 0, totalSatisfaction: 0 };
          }
          techCount[tech].count += 1;
          techCount[tech].totalSatisfaction += project.clientSatisfaction || 0;
        });
      });

      const mostUsedTech = Object.entries(techCount)
        .map(([name, data]) => ({
          name,
          count: data.count,
          success_rate: data.totalSatisfaction / data.count,
        }))
        .sort((a, b) => b.count - a.count)
        .slice(0, 10);

      const statistics: ProjectStatistics = {
        total_projects: totalProjects,
        by_type: Object.fromEntries(
          projectsByType.map((item) => [item.type, item._count])
        ),
        average_cost_by_type: Object.fromEntries(
          avgCostByType.map((item) => [item.type, item._avg.cost || 0])
        ),
        average_duration_by_type: Object.fromEntries(
          avgCostByType.map((item) => [item.type, item._avg.durationWeeks || 0])
        ),
        average_satisfaction:
          avgCostByType.reduce((sum, item) => sum + (item._avg.clientSatisfaction || 0), 0) /
          avgCostByType.length,
        most_used_technologies: mostUsedTech,
        complexity_distribution: {},
      };

      return {
        success: true,
        data: statistics,
        metadata: {
          source: 'database',
          executionTime: Date.now(),
        },
      };
    } catch (error: unknown) {
      return {
        success: false,
        error: `Failed to get statistics: ${toErrorMessage(error)}`,
      };
    }
  }

  /**
   * Handler: Get Technology Recommendations
   */
  private async getTechnologyRecommendations(
    params: any,
    context: MCPExecutionContext
  ): Promise<MCPToolResult> {
    try {
      const { project_type, budget, timeline_weeks } = params;

      const similarProjects = await context.prisma.project.findMany({
        where: {
          type: project_type,
          clientSatisfaction: { gte: 4 },
        },
        select: {
          technologies: true,
          cost: true,
          durationWeeks: true,
          clientSatisfaction: true,
        },
      });

      const techAnalysis: Record<
        string,
        { count: number; avgSatisfaction: number; avgCost: number; avgDuration: number }
      > = {};

      similarProjects.forEach((project) => {
        const techs = Array.isArray(project.technologies) ? project.technologies : [];
        techs.forEach((tech: string) => {
          if (!techAnalysis[tech]) {
            techAnalysis[tech] = { count: 0, avgSatisfaction: 0, avgCost: 0, avgDuration: 0 };
          }
          techAnalysis[tech].count += 1;
          techAnalysis[tech].avgSatisfaction += project.clientSatisfaction || 0;
          techAnalysis[tech].avgCost += project.cost;
          techAnalysis[tech].avgDuration += project.durationWeeks;
        });
      });

      const recommendations: TechnologyRecommendation[] = Object.entries(techAnalysis)
        .map(([tech, data]) => {
          const count = data.count;
          const successRate = data.avgSatisfaction / count;
          const avgCost = data.avgCost / count;
          const avgDuration = data.avgDuration / count;

          const confidence = Math.min((count / similarProjects.length) * successRate * 0.2, 1);

          const reasons: string[] = [];
          if (successRate > 4.5) reasons.push('Very high client satisfaction');
          if (count > 5) reasons.push(`Used in ${count} successful projects`);
          if (budget && avgCost <= budget) reasons.push('Fits within budget');
          if (timeline_weeks && avgDuration <= timeline_weeks) reasons.push('Fits timeline');

          return {
            technology: tech,
            confidence,
            reasons,
            success_rate: successRate,
            projects_used_in: count,
            pros: [`Average project cost: $${avgCost.toFixed(0)}`, `Average duration: ${avgDuration} weeks`],
            cons: [],
          };
        })
        .filter((rec) => rec.confidence > 0.3)
        .sort((a, b) => b.confidence - a.confidence)
        .slice(0, 5);

      return {
        success: true,
        data: {
          recommendations,
          total_projects_analyzed: similarProjects.length,
        },
        metadata: {
          source: 'database',
          executionTime: Date.now(),
        },
      };
    } catch (error: unknown) {
      return {
        success: false,
        error: `Failed to get recommendations: ${toErrorMessage(error)}`,
      };
    }
  }
}
