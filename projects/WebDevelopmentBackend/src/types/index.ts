// @ts-nocheck
// ============================================
// src/types/index.ts - Type Definitions
// ============================================
export interface ChatMessage {
  role: 'user' | 'assistant' | 'system';
  content: string;
  timestamp?: Date;
}

export interface LeadInfo {
  name?: string;
  email?: string;
  phone?: string;
  company?: string;
}

export interface ChatRequest {
  messages: ChatMessage[];
  leadInfo?: LeadInfo;
  conversationId?: number;
}

export interface ChatResponse {
  response: string;
  leadId?: number;
  conversationId?: number;
  estimate?: QuoteEstimate;
}

export interface QuoteEstimate {
  projectType: string;
  minBudget: number;
  maxBudget: number;
  timeline: string;
  features: string[];
  description?: string;
}

export interface ApiError {
  error: string;
  code?: string;
  details?: any;
}

// Express Request with custom properties
export interface AuthenticatedRequest extends Express.Request {
  clientIP?: string;
  apiKeyValid?: boolean;
}
