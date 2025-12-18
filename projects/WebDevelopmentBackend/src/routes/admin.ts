// ============================================
// src/routes/admin.ts
// Admin API Routes (IP Protected)
// ============================================

import { Router, Request, Response } from 'express';
import { PrismaClient } from '@prisma/client';
import { LeadRepository } from '../repositories/LeadRepository';
import { ConversationRepository } from '../repositories/ConversationRepository';
import { checkApiKey, checkIPWhitelist } from '../middleware/security';

const router = Router();
const prisma = new PrismaClient();
const leadRepo = new LeadRepository(prisma);
const conversationRepo = new ConversationRepository(prisma);

// Apply security to all admin routes
router.use(checkApiKey);
router.use(checkIPWhitelist);

/**
 * GET /api/admin/leads
 * Get all leads with filtering and pagination
 */
router.get('/leads', async (req: Request, res: Response): Promise<void> => {
  try {
    const {
      status,
      source,
      search,
      skip = '0',
      take = '50'
    } = req.query;

    const result = await leadRepo.findAll({
      status: status as any,
      source: source as string,
      search: search as string,
      skip: parseInt(skip as string),
      take: parseInt(take as string)
    });

    res.json(result);
  } catch (error) {
    console.error('Error fetching leads:', error);
    res.status(500).json({
      error: 'Failed to fetch leads',
      code: 'FETCH_ERROR'
    });
  }
});

/**
 * GET /api/admin/leads/:id
 * Get single lead with full details
 */
router.get('/leads/:id', async (req: Request, res: Response): Promise<void> => {
  try {
    const leadId = parseInt(req.params.id);
    const lead = await leadRepo.findById(leadId);

    if (!lead) {
      res.status(404).json({
        error: 'Lead not found',
        code: 'NOT_FOUND'
      });
      return;
    }

    res.json(lead);
  } catch (error) {
    console.error('Error fetching lead:', error);
    res.status(500).json({
      error: 'Failed to fetch lead',
      code: 'FETCH_ERROR'
    });
  }
});

/**
 * PATCH /api/admin/leads/:id/status
 * Update lead status
 */
router.patch('/leads/:id/status', async (req: Request, res: Response): Promise<void> => {
  try {
    const leadId = parseInt(req.params.id);
    const { status } = req.body;

    if (!status) {
      res.status(400).json({
        error: 'Status is required',
        code: 'INVALID_REQUEST'
      });
      return;
    }

    const lead = await leadRepo.updateStatus(leadId, status);
    res.json(lead);
  } catch (error) {
    console.error('Error updating lead status:', error);
    res.status(500).json({
      error: 'Failed to update lead status',
      code: 'UPDATE_ERROR'
    });
  }
});

/**
 * GET /api/admin/stats
 * Get dashboard statistics
 */
router.get('/stats', async (req: Request, res: Response): Promise<void> => {
  try {
    const [
      conversionStats,
      statusCounts,
      recentLeads,
      totalTokens
    ] = await Promise.all([
      leadRepo.getConversionStats(),
      leadRepo.countByStatus(),
      leadRepo.getRecentlyActive(7),
      conversationRepo.getTotalTokens()
    ]);

    res.json({
      conversion: conversionStats,
      statusCounts,
      recentLeads,
      totalTokens
    });
  } catch (error) {
    console.error('Error fetching stats:', error);
    res.status(500).json({
      error: 'Failed to fetch statistics',
      code: 'FETCH_ERROR'
    });
  }
});

/**
 * GET /api/admin/conversations/:leadId
 * Get all conversations for a lead
 */
router.get('/conversations/:leadId', async (req: Request, res: Response): Promise<void> => {
  try {
    const leadId = parseInt(req.params.leadId);
    const conversations = await conversationRepo.findByLeadId(leadId);

    res.json(conversations);
  } catch (error) {
    console.error('Error fetching conversations:', error);
    res.status(500).json({
      error: 'Failed to fetch conversations',
      code: 'FETCH_ERROR'
    });
  }
});

/**
 * DELETE /api/admin/leads/:id
 * Soft delete a lead
 */
router.delete('/leads/:id', async (req: Request, res: Response): Promise<void> => {
  try {
    const leadId = parseInt(req.params.id);
    const lead = await leadRepo.softDelete(leadId);

    res.json({
      message: 'Lead deleted successfully',
      lead
    });
  } catch (error) {
    console.error('Error deleting lead:', error);
    res.status(500).json({
      error: 'Failed to delete lead',
      code: 'DELETE_ERROR'
    });
  }
});

export default router;
