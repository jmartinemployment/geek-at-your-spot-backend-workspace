// ============================================
// src/a2a/registry/AgentRegistry.ts
// Agent Registry - Manages all agents and their lifecycle
// ============================================

import { BaseAgent } from '../agents/BaseAgent';
import {
  CoordinatorAgent,
  ResearcherAgent,
  DeveloperAgent,
  DesignerAgent,
  AnalystAgent,
  WriterAgent,
  QATesterAgent,
  ProjectManagerAgent,
  CostEstimatorAgent,
  TechnicalArchitectAgent,
} from '../agents/SpecializedAgents';
import {
  AgentConfig,
  AgentRole,
  AgentRegistryEntry,
  AgentMetrics,
  TaskRoutingRule,
  AgentCapabilities,
} from '../types';

export class AgentRegistry {
  private agents: Map<string, BaseAgent> = new Map();
  private routingRules: TaskRoutingRule[] = [];
  private anthropicApiKey: string;

  constructor(anthropicApiKey: string) {
    this.anthropicApiKey = anthropicApiKey;
    this.initializeDefaultRoutingRules();
  }

  /**
   * Register an agent
   */
  registerAgent(config: AgentConfig): void {
    let agent: BaseAgent;

    // Create specialized agent based on role
    switch (config.role) {
      case 'coordinator':
        agent = new CoordinatorAgent(config, this.anthropicApiKey);
        break;
      case 'researcher':
        agent = new ResearcherAgent(config, this.anthropicApiKey);
        break;
      case 'developer':
        agent = new DeveloperAgent(config, this.anthropicApiKey);
        break;
      case 'designer':
        agent = new DesignerAgent(config, this.anthropicApiKey);
        break;
      case 'analyst':
        agent = new AnalystAgent(config, this.anthropicApiKey);
        break;
      case 'writer':
        agent = new WriterAgent(config, this.anthropicApiKey);
        break;
      case 'qa_tester':
        agent = new QATesterAgent(config, this.anthropicApiKey);
        break;
      case 'project_manager':
        agent = new ProjectManagerAgent(config, this.anthropicApiKey);
        break;
      case 'cost_estimator':
        agent = new CostEstimatorAgent(config, this.anthropicApiKey);
        break;
      case 'technical_architect':
        agent = new TechnicalArchitectAgent(config, this.anthropicApiKey);
        break;
      default:
        throw new Error(`Unknown agent role: ${config.role}`);
    }

    this.agents.set(config.id, agent);
  }

  /**
   * Unregister an agent
   */
  unregisterAgent(agentId: string): void {
    this.agents.delete(agentId);
  }

  /**
   * Get agent by ID
   */
  getAgent(agentId: string): BaseAgent | undefined {
    return this.agents.get(agentId);
  }

  /**
   * Get all agents
   */
  getAllAgents(): BaseAgent[] {
    return Array.from(this.agents.values());
  }

  /**
   * Get agents by role
   */
  getAgentsByRole(role: AgentRole): BaseAgent[] {
    return this.getAllAgents().filter(agent => agent.getConfig().role === role);
  }

  /**
   * Get available agents (idle and not at capacity)
   */
  getAvailableAgents(): BaseAgent[] {
    return this.getAllAgents().filter(agent => agent.isAvailable());
  }

  /**
   * Get best agent for a task based on routing rules
   */
  getBestAgentForTask(
    taskDescription: string,
    requiredCapabilities?: Partial<AgentCapabilities>
  ): BaseAgent | undefined {
    const availableAgents = this.getAvailableAgents();

    if (availableAgents.length === 0) {
      return undefined;
    }

    // Try to match with routing rules
    for (const rule of this.routingRules) {
      const matchesKeywords = rule.keywords.some(keyword =>
        taskDescription.toLowerCase().includes(keyword.toLowerCase())
      );

      if (matchesKeywords) {
        const matchingAgents = availableAgents.filter(
          agent => agent.getConfig().role === rule.preferredAgentRole
        );

        if (matchingAgents.length > 0) {
          // Return agent with lowest current load
          return matchingAgents.reduce((best, current) =>
            current.getCurrentLoad() < best.getCurrentLoad() ? current : best
          );
        }
      }
    }

    // If no rule match, check required capabilities
    if (requiredCapabilities) {
      const capableAgents = availableAgents.filter(agent => {
        const caps = agent.getConfig().capabilities;
        return this.hasRequiredCapabilities(caps, requiredCapabilities);
      });

      if (capableAgents.length > 0) {
        return capableAgents.reduce((best, current) =>
          current.getCurrentLoad() < best.getCurrentLoad() ? current : best
        );
      }
    }

    // Default: return least loaded available agent
    return availableAgents.reduce((best, current) =>
      current.getCurrentLoad() < best.getCurrentLoad() ? current : best
    );
  }

  /**
   * Check if agent has required capabilities
   */
  private hasRequiredCapabilities(
    agentCaps: AgentCapabilities,
    required: Partial<AgentCapabilities>
  ): boolean {
    return Object.entries(required).every(([key, value]) => {
      if (typeof value === 'boolean') {
        return agentCaps[key as keyof AgentCapabilities] === value;
      }
      return true;
    });
  }

  /**
   * Add routing rule
   */
  addRoutingRule(rule: TaskRoutingRule): void {
    this.routingRules.push(rule);
  }

  /**
   * Get all routing rules
   */
  getRoutingRules(): TaskRoutingRule[] {
    return [...this.routingRules];
  }

  /**
   * Initialize default routing rules
   */
  private initializeDefaultRoutingRules(): void {
    this.routingRules = [
      {
        taskType: 'research',
        keywords: ['research', 'investigate', 'find', 'gather', 'analyze data'],
        preferredAgentRole: 'researcher',
        requiredCapabilities: { canResearch: true },
        priority: 'normal',
      },
      {
        taskType: 'development',
        keywords: ['code', 'implement', 'develop', 'program', 'build feature'],
        preferredAgentRole: 'developer',
        requiredCapabilities: { canCode: true },
        priority: 'normal',
      },
      {
        taskType: 'design',
        keywords: ['design', 'mockup', 'ui', 'ux', 'interface', 'visual'],
        preferredAgentRole: 'designer',
        requiredCapabilities: { canDesign: true },
        priority: 'normal',
      },
      {
        taskType: 'analysis',
        keywords: ['analyze', 'evaluate', 'assess', 'metrics', 'data analysis'],
        preferredAgentRole: 'analyst',
        requiredCapabilities: { canAnalyze: true },
        priority: 'normal',
      },
      {
        taskType: 'documentation',
        keywords: ['document', 'write', 'content', 'documentation', 'guide'],
        preferredAgentRole: 'writer',
        requiredCapabilities: { canWrite: true },
        priority: 'normal',
      },
      {
        taskType: 'testing',
        keywords: ['test', 'qa', 'quality', 'verify', 'validate'],
        preferredAgentRole: 'qa_tester',
        requiredCapabilities: { canTestQA: true },
        priority: 'normal',
      },
      {
        taskType: 'estimation',
        keywords: ['estimate', 'cost', 'budget', 'pricing', 'quote'],
        preferredAgentRole: 'cost_estimator',
        requiredCapabilities: { canEstimate: true },
        priority: 'normal',
      },
      {
        taskType: 'project_management',
        keywords: ['plan', 'coordinate', 'manage', 'schedule', 'organize'],
        preferredAgentRole: 'project_manager',
        requiredCapabilities: { canManageProjects: true },
        priority: 'normal',
      },
      {
        taskType: 'architecture',
        keywords: ['architecture', 'system design', 'technical design', 'infrastructure'],
        preferredAgentRole: 'technical_architect',
        requiredCapabilities: { canAnalyze: true, canCode: true },
        priority: 'high',
      },
      {
        taskType: 'coordination',
        keywords: ['coordinate', 'orchestrate', 'oversee', 'delegate'],
        preferredAgentRole: 'coordinator',
        requiredCapabilities: { canManageProjects: true },
        priority: 'high',
      },
    ];
  }

  /**
   * Get registry statistics
   */
  getStats(): {
    totalAgents: number;
    availableAgents: number;
    busyAgents: number;
    agentsByRole: Record<AgentRole, number>;
    totalTasksCompleted: number;
    averageSuccessRate: number;
  } {
    const allAgents = this.getAllAgents();
    const availableAgents = this.getAvailableAgents();

    const agentsByRole: Record<AgentRole, number> = {
      coordinator: 0,
      researcher: 0,
      developer: 0,
      designer: 0,
      analyst: 0,
      writer: 0,
      qa_tester: 0,
      project_manager: 0,
      cost_estimator: 0,
      technical_architect: 0,
    };

    let totalTasksCompleted = 0;
    let totalSuccessRate = 0;

    for (const agent of allAgents) {
      const config = agent.getConfig();
      const metrics = agent.getMetrics();

      agentsByRole[config.role]++;
      totalTasksCompleted += metrics.completedTasks;
      totalSuccessRate += metrics.successRate;
    }

    return {
      totalAgents: allAgents.length,
      availableAgents: availableAgents.length,
      busyAgents: allAgents.length - availableAgents.length,
      agentsByRole,
      totalTasksCompleted,
      averageSuccessRate: allAgents.length > 0 ? totalSuccessRate / allAgents.length : 0,
    };
  }

  /**
   * Get all agent metrics
   */
  getAllMetrics(): AgentMetrics[] {
    return this.getAllAgents().map(agent => agent.getMetrics());
  }

  /**
   * Get agent registry entries
   */
  getRegistryEntries(): AgentRegistryEntry[] {
    return this.getAllAgents().map(agent => ({
      config: agent.getConfig(),
      state: agent.getState(),
      metrics: agent.getMetrics(),
    }));
  }

  /**
   * Health check - verify all agents are functioning
   */
  async healthCheck(): Promise<Record<string, boolean>> {
    const health: Record<string, boolean> = {};

    for (const [agentId, agent] of this.agents.entries()) {
      try {
        const config = agent.getConfig();
        health[agentId] = config.enabled && agent.isAvailable();
      } catch {
        health[agentId] = false;
      }
    }

    return health;
  }

  /**
   * Reset all agents (for testing)
   */
  resetAllAgents(): void {
    for (const agent of this.getAllAgents()) {
      agent.reset();
    }
  }

  /**
   * Enable/disable agent
   */
  setAgentEnabled(agentId: string, enabled: boolean): void {
    const agent = this.getAgent(agentId);
    if (agent) {
      agent.setEnabled(enabled);
    }
  }

  /**
   * Get agent count
   */
  getAgentCount(): number {
    return this.agents.size;
  }

  /**
   * Check if agent exists
   */
  hasAgent(agentId: string): boolean {
    return this.agents.has(agentId);
  }

  /**
   * Get agents with specific capability
   */
  getAgentsWithCapability(capability: keyof AgentCapabilities): BaseAgent[] {
    return this.getAllAgents().filter(agent => {
      const caps = agent.getConfig().capabilities;
      return caps[capability] === true;
    });
  }

  /**
   * Get least loaded agent
   */
  getLeastLoadedAgent(): BaseAgent | undefined {
    const availableAgents = this.getAvailableAgents();

    if (availableAgents.length === 0) {
      return undefined;
    }

    return availableAgents.reduce((best, current) =>
      current.getCurrentLoad() < best.getCurrentLoad() ? current : best
    );
  }

  /**
   * Get most experienced agent by success rate
   */
  getMostExperiencedAgent(role?: AgentRole): BaseAgent | undefined {
    let agents = this.getAllAgents();

    if (role) {
      agents = agents.filter(agent => agent.getConfig().role === role);
    }

    if (agents.length === 0) {
      return undefined;
    }

    return agents.reduce((best, current) => {
      const bestMetrics = best.getMetrics();
      const currentMetrics = current.getMetrics();

      // Consider both success rate and experience (total tasks)
      const bestScore = bestMetrics.successRate * (1 + Math.log10(bestMetrics.totalTasks + 1));
      const currentScore = currentMetrics.successRate * (1 + Math.log10(currentMetrics.totalTasks + 1));

      return currentScore > bestScore ? current : best;
    });
  }

  /**
   * Clear all agents
   */
  clear(): void {
    this.agents.clear();
  }
}
