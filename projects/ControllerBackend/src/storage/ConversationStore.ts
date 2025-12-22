import { ConversationContext, Message } from '../types/conversation';

export class ConversationStore {
  private conversations: Map<string, ConversationContext> = new Map();

  create(conversationId: string): ConversationContext {
    const context: ConversationContext = {
      conversationId,
      messages: [],
      metadata: {
        requirements: {},
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

  delete(conversationId: string): boolean {
    return this.conversations.delete(conversationId);
  }

  list(): ConversationContext[] {
    return Array.from(this.conversations.values());
  }

  // Clean up old conversations (older than 24 hours)
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
