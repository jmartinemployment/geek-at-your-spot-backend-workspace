import { ConversationStore } from '../storage/ConversationStore';
import { IntentClassifier } from './IntentClassifier';
import { ConversationContext, Message } from '../types/conversation';
import { v4 as uuidv4 } from 'uuid';

export interface ChatRequest {
  conversationId?: string;
  message: string;
  userId?: string;
}

export interface ChatResponse {
  conversationId: string;
  response: string;
  intent?: string;
  confidence?: number;
  suggestedAction?: string;
}

export class ConversationManager {
  private store: ConversationStore;
  private classifier: IntentClassifier;

  constructor(anthropicApiKey: string) {
    this.store = new ConversationStore();
    this.classifier = new IntentClassifier(anthropicApiKey);

    // Cleanup old conversations every hour
    setInterval(() => {
      const cleaned = this.store.cleanup();
      if (cleaned > 0) {
        console.log(`[ConversationManager] Cleaned up ${cleaned} old conversations`);
      }
    }, 60 * 60 * 1000);
  }

  async handleMessage(request: ChatRequest): Promise<ChatResponse> {
    // Get or create conversation
    let context: ConversationContext;
    let conversationId = request.conversationId;

    if (conversationId && this.store.get(conversationId)) {
      context = this.store.get(conversationId)!;
    } else {
      conversationId = uuidv4();
      context = this.store.create(conversationId);
      if (request.userId) {
        context.userId = request.userId;
      }
    }

    // Add user message to history
    const userMessage: Message = {
      role: 'user',
      content: request.message,
      timestamp: new Date()
    };
    this.store.addMessage(conversationId, userMessage);

    // Classify intent
    const history = context.messages.slice(0, -1).map(m => `${m.role}: ${m.content}`);
    const classification = await this.classifier.classifyIntent(request.message, history);

    // Update metadata
    this.store.updateMetadata(conversationId, {
      problemType: classification.primaryIntent
    });

    // Determine response based on confidence
    let response: string;
    let suggestedAction: string | undefined;

    if (classification.confidence >= 70) {
      // High confidence - route to backend
      response = `I understand you need help with ${classification.primaryIntent.replace('_', ' ')}. ${classification.reasoning}`;
      suggestedAction = classification.suggestedBackend;
    } else if (classification.confidence >= 40) {
      // Medium confidence - ask clarifying question
      response = this.generateClarifyingQuestion(classification.primaryIntent, request.message);
    } else {
      // Low confidence - general response
      response = `I'd like to help! Could you tell me more about what you're looking to accomplish? 

Are you interested in:
- Building or improving a website/app
- Analyzing your business data or revenue
- Creating marketing content or improving SEO  
- Optimizing your website's performance`;
    }

    // Add assistant response to history
    const assistantMessage: Message = {
      role: 'assistant',
      content: response,
      timestamp: new Date()
    };
    this.store.addMessage(conversationId, assistantMessage);

    return {
      conversationId,
      response,
      intent: classification.primaryIntent,
      confidence: classification.confidence,
      suggestedAction
    };
  }

  private generateClarifyingQuestion(intent: string, userMessage: string): string {
    const questions: Record<string, string> = {
      web_development: `It sounds like you might be interested in building something. Could you tell me more about:
- Are you looking to build a new website or improve an existing one?
- What type of project is this (e-commerce, business site, app, etc.)?`,
      
      analytics: `It sounds like you want insights into your business data. To help better, could you clarify:
- What type of data are you looking to analyze (revenue, customers, website traffic)?
- What questions are you trying to answer?`,
      
      marketing: `I can help with marketing and content! To give you the best assistance:
- What type of content do you need (blog posts, social media, SEO, emails)?
- What's your goal with this content?`,
      
      website_analytics: `It sounds like you're looking at website performance. Can you tell me:
- What metrics are you concerned about (traffic, bounce rate, conversions)?
- Are you using Google Analytics or another tool?`
    };

    return questions[intent] || `I'd like to help! Could you provide a bit more detail about what you're trying to accomplish?`;
  }

  getConversation(conversationId: string): ConversationContext | null {
    return this.store.get(conversationId);
  }

  getAllConversations(): ConversationContext[] {
    return this.store.list();
  }
}
