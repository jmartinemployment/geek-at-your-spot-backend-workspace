// ============================================
// src/routes/code-execution.ts
// Code Execution API Routes
// ============================================

import { Router, Request, Response } from 'express';
import { CodeExecutionService } from '../code-execution';

const router = Router();

/**
 * POST /api/code-execution/execute
 * Execute code (JavaScript or Python)
 */
router.post('/execute', async (req: Request, res: Response) => {
  try {
    const codeExecService = req.app.locals.codeExecutionService as CodeExecutionService;

    if (!codeExecService) {
      return res.status(400).json({
        error: 'Code Execution service is not available',
      });
    }

    const { language, code, input, context } = req.body;

    if (!language || !code) {
      return res.status(400).json({
        error: 'Missing required fields: language, code',
      });
    }

    const result = await codeExecService.executeCode({
      language,
      code,
      input,
      context,
    });

    return res.status(200).json(result);
  } catch (error: any) {
    return res.status(500).json({
      error: 'Code execution failed',
      message: error.message,
    });
  }
});

/**
 * POST /api/code-execution/calculate-cost
 * Calculate project cost
 */
router.post('/calculate-cost', async (req: Request, res: Response) => {
  try {
    const codeExecService = req.app.locals.codeExecutionService as CodeExecutionService;

    if (!codeExecService) {
      return res.status(400).json({
        error: 'Code Execution service is not available',
      });
    }

    const { projectType, features, complexity, teamSize, hourlyRate } = req.body;

    if (!projectType || !features) {
      return res.status(400).json({
        error: 'Missing required fields: projectType, features',
      });
    }

    const result = codeExecService.calculateCost({
      projectType,
      features,
      complexity,
      teamSize,
      hourlyRate,
    });

    return res.status(200).json(result);
  } catch (error: any) {
    return res.status(500).json({
      error: 'Cost calculation failed',
      message: error.message,
    });
  }
});

/**
 * POST /api/code-execution/generate-timeline
 * Generate project timeline
 */
router.post('/generate-timeline', async (req: Request, res: Response) => {
  try {
    const codeExecService = req.app.locals.codeExecutionService as CodeExecutionService;

    if (!codeExecService) {
      return res.status(400).json({
        error: 'Code Execution service is not available',
      });
    }

    const { phases, teamSize, workHoursPerDay, workDaysPerWeek, buffer } = req.body;

    if (!phases) {
      return res.status(400).json({
        error: 'Missing required field: phases',
      });
    }

    const result = codeExecService.generateTimeline({
      phases,
      teamSize,
      workHoursPerDay,
      workDaysPerWeek,
      buffer,
    });

    return res.status(200).json(result);
  } catch (error: any) {
    return res.status(500).json({
      error: 'Timeline generation failed',
      message: error.message,
    });
  }
});

/**
 * POST /api/code-execution/check-feasibility
 * Check technical feasibility
 */
router.post('/check-feasibility', async (req: Request, res: Response) => {
  try {
    const codeExecService = req.app.locals.codeExecutionService as CodeExecutionService;

    if (!codeExecService) {
      return res.status(400).json({
        error: 'Code Execution service is not available',
      });
    }

    const { projectType, features, technologies, constraints } = req.body;

    if (!projectType || !features || !technologies) {
      return res.status(400).json({
        error: 'Missing required fields: projectType, features, technologies',
      });
    }

    const result = codeExecService.checkFeasibility({
      projectType,
      features,
      technologies,
      constraints,
    });

    return res.status(200).json(result);
  } catch (error: any) {
    return res.status(500).json({
      error: 'Feasibility check failed',
      message: error.message,
    });
  }
});

/**
 * POST /api/code-execution/validate
 * Validate data against rules
 */
router.post('/validate', async (req: Request, res: Response) => {
  try {
    const codeExecService = req.app.locals.codeExecutionService as CodeExecutionService;

    if (!codeExecService) {
      return res.status(400).json({
        error: 'Code Execution service is not available',
      });
    }

    const { data, rules } = req.body;

    if (!data || !rules) {
      return res.status(400).json({
        error: 'Missing required fields: data, rules',
      });
    }

    const result = codeExecService.validate(data, rules);

    return res.status(200).json(result);
  } catch (error: any) {
    return res.status(500).json({
      error: 'Validation failed',
      message: error.message,
    });
  }
});

/**
 * POST /api/code-execution/validate-syntax
 * Validate code syntax without execution
 */
router.post('/validate-syntax', async (req: Request, res: Response) => {
  try {
    const codeExecService = req.app.locals.codeExecutionService as CodeExecutionService;

    if (!codeExecService) {
      return res.status(400).json({
        error: 'Code Execution service is not available',
      });
    }

    const { language, code } = req.body;

    if (!language || !code) {
      return res.status(400).json({
        error: 'Missing required fields: language, code',
      });
    }

    const result = await codeExecService.validateSyntax(language, code);

    return res.status(200).json(result);
  } catch (error: any) {
    return res.status(500).json({
      error: 'Syntax validation failed',
      message: error.message,
    });
  }
});

/**
 * GET /api/code-execution/features
 * Get available features for cost calculation
 */
router.get('/features', (req: Request, res: Response) => {
  try {
    const codeExecService = req.app.locals.codeExecutionService as CodeExecutionService;

    if (!codeExecService) {
      return res.status(400).json({
        error: 'Code Execution service is not available',
      });
    }

    const features = codeExecService.getAvailableFeatures();

    return res.status(200).json({
      features,
      total: features.length,
    });
  } catch (error: any) {
    return res.status(500).json({
      error: 'Failed to get features',
      message: error.message,
    });
  }
});

/**
 * GET /api/code-execution/health
 * Health check for code execution service
 */
router.get('/health', async (req: Request, res: Response) => {
  try {
    const codeExecService = req.app.locals.codeExecutionService as CodeExecutionService;

    if (!codeExecService) {
      return res.status(200).json({
        enabled: false,
        javascript: false,
        python: false,
        calculators: false,
      });
    }

    const health = await codeExecService.healthCheck();

    return res.status(200).json(health);
  } catch (error: any) {
    return res.status(500).json({
      error: 'Health check failed',
      message: error.message,
    });
  }
});

/**
 * GET /api/code-execution/stats
 * Get code execution statistics
 */
router.get('/stats', (req: Request, res: Response) => {
  try {
    const codeExecService = req.app.locals.codeExecutionService as CodeExecutionService;

    if (!codeExecService) {
      return res.status(400).json({
        error: 'Code Execution service is not available',
      });
    }

    const stats = codeExecService.getStats();

    return res.status(200).json(stats);
  } catch (error: any) {
    return res.status(500).json({
      error: 'Failed to get stats',
      message: error.message,
    });
  }
});

export default router;
