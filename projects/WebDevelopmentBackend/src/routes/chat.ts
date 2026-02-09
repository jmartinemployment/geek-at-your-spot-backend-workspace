// ============================================
// src/routes/chat.ts
// Chat API Routes
// ============================================

import { Router, Request, Response } from 'express';
import { PrismaClient } from '@prisma/client';
import { LeadRepository } from '../repositories/LeadRepository';
import { ConversationRepository } from '../repositories/ConversationRepository';
import { ClaudeService } from '../services/ClaudeService';
import { checkApiKey, validateChatRequest } from '../middleware/security';
import { ChatRequest, ChatResponse } from '../types';
import { logger } from '../utils/logger';

const router = Router();
const prisma = new PrismaClient();
const leadRepo = new LeadRepository(prisma);
const conversationRepo = new ConversationRepository(prisma);
const claudeService = new ClaudeService(process.env.ANTHROPIC_API_KEY ?? '');

/**
 * POST /api/chat
 * Main chat endpoint for GeekQuote AI
 */
router.post(
  '/chat',
  checkApiKey,
  validateChatRequest,
  async (req: Request, res: Response): Promise<void> => {
    try {
      const { messages, leadInfo }: ChatRequest = req.body;

      logger.info('Chat request received', {
        messageCount: messages.length,
        hasLeadInfo: !!leadInfo
      });

      // Find or create lead
      let lead;
      if (leadInfo?.email) {
        lead = await leadRepo.findByEmail(leadInfo.email);

        if (lead) {
          logger.info('Found existing lead', { leadId: lead.id });
        } else {
          logger.info('Creating new lead', { email: leadInfo.email });
          lead = await leadRepo.create({
            name: leadInfo.name || 'Anonymous',
            email: leadInfo.email,
            phone: leadInfo.phone,
            company: leadInfo.company,
            projectDescription: messages[0]?.content || 'Initial inquiry',
            source: 'geek-quote-ai',
            ipAddress: req.ip,
            userAgent: req.headers['user-agent']
          });
        }
      }

      // Get AI response from Claude
      logger.info('Calling Claude API...');
      const aiResult = await claudeService.chat(messages);

      logger.info('Claude response received', {
        hasEstimate: !!aiResult.estimate,
        tokenCount: aiResult.tokenCount
      });

      // Save conversation if we have a lead
      let conversationId: number | undefined;
      if (lead) {
        const conversation = await conversationRepo.create({
          leadId: lead.id,
          messages: [...messages, { role: 'assistant', content: aiResult.response }],
          tokenCount: aiResult.tokenCount,
          cost: claudeService.calculateCost(aiResult.tokenCount)
        });
        conversationId = conversation.id;

        // If we got an estimate, update the lead
        if (aiResult.estimate) {
          logger.info('Updating lead with estimate');
          await leadRepo.addEstimate(lead.id, {
            minBudget: aiResult.estimate.minBudget,
            maxBudget: aiResult.estimate.maxBudget,
            timeline: aiResult.estimate.timeline
          });
        }
      }

      const response: ChatResponse = {
        response: aiResult.response,
        leadId: lead?.id,
        conversationId,
        estimate: aiResult.estimate
      };

      res.json(response);

    } catch (error) {
      logger.error('Chat error:', { error });
      res.status(500).json({
        error: 'Failed to process chat request',
        code: 'CHAT_ERROR'
      });
    }
  }
);

/**
 * GET /api/chat/conversation/:id
 * Get conversation by ID
 */
router.get(
  '/conversation/:id',
  checkApiKey,
  async (req: Request, res: Response): Promise<void> => {
    try {
      const conversationId = Number.parseInt(req.params.id, 10);
      const conversation = await conversationRepo.findById(conversationId);

      if (!conversation) {
        res.status(404).json({
          error: 'Conversation not found',
          code: 'NOT_FOUND'
        });
        return;
      }

      res.json(conversation);
    } catch (error) {
      logger.error('Error fetching conversation:', { error });
      res.status(500).json({
        error: 'Failed to fetch conversation',
        code: 'FETCH_ERROR'
      });
    }
  }
);

export default router;
