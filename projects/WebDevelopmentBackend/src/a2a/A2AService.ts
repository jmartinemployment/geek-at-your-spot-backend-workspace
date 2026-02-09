// ============================================
// src/a2a/A2AService.ts
// A2A Service - Main entry point for Agent-to-Agent system
// ============================================

import { AgentRegistry } from './registry/AgentRegistry';
import { ConversationManager } from './conversation/ConversationManager';
import { Orchestrator } from './orchestrator/Orchestrator';
import { logger } from '../utils/logger';
import {
  A2AConfig,
  AgentConfig,
  OrchestrationRequest,
  OrchestrationResult,
  OrchestrationStrategy,
  AgentRole,
  ConversationContext,
  ConversationSummary,
  AgentMetrics,
} from './types';

export class A2AService {
  private config: A2AConfig;
  private readonly agentRegistry: AgentRegistry;
  private readonly conversationManager: ConversationManager;
  private readonly orchestrator: Orchestrator;
  private initialized: boolean = false;

  constructor(config: Partial<A2AConfig>) {
    this.config = {
      enabled: config.enabled ?? true,
      maxConcurrentConversations: config.maxConcurrentConversations || 10,
      maxAgentsPerConversation: config.maxAgentsPerConversation || 5,
      defaultTimeout: config.defaultTimeout || 60000,
      enableMetrics: config.enableMetrics ?? true,
      enableLogging: config.enableLogging ?? true,
      anthropicApiKey: config.anthropicApiKey || '',
      defaultModel: config.defaultModel || 'claude-sonnet-4-20250514',
      orchestrationStrategy: config.orchestrationStrategy || {
        pattern: 'hierarchical',
        maxParallelAgents: 3,
        enableDelegation: true,
        enableCollaboration: true,
        timeoutPerAgent: 30000,
        retryFailedTasks: true,
        maxRetries: 2,
      },
    };

    if (!this.config.anthropicApiKey) {
      throw new Error('Anthropic API key is required for A2A Service');
    }

    // Initialize components
    this.agentRegistry = new AgentRegistry(this.config.anthropicApiKey);
    this.conversationManager = new ConversationManager();
    this.orchestrator = new Orchestrator(
      this.agentRegistry,
      this.conversationManager,
      this.config.orchestrationStrategy
    );
  }

  /**
   * Initialize A2A Service with default agents
   */
  async initialize(): Promise<void> {
    if (this.initialized) {
      return;
    }

    // Register default agents
    await this.registerDefaultAgents();

    this.initialized = true;

    if (this.config.enableLogging) {
      logger.info('[A2A] Service initialized with', { agentCount: this.agentRegistry.getAgentCount() });
    }
  }

  /**
   * Register default agents
   */
  private async registerDefaultAgents(): Promise<void> {
    const defaultAgents: AgentConfig[] = [
      {
        id: 'coordinator-1',
        name: 'Main Coordinator',
        role: 'coordinator',
        description: 'Coordinates multi-agent workflows and delegates tasks',
        capabilities: {
          canResearch: false,
          canCode: false,
          canDesign: false,
          canAnalyze: true,
          canWrite: false,
          canEstimate: false,
          canManageProjects: true,
          canTestQA: false,
          maxConcurrentTasks: 5,
          specializations: ['orchestration', 'planning', 'delegation'],
        },
        systemPrompt: `You are a Coordinator Agent. Your role is to analyze requests, break them down into tasks, and delegate to specialized agents. Always think about which agents are best suited for each task.`,
        model: this.config.defaultModel,
        enabled: true,
      },
      {
        id: 'researcher-1',
        name: 'Research Specialist',
        role: 'researcher',
        description: 'Gathers information and conducts research',
        capabilities: {
          canResearch: true,
          canCode: false,
          canDesign: false,
          canAnalyze: true,
          canWrite: true,
          canEstimate: false,
          canManageProjects: false,
          canTestQA: false,
          maxConcurrentTasks: 3,
          specializations: ['research', 'analysis', 'documentation'],
        },
        systemPrompt: `You are a Research Agent. Your role is to gather information, analyze data, and provide well-researched insights. Always cite your reasoning and provide comprehensive findings.`,
        model: this.config.defaultModel,
        enabled: true,
      },
      {
        id: 'developer-1',
        name: 'Development Expert',
        role: 'developer',
        description: 'Writes and reviews code',
        capabilities: {
          canResearch: false,
          canCode: true,
          canDesign: false,
          canAnalyze: true,
          canWrite: true,
          canEstimate: false,
          canManageProjects: false,
          canTestQA: false,
          maxConcurrentTasks: 2,
          specializations: ['coding', 'architecture', 'best-practices'],
        },
        systemPrompt: `You are a Developer Agent. Your role is to write clean, maintainable code and provide technical implementation guidance. Focus on best practices and code quality.`,
        model: this.config.defaultModel,
        enabled: true,
      },
      {
        id: 'designer-1',
        name: 'Design Expert',
        role: 'designer',
        description: 'Creates designs and user experiences',
        capabilities: {
          canResearch: false,
          canCode: false,
          canDesign: true,
          canAnalyze: true,
          canWrite: true,
          canEstimate: false,
          canManageProjects: false,
          canTestQA: false,
          maxConcurrentTasks: 2,
          specializations: ['ui-design', 'ux', 'visual-design'],
        },
        systemPrompt: `You are a Designer Agent. Your role is to create intuitive, beautiful designs that provide excellent user experiences. Consider accessibility, usability, and visual appeal.`,
        model: this.config.defaultModel,
        enabled: true,
      },
      {
        id: 'analyst-1',
        name: 'Data Analyst',
        role: 'analyst',
        description: 'Analyzes data and provides insights',
        capabilities: {
          canResearch: true,
          canCode: false,
          canDesign: false,
          canAnalyze: true,
          canWrite: true,
          canEstimate: false,
          canManageProjects: false,
          canTestQA: false,
          maxConcurrentTasks: 3,
          specializations: ['data-analysis', 'metrics', 'insights'],
        },
        systemPrompt: `You are an Analyst Agent. Your role is to analyze data, identify patterns, and provide actionable insights. Use data-driven reasoning and clear visualizations.`,
        model: this.config.defaultModel,
        enabled: true,
      },
      {
        id: 'cost-estimator-1',
        name: 'Cost Estimator',
        role: 'cost_estimator',
        description: 'Estimates project costs and budgets',
        capabilities: {
          canResearch: false,
          canCode: false,
          canDesign: false,
          canAnalyze: true,
          canWrite: true,
          canEstimate: true,
          canManageProjects: false,
          canTestQA: false,
          maxConcurrentTasks: 3,
          specializations: ['cost-estimation', 'budgeting', 'pricing'],
        },
        systemPrompt: `You are a Cost Estimator Agent. Your role is to provide accurate cost estimates with detailed breakdowns. Consider all factors including time, resources, and potential risks.`,
        model: this.config.defaultModel,
        enabled: true,
      },
    ];

    for (const agentConfig of defaultAgents) {
      this.agentRegistry.registerAgent(agentConfig);
    }
  }

  /**
   * Execute a multi-agent workflow
   */
  async execute(request: OrchestrationRequest): Promise<OrchestrationResult> {
    if (!this.config.enabled) {
      throw new Error('A2A Service is disabled');
    }

    if (!this.initialized) {
      await this.initialize();
    }

    // Check concurrent conversation limit
    const activeConversations = this.conversationManager.getActiveConversations();
    if (activeConversations.length >= this.config.maxConcurrentConversations) {
      throw new Error('Maximum concurrent conversations reached');
    }

    // Execute orchestration
    const result = await this.orchestrator.orchestrate(request);

    if (this.config.enableLogging) {
      logger.info('[A2A] Orchestration completed:', {
        conversationId: result.conversationId,
        success: result.success,
        agentsInvolved: result.agentsInvolved.length,
        tasksCompleted: result.tasksCompleted,
        duration: result.totalDuration,
      });
    }

    return result;
  }

  /**
   * Register a custom agent
   */
  registerAgent(config: AgentConfig): void {
    this.agentRegistry.registerAgent(config);

    if (this.config.enableLogging) {
      logger.info('[A2A] Registered agent:', { agentId: config.id, role: config.role });
    }
  }

  /**
   * Unregister an agent
   */
  unregisterAgent(agentId: string): void {
    this.agentRegistry.unregisterAgent(agentId);

    if (this.config.enableLogging) {
      logger.info('[A2A] Unregistered agent:', { agentId });
    }
  }

  /**
   * Get conversation by ID
   */
  getConversation(conversationId: string): ConversationContext | undefined {
    return this.conversationManager.getConversation(conversationId);
  }

  /**
   * Get user conversations
   */
  getUserConversations(userId: string): ConversationContext[] {
    return this.conversationManager.getUserConversations(userId);
  }

  /**
   * Get conversation summary
   */
  getConversationSummary(conversationId: string): ConversationSummary {
    return this.conversationManager.generateSummary(conversationId);
  }

  /**
   * Get all agent metrics
   */
  getAgentMetrics(): AgentMetrics[] {
    return this.agentRegistry.getAllMetrics();
  }

  /**
   * Get service statistics
   */
  getStats() {
    const orchestratorStats = this.orchestrator.getStats();
    const registryStats = this.agentRegistry.getStats();

    return {
      enabled: this.config.enabled,
      initialized: this.initialized,
      config: {
        maxConcurrentConversations: this.config.maxConcurrentConversations,
        maxAgentsPerConversation: this.config.maxAgentsPerConversation,
        defaultTimeout: this.config.defaultTimeout,
      },
      orchestrator: orchestratorStats,
      registry: registryStats,
    };
  }

  /**
   * Health check
   */
  async healthCheck(): Promise<{
    enabled: boolean;
    initialized: boolean;
    agentRegistry: boolean;
    conversationManager: boolean;
    orchestrator: boolean;
    agentHealth: Record<string, boolean>;
  }> {
    const agentHealth = await this.agentRegistry.healthCheck();

    return {
      enabled: this.config.enabled,
      initialized: this.initialized,
      agentRegistry: this.agentRegistry.getAgentCount() > 0,
      conversationManager: true,
      orchestrator: true,
      agentHealth,
    };
  }

  /**
   * Update orchestration strategy
   */
  updateStrategy(strategy: Partial<OrchestrationStrategy>): void {
    this.orchestrator.updateStrategy(strategy);

    if (this.config.enableLogging) {
      logger.info('[A2A] Updated orchestration strategy:', { strategy });
    }
  }

  /**
   * Get current orchestration strategy
   */
  getStrategy(): OrchestrationStrategy {
    return this.orchestrator.getStrategy();
  }

  /**
   * Enable/disable agent
   */
  setAgentEnabled(agentId: string, enabled: boolean): void {
    this.agentRegistry.setAgentEnabled(agentId, enabled);

    if (this.config.enableLogging) {
      logger.info(`[A2A] Agent ${enabled ? 'enabled' : 'disabled'}`, { agentId });
    }
  }

  /**
   * Get available agents
   */
  getAvailableAgents(): string[] {
    return this.agentRegistry
      .getAvailableAgents()
      .map(agent => agent.getConfig().id);
  }

  /**
   * Get agents by role
   */
  getAgentsByRole(role: AgentRole): string[] {
    return this.agentRegistry
      .getAgentsByRole(role)
      .map(agent => agent.getConfig().id);
  }

  /**
   * Delete conversation
   */
  deleteConversation(conversationId: string): void {
    this.conversationManager.deleteConversation(conversationId);

    if (this.config.enableLogging) {
      logger.info('[A2A] Deleted conversation:', { conversationId });
    }
  }

  /**
   * Get recent conversations
   */
  getRecentConversations(limit: number = 10): ConversationContext[] {
    return this.conversationManager.getRecentConversations(limit);
  }

  /**
   * Search conversations
   */
  searchConversations(query: string): ConversationContext[] {
    return this.conversationManager.searchConversations(query);
  }

  /**
   * Get active conversations
   */
  getActiveConversations(): ConversationContext[] {
    return this.conversationManager.getActiveConversations();
  }

  /**
   * Reset service (for testing)
   */
  reset(): void {
    this.agentRegistry.resetAllAgents();
    this.conversationManager.clear();
    this.initialized = false;

    if (this.config.enableLogging) {
      logger.info('[A2A] Service reset');
    }
  }

  /**
   * Update configuration
   */
  updateConfig(config: Partial<A2AConfig>): void {
    this.config = { ...this.config, ...config };

    if (this.config.enableLogging) {
      logger.info('[A2A] Configuration updated');
    }
  }

  /**
   * Get configuration
   */
  getConfig(): A2AConfig {
    return { ...this.config };
  }

  /**
   * Check if initialized
   */
  isInitialized(): boolean {
    return this.initialized;
  }

  /**
   * Check if enabled
   */
  isEnabled(): boolean {
    return this.config.enabled;
  }
}
