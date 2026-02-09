// ============================================
// src/repositories/ConversationRepository.ts
// ============================================

import { PrismaClient, Conversation } from '@prisma/client';
import { ChatMessage } from '../types';

export class ConversationRepository {
  private readonly prisma: PrismaClient;

  constructor(prisma: PrismaClient) {
    this.prisma = prisma;
  }

  /**
   * Create a new conversation
   */
  async create(data: {
    leadId: number;
    messages: ChatMessage[];
    aiModel?: string;
    tokenCount?: number;
    cost?: number;
  }): Promise<Conversation> {
    return await this.prisma.conversation.create({
      data: {
        leadId: data.leadId,
        messages: data.messages as any, // Prisma Json type
        aiModel: data.aiModel || 'claude-sonnet-4',
        tokenCount: data.tokenCount,
        cost: data.cost
      }
    });
  }

  /**
   * Find conversation by ID
   */
  async findById(id: number): Promise<Conversation | null> {
    return await this.prisma.conversation.findUnique({
      where: { id },
      include: {
        lead: true
      }
    });
  }

  /**
   * Get all conversations for a lead
   */
  async findByLeadId(leadId: number): Promise<Conversation[]> {
    return await this.prisma.conversation.findMany({
      where: { leadId },
      orderBy: { createdAt: 'desc' }
    });
  }

  /**
   * Get the most recent conversation for a lead
   */
  async findLatestByLeadId(leadId: number): Promise<Conversation | null> {
    return await this.prisma.conversation.findFirst({
      where: { leadId },
      orderBy: { createdAt: 'desc' }
    });
  }

  /**
   * Update conversation (add messages)
   */
async appendMessages(
  id: number,
  newMessages: ChatMessage[]
): Promise<Conversation> {
  const conversation = await this.findById(id);

  if (!conversation) {
    throw new Error('Conversation not found');
  }

  const existingMessages = conversation.messages as unknown as ChatMessage[];
  const updatedMessages = [...existingMessages, ...newMessages];

  return await this.prisma.conversation.update({
    where: { id },
    data: {
      messages: updatedMessages as any
    }
  });
}
  /**
   * Get total API cost for a lead
   */
  async getTotalCostByLeadId(leadId: number): Promise<number> {
    const result = await this.prisma.conversation.aggregate({
      where: { leadId },
      _sum: {
        cost: true
      }
    });

    return Number(result._sum.cost || 0);
  }

  /**
   * Get total token usage
   */
  async getTotalTokens(): Promise<number> {
    const result = await this.prisma.conversation.aggregate({
      _sum: {
        tokenCount: true
      }
    });

    return result._sum.tokenCount || 0;
  }
}
