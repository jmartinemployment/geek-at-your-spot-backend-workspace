export interface Message {
  role: 'user' | 'assistant';
  content: string;
  timestamp: Date;
}

export type ConversationPhase = 
  | 'gathering'           // Asking questions, collecting requirements
  | 'confirmation_first'  // First confirmation attempt
  | 'clarifying'          // User said "no" to first confirmation, gathering clarifications
  | 'confirmation_second' // Second (final) confirmation attempt
  | 'human_escalation'    // Needs human review
  | 'complete';           // Requirements confirmed, ready for estimate

export interface ConversationContext {
  conversationId: string;
  userId?: string;
  messages: Message[];
  metadata: {
    problemType?: 'web_development' | 'analytics' | 'marketing' | 'website_analytics' | 'general';
    industry?: string;
    requirements: Record<string, any>;
    phase: ConversationPhase;
    confirmationAttempts: number; // Track how many confirmation attempts (max 2)
    readinessScore: number; // 0-100
    escalationReason?: string;
    createdAt: Date;
    updatedAt: Date;
  };
}

export interface IntentClassification {
  primaryIntent: 'web_development' | 'analytics' | 'marketing' | 'website_analytics' | 'general';
  confidence: number;
  suggestedBackend?: string;
  reasoning: string;
}
