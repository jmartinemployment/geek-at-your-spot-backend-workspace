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

    setInterval(() => {
      const cleaned = this.store.cleanup();
      if (cleaned > 0) {
        console.log(`[ConversationManager] Cleaned up ${cleaned} old conversations`);
      }
    }, 60 * 60 * 1000);
  }

  async handleMessage(request: ChatRequest): Promise<ChatResponse> {
    let context: ConversationContext;
    let conversationId = request.conversationId;
    let isNewConversation = false;

    if (conversationId && this.store.get(conversationId)) {
      context = this.store.get(conversationId)!;
    } else {
      conversationId = uuidv4();
      context = this.store.create(conversationId);
      isNewConversation = true;
      if (request.userId) {
        context.userId = request.userId;
      }
    }

    const userMessage: Message = {
      role: 'user',
      content: request.message,
      timestamp: new Date()
    };
    this.store.addMessage(conversationId, userMessage);

    const history = context.messages.slice(0, -1).map(m => `${m.role}: ${m.content}`);
    const classification = await this.classifier.classifyIntent(request.message, history);

    this.store.updateMetadata(conversationId, {
      problemType: classification.primaryIntent
    });

    let response: string;
    let suggestedAction: string | undefined;

    // Check if this is a follow-up message with context
    if (!isNewConversation && history.length > 0) {
      // This is a follow-up - acknowledge their additional details
      response = `Great! Thanks for those details. ${request.message}. Let me gather a few more things to provide an accurate estimate. 

Could you also tell me:
- What's your timeline for this project?
- Do you have a budget range in mind?
- Any specific design preferences or reference sites?`;
      suggestedAction = classification.suggestedBackend;
    } else if (classification.confidence >= 70) {
      // First message with high confidence
      const serviceMap: Record<string, string> = {
        'web_development': 'website or application development',
        'analytics': 'business analytics and insights',
        'marketing': 'marketing and content creation',
        'website_analytics': 'website performance optimization'
      };
      
      const serviceName = serviceMap[classification.primaryIntent] || 'your project';
      
      response = `I can help you with ${serviceName}! Let me gather some details to provide an accurate estimate. What specific features or goals do you have in mind?`;
      suggestedAction = classification.suggestedBackend;
    } else if (classification.confidence >= 40) {
      response = this.generateClarifyingQuestion(classification.primaryIntent, request.message);
    } else {
      response = `I'd like to help! Could you tell me more about what you're looking to accomplish? 

Are you interested in:
- Building or improving a website/app
- Analyzing your business data or revenue
- Creating marketing content or improving SEO  
- Optimizing your website's performance`;
    }

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
