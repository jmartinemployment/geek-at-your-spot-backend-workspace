import { ConversationContext, Message, ConversationPhase } from '../types/conversation';
import { logger } from '../utils/logger';

export class ConversationStore {
  private readonly conversations: Map<string, ConversationContext> = new Map();

  create(conversationId: string): ConversationContext {
    const context: ConversationContext = {
      conversationId,
      messages: [],
      metadata: {
        requirements: {},
        phase: 'gathering',
        confirmationAttempts: 0,
        readinessScore: 0,
        createdAt: new Date(),
        updatedAt: new Date()
      }
    };

    this.conversations.set(conversationId, context);
    return context;
  }

  get(conversationId: string): ConversationContext | null {
    return this.conversations.get(conversationId) || null;
  }

  addMessage(conversationId: string, message: Message): void {
    const context = this.conversations.get(conversationId);
    if (context) {
      context.messages.push(message);
      context.metadata.updatedAt = new Date();
    }
  }

  updateMetadata(conversationId: string, updates: Partial<ConversationContext['metadata']>): void {
    const context = this.conversations.get(conversationId);
    if (context) {
      context.metadata = { ...context.metadata, ...updates };
      context.metadata.updatedAt = new Date();
    }
  }

  updatePhase(conversationId: string, phase: ConversationPhase): void {
    const context = this.conversations.get(conversationId);
    if (context) {
      context.metadata.phase = phase;
      context.metadata.updatedAt = new Date();
      logger.info('Conversation phase updated', { conversationId, phase });
    }
  }

  incrementConfirmationAttempts(conversationId: string): number {
    const context = this.conversations.get(conversationId);
    if (context) {
      context.metadata.confirmationAttempts++;
      context.metadata.updatedAt = new Date();
      return context.metadata.confirmationAttempts;
    }
    return 0;
  }

  delete(conversationId: string): boolean {
    return this.conversations.delete(conversationId);
  }

  list(): ConversationContext[] {
    return Array.from(this.conversations.values());
  }

  cleanup(): number {
    const oneDayAgo = new Date(Date.now() - 24 * 60 * 60 * 1000);
    let cleaned = 0;

    for (const [id, context] of this.conversations.entries()) {
      if (context.metadata.createdAt < oneDayAgo) {
        this.conversations.delete(id);
        cleaned++;
      }
    }

    return cleaned;
  }
}
