// ============================================
// src/a2a/index.ts
// A2A Module Exports
// ============================================

// Export types
export * from './types';

// Export agents
export { BaseAgent } from './agents/BaseAgent';
export {
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
} from './agents/SpecializedAgents';

// Export registry
export { AgentRegistry } from './registry/AgentRegistry';

// Export conversation manager
export { ConversationManager } from './conversation/ConversationManager';

// Export orchestrator
export { Orchestrator } from './orchestrator/Orchestrator';

// Export main service
export { A2AService } from './A2AService';
