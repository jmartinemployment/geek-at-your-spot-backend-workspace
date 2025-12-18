import { Router, Request, Response } from 'express';
import { A2AService } from '../a2a';

const router = Router();

/**
 * POST /api/a2a/execute
 * Execute a multi-agent workflow
 */
router.post('/execute', async (req: Request, res: Response) => {
  try {
    const a2aService = req.app.locals.a2aService as A2AService;

    if (!a2aService || !a2aService.isEnabled()) {
      return res.status(400).json({
        error: 'A2A service is not available',
      });
    }

    const { userId, goal, context, projectId, preferredAgents, maxAgents, timeout } = req.body;

    if (!userId || !goal) {
      return res.status(400).json({
        error: 'Missing required fields: userId, goal',
      });
    }

    const result = await a2aService.execute({
      userId,
      goal,
      context,
      projectId,
      preferredAgents,
      maxAgents,
      timeout,
    });

    return res.status(200).json(result);
  } catch (error: any) {
    return res.status(500).json({
      error: 'A2A execution failed',
      message: error.message,
    });
  }
});

/**
 * GET /api/a2a/conversations/:conversationId
 * Get conversation by ID
 */
router.get('/conversations/:conversationId', (req: Request, res: Response) => {
  try {
    const a2aService = req.app.locals.a2aService as A2AService;

    if (!a2aService) {
      return res.status(400).json({
        error: 'A2A service is not available',
      });
    }

    const { conversationId } = req.params;

    if (!conversationId) {
      return res.status(400).json({
        error: 'Missing parameter: conversationId',
      });
    }
    const conversation = a2aService.getConversation(conversationId);

    if (!conversation) {
      return res.status(404).json({
        error: 'Conversation not found',
      });
    }

    return res.status(200).json(conversation);
  } catch (error: any) {
    return res.status(500).json({
      error: 'Failed to get conversation',
      message: error.message,
    });
  }
});

/**
 * GET /api/a2a/conversations/:conversationId/summary
 * Get conversation summary
 */
router.get('/conversations/:conversationId/summary', (req: Request, res: Response) => {
  try {
    const a2aService = req.app.locals.a2aService as A2AService;

    if (!a2aService) {
      return res.status(400).json({
        error: 'A2A service is not available',
      });
    }

    const { conversationId } = req.params;

    if (!conversationId) {
      return res.status(400).json({
        error: 'Missing parameter: conversationId',
      });
    }
    const summary = a2aService.getConversationSummary(conversationId);

    return res.status(200).json(summary);
  } catch (error: any) {
    return res.status(500).json({
      error: 'Failed to get conversation summary',
      message: error.message,
    });
  }
});

/**
 * DELETE /api/a2a/conversations/:conversationId
 * Delete conversation
 */
router.delete('/conversations/:conversationId', (req: Request, res: Response) => {
  try {
    const a2aService = req.app.locals.a2aService as A2AService;

    if (!a2aService) {
      return res.status(400).json({
        error: 'A2A service is not available',
      });
    }

    const { conversationId } = req.params;

    if (!conversationId) {
      return res.status(400).json({
        error: 'Missing parameter: conversationId',
      });
    }
    a2aService.deleteConversation(conversationId);

    return res.status(200).json({
      message: 'Conversation deleted successfully',
    });
  } catch (error: any) {
    return res.status(500).json({
      error: 'Failed to delete conversation',
      message: error.message,
    });
  }
});

/**
 * GET /api/a2a/conversations/user/:userId
 * Get user conversations
 */
router.get('/conversations/user/:userId', (req: Request, res: Response) => {
  try {
    const a2aService = req.app.locals.a2aService as A2AService;

    if (!a2aService) {
      return res.status(400).json({
        error: 'A2A service is not available',
      });
    }

    const { userId } = req.params;

    if (!userId) {
      return res.status(400).json({
        error: 'Missing parameter: userId',
      });
    }
    const conversations = a2aService.getUserConversations(userId);

    return res.status(200).json({
      conversations,
      total: conversations.length,
    });
  } catch (error: any) {
    return res.status(500).json({
      error: 'Failed to get user conversations',
      message: error.message,
    });
  }
});

/**
 * GET /api/a2a/conversations/recent
 * Get recent conversations
 */
router.get('/conversations/recent', (req: Request, res: Response) => {
  try {
    const a2aService = req.app.locals.a2aService as A2AService;

    if (!a2aService) {
      return res.status(400).json({
        error: 'A2A service is not available',
      });
    }

    const limit = parseInt(req.query.limit as string) || 10;
    const conversations = a2aService.getRecentConversations(limit);

    return res.status(200).json({
      conversations,
      total: conversations.length,
    });
  } catch (error: any) {
    return res.status(500).json({
      error: 'Failed to get recent conversations',
      message: error.message,
    });
  }
});

/**
 * GET /api/a2a/conversations/active
 * Get active conversations
 */
router.get('/conversations/active', (req: Request, res: Response) => {
  try {
    const a2aService = req.app.locals.a2aService as A2AService;

    if (!a2aService) {
      return res.status(400).json({
        error: 'A2A service is not available',
      });
    }

    const conversations = a2aService.getActiveConversations();

    return res.status(200).json({
      conversations,
      total: conversations.length,
    });
  } catch (error: any) {
    return res.status(500).json({
      error: 'Failed to get active conversations',
      message: error.message,
    });
  }
});

/**
 * GET /api/a2a/conversations/search
 * Search conversations
 */
router.get('/conversations/search', (req: Request, res: Response) => {
  try {
    const a2aService = req.app.locals.a2aService as A2AService;

    if (!a2aService) {
      return res.status(400).json({
        error: 'A2A service is not available',
      });
    }

    const query = req.query.q as string;

    if (!query) {
      return res.status(400).json({
        error: 'Missing required parameter: q',
      });
    }

    const conversations = a2aService.searchConversations(query);

    return res.status(200).json({
      conversations,
      total: conversations.length,
      query,
    });
  } catch (error: any) {
    return res.status(500).json({
      error: 'Search failed',
      message: error.message,
    });
  }
});

/**
 * GET /api/a2a/agents
 * Get available agents
 */
router.get('/agents', (req: Request, res: Response) => {
  try {
    const a2aService = req.app.locals.a2aService as A2AService;

    if (!a2aService) {
      return res.status(400).json({
        error: 'A2A service is not available',
      });
    }

    const agents = a2aService.getAvailableAgents();

    return res.status(200).json({
      agents,
      total: agents.length,
    });
  } catch (error: any) {
    return res.status(500).json({
      error: 'Failed to get agents',
      message: error.message,
    });
  }
});

/**
 * GET /api/a2a/agents/role/:role
 * Get agents by role
 */
router.get('/agents/role/:role', (req: Request, res: Response) => {
  try {
    const a2aService = req.app.locals.a2aService as A2AService;

    if (!a2aService) {
      return res.status(400).json({
        error: 'A2A service is not available',
      });
    }

    const { role } = req.params;

    if (!role) {
      return res.status(400).json({
        error: 'Missing parameter: role',
      });
    }
    const agents = a2aService.getAgentsByRole(role as any);

    return res.status(200).json({
      role,
      agents,
      total: agents.length,
    });
  } catch (error: any) {
    return res.status(500).json({
      error: 'Failed to get agents by role',
      message: error.message,
    });
  }
});

/**
 * POST /api/a2a/agents/:agentId/enable
 * Enable/disable agent
 */
router.post('/agents/:agentId/enable', (req: Request, res: Response) => {
  try {
    const a2aService = req.app.locals.a2aService as A2AService;

    if (!a2aService) {
      return res.status(400).json({
        error: 'A2A service is not available',
      });
    }

    const { agentId } = req.params;

    if (!agentId) {
      return res.status(400).json({
        error: 'Missing parameter: agentId',
      });
    }
    const { enabled } = req.body;

    if (typeof enabled !== 'boolean') {
      return res.status(400).json({
        error: 'Missing or invalid field: enabled (must be boolean)',
      });
    }

    a2aService.setAgentEnabled(agentId, enabled);

    return res.status(200).json({
      message: `Agent ${enabled ? 'enabled' : 'disabled'} successfully`,
    });
  } catch (error: any) {
    return res.status(500).json({
      error: 'Failed to update agent',
      message: error.message,
    });
  }
});

/**
 * GET /api/a2a/metrics
 * Get agent metrics
 */
router.get('/metrics', (req: Request, res: Response) => {
  try {
    const a2aService = req.app.locals.a2aService as A2AService;

    if (!a2aService) {
      return res.status(400).json({
        error: 'A2A service is not available',
      });
    }

    const metrics = a2aService.getAgentMetrics();

    return res.status(200).json({
      metrics,
      total: metrics.length,
    });
  } catch (error: any) {
    return res.status(500).json({
      error: 'Failed to get metrics',
      message: error.message,
    });
  }
});

/**
 * GET /api/a2a/stats
 * Get A2A statistics
 */
router.get('/stats', (req: Request, res: Response) => {
  try {
    const a2aService = req.app.locals.a2aService as A2AService;

    if (!a2aService) {
      return res.status(400).json({
        error: 'A2A service is not available',
      });
    }

    const stats = a2aService.getStats();

    return res.status(200).json(stats);
  } catch (error: any) {
    return res.status(500).json({
      error: 'Failed to get stats',
      message: error.message,
    });
  }
});

/**
 * GET /api/a2a/health
 * Health check for A2A service
 */
router.get('/health', async (req: Request, res: Response) => {
  try {
    const a2aService = req.app.locals.a2aService as A2AService;

    if (!a2aService) {
      return res.status(200).json({
        enabled: false,
        initialized: false,
      });
    }

    const health = await a2aService.healthCheck();

    return res.status(200).json(health);
  } catch (error: any) {
    return res.status(500).json({
      error: 'Health check failed',
      message: error.message,
    });
  }
});

/**
 * PUT /api/a2a/strategy
 * Update orchestration strategy
 */
router.put('/strategy', (req: Request, res: Response) => {
  try {
    const a2aService = req.app.locals.a2aService as A2AService;

    if (!a2aService) {
      return res.status(400).json({
        error: 'A2A service is not available',
      });
    }

    const strategy = req.body;
    a2aService.updateStrategy(strategy);

    return res.status(200).json({
      message: 'Strategy updated successfully',
      strategy: a2aService.getStrategy(),
    });
  } catch (error: any) {
    return res.status(500).json({
      error: 'Failed to update strategy',
      message: error.message,
    });
  }
});

/**
 * GET /api/a2a/strategy
 * Get current orchestration strategy
 */
router.get('/strategy', (req: Request, res: Response) => {
  try {
    const a2aService = req.app.locals.a2aService as A2AService;

    if (!a2aService) {
      return res.status(400).json({
        error: 'A2A service is not available',
      });
    }

    const strategy = a2aService.getStrategy();

    return res.status(200).json(strategy);
  } catch (error: any) {
    return res.status(500).json({
      error: 'Failed to get strategy',
      message: error.message,
    });
  }
});
export default router;
