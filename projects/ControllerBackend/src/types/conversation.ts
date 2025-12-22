export interface Message {
  role: 'user' | 'assistant';
  content: string;
  timestamp: Date;
}

export interface ConversationContext {
  conversationId: string;
  userId?: string;
  messages: Message[];
  metadata: {
    problemType?: 'web_development' | 'analytics' | 'marketing' | 'website_analytics' | 'general';
    industry?: string;
    requirements: Record<string, any>;
    readinessScore: number;
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
