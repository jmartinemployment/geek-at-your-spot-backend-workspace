// ============================================
// src/a2a/orchestrator/Orchestrator.ts
// Orchestrator - Coordinates multi-agent workflows
// ============================================

import { AgentRegistry } from '../registry/AgentRegistry';
import { ConversationManager } from '../conversation/ConversationManager';
import { BaseAgent } from '../agents/BaseAgent';
import {
  OrchestrationRequest,
  OrchestrationResult,
  OrchestrationStrategy,
  AgentTask,
  AgentResponse,
} from '../types';
import { toErrorMessage } from '../../utils/errors';

export class Orchestrator {
  private readonly agentRegistry: AgentRegistry;
  private readonly conversationManager: ConversationManager;
  private strategy: OrchestrationStrategy;

  constructor(
    agentRegistry: AgentRegistry,
    conversationManager: ConversationManager,
    strategy?: Partial<OrchestrationStrategy>
  ) {
    this.agentRegistry = agentRegistry;
    this.conversationManager = conversationManager;

    // Default strategy
    this.strategy = {
      pattern: strategy?.pattern || 'hierarchical',
      maxParallelAgents: strategy?.maxParallelAgents || 3,
      enableDelegation: strategy?.enableDelegation ?? true,
      enableCollaboration: strategy?.enableCollaboration ?? true,
      timeoutPerAgent: strategy?.timeoutPerAgent || 30000,
      retryFailedTasks: strategy?.retryFailedTasks ?? true,
      maxRetries: strategy?.maxRetries || 2,
    };
  }

  /**
   * Orchestrate a multi-agent workflow
   */
  async orchestrate(request: OrchestrationRequest): Promise<OrchestrationResult> {
    const startTime = Date.now();

    try {
      // Create conversation
      const conversation = this.conversationManager.createConversation(
        request.userId,
        request.goal,
        request.projectId,
        { request }
      );

      // Get coordinator agent (or best available agent)
      const coordinator = this.getCoordinatorAgent(request);

      if (!coordinator) {
        throw new Error('No coordinator agent available');
      }

      // Initial message to coordinator
      const initialMessage = this.conversationManager.addMessage(
        conversation.id,
        'user',
        coordinator.getConfig().id,
        request.goal,
        'high',
        { context: request.context }
      );

      // Let coordinator process and create plan
      const coordinatorResponse = await coordinator.processMessage(initialMessage);

      // Execute based on strategy pattern
      let result: any;
      switch (this.strategy.pattern) {
        case 'sequential':
          result = await this.executeSequential(
            conversation.id,
            coordinator,
            coordinatorResponse,
            request
          );
          break;

        case 'parallel':
          result = await this.executeParallel(
            conversation.id,
            coordinator,
            coordinatorResponse,
            request
          );
          break;

        case 'hierarchical':
          result = await this.executeHierarchical(
            conversation.id,
            coordinator,
            coordinatorResponse,
            request
          );
          break;

        case 'peer_to_peer':
          result = await this.executePeerToPeer(
            conversation.id,
            coordinator,
            coordinatorResponse,
            request
          );
          break;

        case 'round_robin':
          result = await this.executeRoundRobin(
            conversation.id,
            coordinator,
            coordinatorResponse,
            request
          );
          break;

        default:
          throw new Error(`Unknown collaboration pattern: ${this.strategy.pattern}`);
      }

      // Mark conversation as completed
      this.conversationManager.completeConversation(conversation.id);

      // Generate summary
      const summary = this.conversationManager.generateSummary(conversation.id);

      const totalDuration = Date.now() - startTime;

      return {
        conversationId: conversation.id,
        success: true,
        result,
        summary: summary.outcome,
        agentsInvolved: conversation.participants,
        tasksCompleted: this.conversationManager.getCompletedTasks(conversation.id).length,
        totalDuration,
        conversation: this.conversationManager.getConversation(conversation.id) ?? null,
      };
    } catch (error: unknown) {
      const totalDuration = Date.now() - startTime;

      return {
        conversationId: '',
        success: false,
        summary: 'Orchestration failed',
        agentsInvolved: [],
        tasksCompleted: 0,
        totalDuration,
        conversation: null,
        error: toErrorMessage(error),
      };
    }
  }

  /**
   * Execute sequential pattern (one agent at a time)
   */
  private async executeSequential(
    conversationId: string,
    coordinator: BaseAgent,
    initialResponse: AgentResponse,
    _request: OrchestrationRequest
  ): Promise<any> {
    const results: any[] = [];
    let currentAgent = coordinator;
    let currentResponse = initialResponse;

    // Sequential execution loop
    while (currentResponse.delegateTo || currentResponse.nextActions) {
      // Check for delegation
      if (currentResponse.delegateTo) {
        const nextAgent = this.agentRegistry.getAgent(currentResponse.delegateTo.agentId);

        if (nextAgent?.isAvailable()) {
          // Create task
          const task = this.conversationManager.addTask({
            conversationId,
            assignedToAgentId: nextAgent.getConfig().id,
            createdByAgentId: currentAgent.getConfig().id,
            title: currentResponse.delegateTo.task,
            description: currentResponse.delegateTo.reason,
            priority: 'normal',
            dependencies: [],
            input: { previousResponse: currentResponse },
          });

          // Update task status
          this.conversationManager.updateTaskStatus(conversationId, task.id, 'in_progress');

          // Execute task
          const taskResult = await this.executeTaskWithTimeout(
            nextAgent,
            task,
            this.strategy.timeoutPerAgent
          );

          results.push(taskResult);

          // Update task status
          this.conversationManager.updateTaskStatus(
            conversationId,
            task.id,
            'completed',
            taskResult
          );

          // Send result back to coordinator
          const resultMessage = this.conversationManager.addMessage(
            conversationId,
            nextAgent.getConfig().id,
            coordinator.getConfig().id,
            JSON.stringify(taskResult),
            'normal'
          );

          currentResponse = await coordinator.processMessage(resultMessage);
          currentAgent = coordinator;
        } else {
          break; // No available agent
        }
      } else {
        break; // No more delegations
      }
    }

    return {
      pattern: 'sequential',
      results,
      finalResponse: currentResponse.content,
    };
  }

  /**
   * Execute parallel pattern (multiple agents simultaneously)
   */
  private async executeParallel(
    conversationId: string,
    coordinator: BaseAgent,
    initialResponse: AgentResponse,
    request: OrchestrationRequest
  ): Promise<any> {
    // Parse initial response to identify parallel tasks
    const parallelTasks = this.identifyParallelTasks(initialResponse);

    if (parallelTasks.length === 0) {
      return this.executeSequential(conversationId, coordinator, initialResponse, request);
    }

    // Limit to maxParallelAgents
    const tasksToExecute = parallelTasks.slice(0, this.strategy.maxParallelAgents);

    // Execute tasks in parallel
    const taskPromises = tasksToExecute.map(async taskDesc => {
      const agent = this.agentRegistry.getBestAgentForTask(taskDesc);

      if (!agent) {
        return { error: 'No agent available for task', task: taskDesc };
      }

      const task = this.conversationManager.addTask({
        conversationId,
        assignedToAgentId: agent.getConfig().id,
        createdByAgentId: coordinator.getConfig().id,
        title: taskDesc,
        description: `Parallel task: ${taskDesc}`,
        priority: 'normal',
      });

      this.conversationManager.updateTaskStatus(conversationId, task.id, 'in_progress');

      try {
        const result = await this.executeTaskWithTimeout(
          agent,
          task,
          this.strategy.timeoutPerAgent
        );

        this.conversationManager.updateTaskStatus(conversationId, task.id, 'completed', result);

        return { success: true, task: taskDesc, result };
      } catch (error: unknown) {
        const errorMessage = toErrorMessage(error);
        this.conversationManager.updateTaskStatus(conversationId, task.id, 'failed', null, errorMessage);

        return { success: false, task: taskDesc, error: errorMessage };
      }
    });

    const results = await Promise.all(taskPromises);

    return {
      pattern: 'parallel',
      results,
      successCount: results.filter(r => r.success).length,
      failureCount: results.filter(r => !r.success).length,
    };
  }

  /**
   * Execute hierarchical pattern (coordinator delegates to specialists)
   */
  private async executeHierarchical(
    conversationId: string,
    coordinator: BaseAgent,
    initialResponse: AgentResponse,
    _request: OrchestrationRequest
  ): Promise<any> {
    const results: any[] = [];
    const queue: Array<{ agent: BaseAgent; response: AgentResponse }> = [
      { agent: coordinator, response: initialResponse },
    ];

    while (queue.length > 0) {
      const entry = queue.shift();
      if (!entry) break;
      const { agent, response } = entry;

      // Process delegations
      if (response.delegateTo) {
        const delegateAgent = this.agentRegistry.getAgent(response.delegateTo.agentId);

        if (delegateAgent?.isAvailable()) {
          const task = this.conversationManager.addTask({
            conversationId,
            assignedToAgentId: delegateAgent.getConfig().id,
            createdByAgentId: agent.getConfig().id,
            title: response.delegateTo.task,
            description: response.delegateTo.reason,
            priority: 'normal',
          });

          this.conversationManager.updateTaskStatus(conversationId, task.id, 'in_progress');

          const taskResult = await this.executeTaskWithTimeout(
            delegateAgent,
            task,
            this.strategy.timeoutPerAgent
          );

          results.push(taskResult);

          this.conversationManager.updateTaskStatus(
            conversationId,
            task.id,
            'completed',
            taskResult
          );

          // Delegate agent might have further delegations
          const message = this.conversationManager.addMessage(
            conversationId,
            agent.getConfig().id,
            delegateAgent.getConfig().id,
            response.delegateTo.task,
            'normal'
          );

          const delegateResponse = await delegateAgent.processMessage(message);
          queue.push({ agent: delegateAgent, response: delegateResponse });
        }
      }
    }

    return {
      pattern: 'hierarchical',
      results,
      totalDelegations: results.length,
    };
  }

  /**
   * Execute peer-to-peer pattern (agents collaborate directly)
   */
  private async executePeerToPeer(
    conversationId: string,
    coordinator: BaseAgent,
    initialResponse: AgentResponse,
    request: OrchestrationRequest
  ): Promise<any> {
    // Similar to sequential but allows any agent to talk to any other
    return this.executeSequential(conversationId, coordinator, initialResponse, request);
  }

  /**
   * Execute round-robin pattern (distribute tasks evenly)
   */
  private async executeRoundRobin(
    conversationId: string,
    coordinator: BaseAgent,
    initialResponse: AgentResponse,
    _request: OrchestrationRequest
  ): Promise<any> {
    const tasks = this.identifyParallelTasks(initialResponse);
    const availableAgents = this.agentRegistry.getAvailableAgents();

    if (availableAgents.length === 0) {
      throw new Error('No available agents');
    }

    const results: any[] = [];
    let agentIndex = 0;

    for (const taskDesc of tasks) {
      const agent = availableAgents[agentIndex % availableAgents.length];

      const task = this.conversationManager.addTask({
        conversationId,
        assignedToAgentId: agent.getConfig().id,
        createdByAgentId: coordinator.getConfig().id,
        title: taskDesc,
        description: `Round-robin task: ${taskDesc}`,
        priority: 'normal',
      });

      this.conversationManager.updateTaskStatus(conversationId, task.id, 'in_progress');

      try {
        const result = await this.executeTaskWithTimeout(
          agent,
          task,
          this.strategy.timeoutPerAgent
        );

        results.push({ success: true, task: taskDesc, result });

        this.conversationManager.updateTaskStatus(conversationId, task.id, 'completed', result);
      } catch (error: unknown) {
        const errorMessage = toErrorMessage(error);
        results.push({ success: false, task: taskDesc, error: errorMessage });

        this.conversationManager.updateTaskStatus(
          conversationId,
          task.id,
          'failed',
          null,
          errorMessage
        );
      }

      agentIndex++;
    }

    return {
      pattern: 'round_robin',
      results,
      agentsUsed: availableAgents.length,
    };
  }

  /**
   * Execute task with timeout
   */
  private async executeTaskWithTimeout(
    agent: BaseAgent,
    task: AgentTask,
    timeout: number
  ): Promise<any> {
    return Promise.race([
      agent.executeTask(task),
      new Promise((_, reject) =>
        setTimeout(() => reject(new Error('Task timeout')), timeout)
      ),
    ]);
  }

  /**
   * Get coordinator agent
   */
  private getCoordinatorAgent(_request: OrchestrationRequest): BaseAgent | undefined {
    // Try to get a coordinator agent
    const coordinators = this.agentRegistry.getAgentsByRole('coordinator');

    if (coordinators.length > 0) {
      return coordinators.find(agent => agent.isAvailable()) || coordinators[0];
    }

    // Fallback to project manager
    const projectManagers = this.agentRegistry.getAgentsByRole('project_manager');

    if (projectManagers.length > 0) {
      return projectManagers.find(agent => agent.isAvailable()) || projectManagers[0];
    }

    // Last resort: any available agent
    return this.agentRegistry.getLeastLoadedAgent();
  }

  /**
   * Identify parallel tasks from response
   */
  private identifyParallelTasks(response: AgentResponse): string[] {
    const tasks: string[] = [];

    // Extract from nextActions
    if (response.nextActions) {
      tasks.push(...response.nextActions);
    }

    // Extract from content (look for bullet points or numbered lists)
    const lines = response.content.split('\n');
    for (const line of lines) {
      const trimmed = line.trim();
      if ((/^[-•*]\s+/.exec(trimmed)) || (/^\d+\.\s+/.exec(trimmed))) {
        const task = trimmed.replaceAll(/^[-•*]\s+/g, '').replaceAll(/^\d+\.\s+/g, '');
        if (task.length > 10) {
          // Minimum task length
          tasks.push(task);
        }
      }
    }

    return tasks;
  }

  /**
   * Update orchestration strategy
   */
  updateStrategy(strategy: Partial<OrchestrationStrategy>): void {
    this.strategy = { ...this.strategy, ...strategy };
  }

  /**
   * Get current strategy
   */
  getStrategy(): OrchestrationStrategy {
    return { ...this.strategy };
  }

  /**
   * Get orchestration statistics
   */
  getStats(): {
    totalConversations: number;
    activeConversations: number;
    totalAgents: number;
    availableAgents: number;
    strategy: OrchestrationStrategy;
  } {
    return {
      totalConversations: this.conversationManager.getConversationCount(),
      activeConversations: this.conversationManager.getActiveConversations().length,
      totalAgents: this.agentRegistry.getAgentCount(),
      availableAgents: this.agentRegistry.getAvailableAgents().length,
      strategy: this.strategy,
    };
  }
}
