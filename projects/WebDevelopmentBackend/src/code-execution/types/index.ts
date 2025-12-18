// ============================================
// src/code-execution/types/index.ts
// Code Execution Type Definitions
// ============================================

/**
 * Supported execution languages
 */
export type ExecutionLanguage = 'javascript' | 'python';

/**
 * Execution context with security constraints
 */
export interface ExecutionContext {
  timeout?: number;
  memoryLimit?: number;
  allowedModules?: string[];
  sandbox?: boolean;
}

/**
 * Code execution request
 */
export interface CodeExecutionRequest {
  language: ExecutionLanguage;
  code: string;
  context?: ExecutionContext;
  input?: any;
}

/**
 * Code execution result
 */
export interface CodeExecutionResult {
  success: boolean;
  output?: any;
  error?: string;
  executionTime: number;
  memoryUsed?: number;
  logs?: string[];
}

/**
 * Cost calculation input
 */
export interface CostCalculationInput {
  projectType: 'website' | 'mobile_app' | 'ecommerce' | 'api' | 'custom';
  features: string[];
  complexity?: 'low' | 'medium' | 'high';
  teamSize?: number;
  hourlyRate?: number;
}

/**
 * Cost breakdown item
 */
export interface CostBreakdownItem {
  category: string;
  description: string;
  hours: number;
  rate: number;
  subtotal: number;
  dependencies?: string[];
}

/**
 * Cost calculation result
 */
export interface CostCalculationResult {
  total: number;
  breakdown: CostBreakdownItem[];
  timeline: TimelineResult;
  assumptions: string[];
  confidence: number;
}

/**
 * Timeline phase
 */
export interface TimelinePhase {
  phase: string;
  description: string;
  durationWeeks: number;
  startWeek: number;
  endWeek: number;
  tasks: TimelineTask[];
  dependencies: string[];
  milestones: string[];
}

/**
 * Timeline task
 */
export interface TimelineTask {
  id: string;
  name: string;
  durationDays: number;
  startDay: number;
  endDay: number;
  dependencies: string[];
  assignedTo?: string;
  status: 'pending' | 'in_progress' | 'completed' | 'blocked';
}

/**
 * Timeline generation input
 */
export interface TimelineInput {
  phases: Array<{
    name: string;
    tasks: Array<{
      name: string;
      estimatedHours: number;
      dependencies?: string[];
    }>;
  }>;
  teamSize?: number;
  workHoursPerDay?: number;
  workDaysPerWeek?: number;
  buffer?: number;
}

/**
 * Timeline result
 */
export interface TimelineResult {
  totalWeeks: number;
  totalDays: number;
  phases: TimelinePhase[];
  criticalPath: string[];
  startDate?: Date;
  endDate?: Date;
  warnings?: string[];
}

/**
 * Technical feasibility check input
 */
export interface FeasibilityCheckInput {
  projectType: string;
  features: string[];
  technologies: string[];
  constraints?: {
    budget?: number;
    timeline?: number;
    teamExperience?: 'junior' | 'mid' | 'senior';
  };
}

/**
 * Feasibility risk
 */
export interface FeasibilityRisk {
  level: 'low' | 'medium' | 'high' | 'critical';
  category: string;
  description: string;
  impact: string;
  mitigation: string;
}

/**
 * Feasibility recommendation
 */
export interface FeasibilityRecommendation {
  priority: 'high' | 'medium' | 'low';
  category: string;
  recommendation: string;
  rationale: string;
  estimatedImpact: string;
}

/**
 * Technical feasibility result
 */
export interface FeasibilityResult {
  feasible: boolean;
  overallScore: number;
  risks: FeasibilityRisk[];
  recommendations: FeasibilityRecommendation[];
  technicalConstraints: string[];
  alternativeApproaches?: string[];
}

/**
 * Validation rule
 */
export interface ValidationRule {
  field: string;
  rule: 'required' | 'min' | 'max' | 'pattern' | 'custom';
  value?: any;
  message: string;
  validator?: (value: any) => boolean;
}

/**
 * Validation result
 */
export interface ValidationResult {
  valid: boolean;
  errors: Array<{
    field: string;
    message: string;
    value?: any;
  }>;
}

/**
 * Dependency graph node
 */
export interface DependencyNode {
  id: string;
  name: string;
  type: 'task' | 'feature' | 'milestone';
  duration: number;
  dependencies: string[];
  dependents: string[];
}

/**
 * Dependency analysis result
 */
export interface DependencyAnalysisResult {
  graph: DependencyNode[];
  criticalPath: string[];
  bottlenecks: string[];
  parallelizable: string[][];
  totalDuration: number;
}

/**
 * Resource allocation
 */
export interface ResourceAllocation {
  resource: string;
  tasks: string[];
  utilizationPercent: number;
  overallocated: boolean;
}

/**
 * Resource planning result
 */
export interface ResourcePlanningResult {
  allocations: ResourceAllocation[];
  conflicts: Array<{
    resource: string;
    conflictingTasks: string[];
    suggestion: string;
  }>;
  recommendations: string[];
}

/**
 * Budget optimization input
 */
export interface BudgetOptimizationInput {
  targetBudget: number;
  currentEstimate: CostCalculationResult;
  priorities: Array<'cost' | 'quality' | 'timeline'>;
  constraints: {
    mustHaveFeatures: string[];
    niceToHaveFeatures: string[];
  };
}

/**
 * Budget optimization suggestion
 */
export interface BudgetOptimizationSuggestion {
  action: 'remove' | 'simplify' | 'defer' | 'outsource';
  target: string;
  savingsEstimate: number;
  impactDescription: string;
  tradeoffs: string[];
}

/**
 * Budget optimization result
 */
export interface BudgetOptimizationResult {
  achievable: boolean;
  optimizedBudget: number;
  suggestions: BudgetOptimizationSuggestion[];
  phasedApproach?: {
    phase: number;
    features: string[];
    cost: number;
  }[];
  riskAssessment: string;
}

/**
 * Code execution service configuration
 */
export interface CodeExecutionConfig {
  enabled: boolean;
  defaultTimeout: number;
  defaultMemoryLimit: number;
  allowedLanguages: ExecutionLanguage[];
  pythonPath?: string;
  maxConcurrentExecutions: number;
}

/**
 * Sandbox configuration
 */
export interface SandboxConfig {
  timeout: number;
  memoryLimit: number;
  allowedModules: string[];
  allowNetworkAccess: boolean;
  allowFileSystem: boolean;
  allowProcessSpawn: boolean;
}
