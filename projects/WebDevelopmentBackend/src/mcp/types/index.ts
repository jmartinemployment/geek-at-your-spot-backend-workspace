// ============================================
// src/mcp/types/index.ts
// MCP Type Definitions (Anthropic Spec)
// ============================================

import { PrismaClient } from '@prisma/client';

/**
 * Base MCP Tool Definition (per Anthropic spec)
 */
export interface MCPTool {
  name: string;
  description: string;
  input_schema: {
    type: 'object';
    properties: Record<string, any>;
    required?: string[];
  };
}

/**
 * Tool execution result
 */
export interface MCPToolResult {
  success: boolean;
  data?: any;
  error?: string;
  metadata?: {
    executionTime?: number;
    cached?: boolean;
    source?: string;
  };
}

/**
 * Tool handler function signature
 */
export type MCPToolHandler = (
  params: any,
  context: MCPExecutionContext
) => Promise<MCPToolResult>;

/**
 * Execution context passed to all tool handlers
 */
export interface MCPExecutionContext {
  prisma: PrismaClient;
  userId?: string;
  conversationId?: string;
  timeout?: number;
}

/**
 * MCP Server interface
 */
export interface MCPServer {
  name: string;
  description: string;
  tools: MCPTool[];
  handlers: Map<string, MCPToolHandler>;
  initialize(context: MCPExecutionContext): Promise<void>;
  healthCheck(): Promise<boolean>;
}

/**
 * Project search parameters
 */
export interface ProjectSearchParams {
  query?: string;
  project_type?: 'website' | 'mobile_app' | 'ecommerce' | 'api' | 'custom';
  budget_range?: {
    min?: number;
    max?: number;
  };
  technologies?: string[];
  complexity?: 'low' | 'medium' | 'high';
  date_range?: {
    start?: string;
    end?: string;
  };
  limit?: number;
}

/**
 * Project search result
 */
export interface ProjectSearchResult {
  id: string;
  name: string;
  type: string;
  description: string;
  cost: number;
  duration_weeks: number;
  technologies: string[];
  features: string[];
  client_satisfaction: number;
  completion_date: string;
}

/**
 * Project statistics result
 */
export interface ProjectStatistics {
  total_projects: number;
  by_type: Record<string, number>;
  average_cost_by_type: Record<string, number>;
  average_duration_by_type: Record<string, number>;
  average_satisfaction: number;
  most_used_technologies: Array<{
    name: string;
    count: number;
    success_rate: number;
  }>;
  complexity_distribution: Record<string, number>;
}

/**
 * Technology recommendation
 */
export interface TechnologyRecommendation {
  technology: string;
  confidence: number;
  reasons: string[];
  success_rate: number;
  projects_used_in: number;
  pros: string[];
  cons: string[];
}

/**
 * Service search parameters
 */
export interface ServiceSearchParams {
  query?: string;
  category?: string;
  min_price?: number;
  max_price?: number;
}

/**
 * Service catalog item
 */
export interface ServiceCatalogItem {
  id: string;
  name: string;
  category: string;
  description: string;
  price_range: {
    min: number;
    max: number;
  };
  duration_weeks: number;
  features: string[];
  suitable_for: string[];
}

/**
 * Service recommendation parameters
 */
export interface ServiceRecommendationParams {
  project_description: string;
  budget?: number;
  timeline?: number;
  priorities?: Array<'cost' | 'quality' | 'speed'>;
}

/**
 * Service package calculation parameters
 */
export interface ServicePackageParams {
  service_ids: string[];
  discount_code?: string;
}

/**
 * Service package result
 */
export interface ServicePackageResult {
  services: ServiceCatalogItem[];
  subtotal: number;
  discount: number;
  tax: number;
  total: number;
  estimated_duration_weeks: number;
}

/**
 * Cost estimation parameters
 */
export interface CostEstimationParams {
  project_type: 'website' | 'mobile_app' | 'ecommerce' | 'api' | 'custom';
  features: string[];
  complexity?: 'low' | 'medium' | 'high';
  timeline_weeks?: number;
  team_size?: number;
}

/**
 * Cost estimation result
 */
export interface CostEstimationResult {
  estimated_cost: {
    min: number;
    max: number;
    most_likely: number;
  };
  breakdown: Array<{
    feature: string;
    cost: number;
    hours: number;
  }>;
  timeline: {
    weeks: number;
    phases: Array<{
      name: string;
      duration_weeks: number;
      cost: number;
    }>;
  };
  confidence: number;
  assumptions: string[];
}

/**
 * Feature pricing query
 */
export interface FeaturePricingParams {
  features: string[];
  project_type?: string;
}

/**
 * Pricing comparison parameters
 */
export interface PricingComparisonParams {
  project_type: string;
  features: string[];
  options: Array<'mvp' | 'standard' | 'premium'>;
}

/**
 * Pricing option
 */
export interface PricingOption {
  name: string;
  description: string;
  cost: {
    min: number;
    max: number;
  };
  timeline_weeks: number;
  features_included: string[];
  features_excluded?: string[];
  recommendations: string[];
}

/**
 * Budget optimization parameters
 */
export interface BudgetOptimizationParams {
  target_budget: number;
  project_type: string;
  required_features: string[];
  optional_features?: string[];
}

/**
 * Budget optimization result
 */
export interface BudgetOptimizationResult {
  feasible: boolean;
  suggested_approach: string;
  phases: Array<{
    phase_number: number;
    name: string;
    features: string[];
    cost: number;
    duration_weeks: number;
  }>;
  cost_savings: Array<{
    suggestion: string;
    potential_savings: number;
  }>;
  trade_offs: string[];
}

/**
 * Registry configuration
 */
export interface MCPRegistryConfig {
  enabled: boolean;
  timeout?: number;
  retryAttempts?: number;
  prisma: PrismaClient;
}

/**
 * Tool execution options
 */
export interface ToolExecutionOptions {
  timeout?: number;
  retryOnFailure?: boolean;
  cacheResult?: boolean;
}

/**
 * Registry statistics
 */
export interface RegistryStats {
  totalTools: number;
  projectTools: number;
  serviceTools: number;
  pricingTools: number;
  totalExecutions: number;
  successRate: number;
  averageExecutionTime: number;
}
