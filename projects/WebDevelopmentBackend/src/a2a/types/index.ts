// ============================================
// src/a2a/types/index.ts
// A2A (Agent-to-Agent) Type Definitions
// ============================================

/**
 * Agent role/specialty
 */
export type AgentRole =
  | 'coordinator'
  | 'researcher'
  | 'developer'
  | 'designer'
  | 'analyst'
  | 'writer'
  | 'qa_tester'
  | 'project_manager'
  | 'cost_estimator'
  | 'technical_architect';

/**
 * Agent status
 */
export type AgentStatus = 'idle' | 'busy' | 'waiting' | 'completed' | 'failed';

/**
 * Message priority
 */
export type MessagePriority = 'low' | 'normal' | 'high' | 'urgent';

/**
 * Task status
 */
export type TaskStatus = 'pending' | 'assigned' | 'in_progress' | 'completed' | 'failed' | 'cancelled';

/**
 * Agent capabilities
 */
export interface AgentCapabilities {
  canResearch: boolean;
  canCode: boolean;
  canDesign: boolean;
  canAnalyze: boolean;
  canWrite: boolean;
  canEstimate: boolean;
  canManageProjects: boolean;
  canTestQA: boolean;
  maxConcurrentTasks: number;
  specializations: string[];
}

/**
 * Agent configuration
 */
export interface AgentConfig {
  id: string;
  name: string;
  role: AgentRole;
  description: string;
  capabilities: AgentCapabilities;
  systemPrompt: string;
  model?: string;
  temperature?: number;
  maxTokens?: number;
  enabled: boolean;
}

/**
 * Agent state
 */
export interface AgentState {
  id: string;
  status: AgentStatus;
  currentTask?: string;
  tasksCompleted: number;
  tasksFailed: number;
  averageResponseTime: number;
  lastActiveAt: Date;
  metadata?: Record<string, any>;
}

/**
 * Agent message
 */
export interface AgentMessage {
  id: string;
  fromAgentId: string;
  toAgentId: string;
  conversationId: string;
  content: string;
  priority: MessagePriority;
  metadata?: Record<string, any>;
  timestamp: Date;
  parentMessageId?: string;
}

/**
 * Agent task
 */
export interface AgentTask {
  id: string;
  conversationId: string;
  assignedToAgentId: string;
  createdByAgentId: string;
  title: string;
  description: string;
  status: TaskStatus;
  priority: MessagePriority;
  dependencies: string[];
  input?: any;
  output?: any;
  error?: string;
  startedAt?: Date;
  completedAt?: Date;
  metadata?: Record<string, any>;
}

/**
 * Conversation context
 */
export interface ConversationContext {
  id: string;
  userId: string;
  projectId?: string;
  goal: string;
  messages: AgentMessage[];
  tasks: AgentTask[];
  participants: string[];
  metadata?: Record<string, any>;
  createdAt: Date;
  updatedAt: Date;
}

/**
 * Agent response
 */
export interface AgentResponse {
  agentId: string;
  content: string;
  reasoning?: string;
  nextActions?: string[];
  delegateTo?: {
    agentId: string;
    task: string;
    reason: string;
  };
  requestsInfo?: {
    from: string;
    question: string;
  }[];
  metadata?: Record<string, any>;
}

/**
 * Orchestration request
 */
export interface OrchestrationRequest {
  userId: string;
  goal: string;
  context?: Record<string, any>;
  projectId?: string;
  preferredAgents?: string[];
  maxAgents?: number;
  timeout?: number;
}

/**
 * Orchestration result
 */
export interface OrchestrationResult {
  conversationId: string;
  success: boolean;
  result?: any;
  summary: string;
  agentsInvolved: string[];
  tasksCompleted: number;
  totalDuration: number;
  conversation: ConversationContext;
  error?: string;
}

/**
 * Agent delegation decision
 */
export interface DelegationDecision {
  shouldDelegate: boolean;
  targetAgentId?: string;
  reason: string;
  taskDescription?: string;
  priority: MessagePriority;
}

/**
 * Task routing rule
 */
export interface TaskRoutingRule {
  taskType: string;
  keywords: string[];
  preferredAgentRole: AgentRole;
  requiredCapabilities: Partial<AgentCapabilities>;
  priority: MessagePriority;
}

/**
 * Agent performance metrics
 */
export interface AgentMetrics {
  agentId: string;
  totalTasks: number;
  completedTasks: number;
  failedTasks: number;
  successRate: number;
  averageResponseTime: number;
  averageTaskDuration: number;
  currentLoad: number;
  lastActive: Date;
}

/**
 * Conversation summary
 */
export interface ConversationSummary {
  conversationId: string;
  goal: string;
  outcome: string;
  agentsParticipated: Array<{
    agentId: string;
    role: AgentRole;
    tasksCompleted: number;
  }>;
  keyDecisions: string[];
  deliverables: Array<{
    type: string;
    description: string;
    output?: any;
  }>;
  duration: number;
  timestamp: Date;
}

/**
 * Agent handoff
 */
export interface AgentHandoff {
  fromAgentId: string;
  toAgentId: string;
  conversationId: string;
  reason: string;
  context: string;
  taskId?: string;
  timestamp: Date;
}

/**
 * Collaboration pattern
 */
export type CollaborationPattern =
  | 'sequential'
  | 'parallel'
  | 'hierarchical'
  | 'peer_to_peer'
  | 'round_robin';

/**
 * Orchestration strategy
 */
export interface OrchestrationStrategy {
  pattern: CollaborationPattern;
  maxParallelAgents: number;
  enableDelegation: boolean;
  enableCollaboration: boolean;
  timeoutPerAgent: number;
  retryFailedTasks: boolean;
  maxRetries: number;
}

/**
 * Agent tool call
 */
export interface AgentToolCall {
  toolName: string;
  parameters: Record<string, any>;
  agentId: string;
  conversationId: string;
  timestamp: Date;
}

/**
 * Agent tool result
 */
export interface AgentToolResult {
  toolName: string;
  success: boolean;
  result?: any;
  error?: string;
  executionTime: number;
  agentId: string;
}

/**
 * Consensus decision
 */
export interface ConsensusDecision {
  question: string;
  votes: Array<{
    agentId: string;
    vote: 'approve' | 'reject' | 'abstain';
    reasoning: string;
  }>;
  finalDecision: 'approved' | 'rejected' | 'no_consensus';
  consensus: boolean;
  timestamp: Date;
}

/**
 * Agent feedback
 */
export interface AgentFeedback {
  fromAgentId: string;
  toAgentId: string;
  conversationId: string;
  taskId: string;
  rating: number;
  feedback: string;
  suggestions?: string[];
  timestamp: Date;
}

/**
 * A2A System configuration
 */
export interface A2AConfig {
  enabled: boolean;
  maxConcurrentConversations: number;
  maxAgentsPerConversation: number;
  defaultTimeout: number;
  enableMetrics: boolean;
  enableLogging: boolean;
  anthropicApiKey: string;
  defaultModel: string;
  orchestrationStrategy: OrchestrationStrategy;
}

/**
 * Agent registry entry
 */
export interface AgentRegistryEntry {
  config: AgentConfig;
  state: AgentState;
  metrics: AgentMetrics;
}

/**
 * Conversation event
 */
export type ConversationEventType =
  | 'conversation_started'
  | 'message_sent'
  | 'task_assigned'
  | 'task_completed'
  | 'task_failed'
  | 'agent_joined'
  | 'agent_left'
  | 'handoff_initiated'
  | 'conversation_completed'
  | 'conversation_failed';

/**
 * Conversation event
 */
export interface ConversationEvent {
  type: ConversationEventType;
  conversationId: string;
  agentId?: string;
  taskId?: string;
  messageId?: string;
  data?: any;
  timestamp: Date;
}
