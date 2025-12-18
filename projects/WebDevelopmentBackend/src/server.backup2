// ============================================
// src/server.ts
// Main Express Server with ALL Service Integrations
// ============================================

import express from 'express';
import cors from 'cors';
import dotenv from 'dotenv';
import { PrismaClient } from '@prisma/client';

// Import MCP
import { getMCPRegistry, MCPClient } from './mcp';
import mcpRoutes from './routes/mcp';

// Import Code Execution
import { CodeExecutionService } from './code-execution';
import codeExecutionRoutes from './routes/code-execution';

// Import A2A
import { A2AService } from './a2a';
import a2aRoutes from './routes/a2a';

// Import Extended Context
import { ExtendedContextService } from './extended-context';
import extendedContextRoutes from './routes/extended-context';

// Import Batch Processing
import { BatchService } from './routes/batch';
import batchRoutes from './routes/batch';

// Load environment variables
dotenv.config();

// Initialize Express
const app = express();
const port = process.env.PORT || 3000;

// Initialize Prisma
const prisma = new PrismaClient();

// Middleware
app.use(cors());
app.use(express.json());

// ============================================
// ENVIRONMENT VARIABLES
// ============================================

const ANTHROPIC_API_KEY = process.env.ANTHROPIC_API_KEY || '';
const MCP_ENABLED = process.env.MCP_ENABLED === 'true';
const CODE_EXEC_ENABLED = process.env.CODE_EXEC_ENABLED === 'true';
const A2A_ENABLED = process.env.A2A_ENABLED === 'true';
const EXT_CONTEXT_ENABLED = process.env.EXT_CONTEXT_ENABLED === 'true';
const BATCH_ENABLED = process.env.BATCH_ENABLED === 'true';

// ============================================
// SERVICE INITIALIZATION
// ============================================

let mcpRegistry: any;
let mcpClient: any;
let codeExecutionService: CodeExecutionService | undefined;
let a2aService: A2AService | undefined;
let extendedContextService: ExtendedContextService | undefined;
let batchService: BatchService | undefined;

async function initializeServices() {
  console.log('[Server] Initializing services...');

  // ============================================
  // 1. MCP INITIALIZATION
  // ============================================
if (MCP_ENABLED) {
  try {
    console.log('[Server] Initializing MCP...');

    mcpRegistry = await getMCPRegistry({  // ← Add await here!
      prisma: prisma,
      enabled: true,
    });

    if (ANTHROPIC_API_KEY) {
      mcpClient = new MCPClient(mcpRegistry, {
        apiKey: ANTHROPIC_API_KEY,
        model: process.env.ANTHROPIC_MODEL || 'claude-sonnet-4-20250514',
        maxTokens: 4096,
      });
      console.log('[Server] MCP Client initialized');
    }

    console.log('[Server] MCP initialized successfully');
  } catch (error) {
    console.error('[Server] MCP initialization failed:', error);
    console.log('[Server] Continuing without MCP...');
  }
}
   else {
    console.log('[Server] MCP is disabled (set MCP_ENABLED=true to enable)');
  }

  // ============================================
  // 2. CODE EXECUTION INITIALIZATION
  // ============================================
  if (CODE_EXEC_ENABLED) {
    try {
      console.log('[Server] Initializing Code Execution Service...');

      codeExecutionService = new CodeExecutionService({
        enabled: true,
        defaultTimeout: parseInt(process.env.CODE_EXEC_TIMEOUT || '10000'),
        defaultMemoryLimit: parseInt(process.env.CODE_EXEC_MEMORY_LIMIT || '268435456'), // 256MB
        allowedLanguages: ['javascript', 'python'],
        pythonPath: process.env.PYTHON_PATH || 'python3',
        maxConcurrentExecutions: parseInt(process.env.CODE_EXEC_MAX_CONCURRENT || '5'),
      });

      console.log('[Server] Code Execution Service initialized successfully');
    } catch (error) {
      console.error('[Server] Code Execution initialization failed:', error);
      console.log('[Server] Continuing without Code Execution...');
    }
  } else {
    console.log('[Server] Code Execution is disabled (set CODE_EXEC_ENABLED=true to enable)');
  }

  // ============================================
  // 3. A2A INITIALIZATION
  // ============================================
  if (A2A_ENABLED) {
    try {
      console.log('[Server] Initializing A2A Service...');

      a2aService = new A2AService({
        enabled: true,
        maxConcurrentConversations: parseInt(process.env.A2A_MAX_CONVERSATIONS || '10'),
        maxAgentsPerConversation: parseInt(process.env.A2A_MAX_AGENTS || '5'),
        defaultTimeout: parseInt(process.env.A2A_TIMEOUT || '60000'),
        enableMetrics: true,
        enableLogging: true,
        anthropicApiKey: ANTHROPIC_API_KEY,
        defaultModel: process.env.ANTHROPIC_MODEL || 'claude-sonnet-4-20250514',
        orchestrationStrategy: {
          pattern: 'hierarchical',
          maxParallelAgents: 3,
          enableDelegation: true,
          enableCollaboration: true,
          timeoutPerAgent: 30000,
          retryFailedTasks: true,
          maxRetries: 2,
        },
      });

      await a2aService.initialize();

      console.log('[Server] A2A Service initialized successfully');
      console.log(`[Server] A2A Agents: ${a2aService.getAvailableAgents().length} available`);
    } catch (error) {
      console.error('[Server] A2A initialization failed:', error);
      console.log('[Server] Continuing without A2A...');
    }
  } else {
    console.log('[Server] A2A is disabled (set A2A_ENABLED=true to enable)');
  }

  // ============================================
  // 4. EXTENDED CONTEXT INITIALIZATION
  // ============================================
  if (EXT_CONTEXT_ENABLED) {
    try {
      console.log('[Server] Initializing Extended Context Service...');

      extendedContextService = new ExtendedContextService({
        enabled: true,
        defaultMaxTokens: parseInt(process.env.EXT_CONTEXT_MAX_TOKENS || '180000'),
        warningThreshold: parseFloat(process.env.EXT_CONTEXT_WARNING_THRESHOLD || '0.8'),
        autoCompression: process.env.EXT_CONTEXT_AUTO_COMPRESS !== 'false',
        defaultStrategy: (process.env.EXT_CONTEXT_STRATEGY as any) || 'hybrid',
        enableSnapshots: process.env.EXT_CONTEXT_SNAPSHOTS !== 'false',
        snapshotInterval: parseInt(process.env.EXT_CONTEXT_SNAPSHOT_INTERVAL || '10'),
        maxSnapshots: parseInt(process.env.EXT_CONTEXT_MAX_SNAPSHOTS || '5'),
        anthropicApiKey: ANTHROPIC_API_KEY,
        model: process.env.ANTHROPIC_MODEL || 'claude-sonnet-4-20250514',
      });

      await extendedContextService.initialize();

      console.log('[Server] Extended Context Service initialized successfully');
    } catch (error) {
      console.error('[Server] Extended Context initialization failed:', error);
      console.log('[Server] Continuing without Extended Context...');
    }
  } else {
    console.log('[Server] Extended Context is disabled (set EXT_CONTEXT_ENABLED=true to enable)');
  }

  // ============================================
  // 5. BATCH PROCESSING INITIALIZATION
  // ============================================
  if (BATCH_ENABLED) {
    try {
      console.log('[Server] Initializing Batch Service...');

      batchService = new BatchService({
        enabled: true,
        defaultConcurrency: parseInt(process.env.BATCH_CONCURRENCY || '5'),
        defaultMaxRetries: parseInt(process.env.BATCH_MAX_RETRIES || '3'),
        defaultTimeout: parseInt(process.env.BATCH_TIMEOUT || '60000'),
        defaultRetryDelay: parseInt(process.env.BATCH_RETRY_DELAY || '1000'),
        maxJobAge: parseInt(process.env.BATCH_MAX_JOB_AGE || '86400000'), // 24 hours
        enableScheduledJobs: process.env.BATCH_SCHEDULED_JOBS === 'true',
        enableMetrics: process.env.BATCH_METRICS !== 'false',
        storageType: (process.env.BATCH_STORAGE_TYPE as any) || 'memory',
        redisUrl: process.env.REDIS_URL,
      });

      await batchService.initialize();

      console.log('[Server] Batch Service initialized successfully');
    } catch (error) {
      console.error('[Server] Batch initialization failed:', error);
      console.log('[Server] Continuing without Batch...');
    }
  } else {
    console.log('[Server] Batch is disabled (set BATCH_ENABLED=true to enable)');
  }

  // Make services available to routes
  app.locals.mcpRegistry = mcpRegistry;
  app.locals.mcpClient = mcpClient;
  app.locals.codeExecutionService = codeExecutionService;
  app.locals.a2aService = a2aService;
  app.locals.extendedContextService = extendedContextService;
  app.locals.batchService = batchService;

  console.log('[Server] All services initialized');
}

// ============================================
// ROUTES
// ============================================

// Health check endpoint
app.get('/health', async (req, res) => {
  const healthStatus: any = {
    status: 'ok',
    timestamp: new Date().toISOString(),
    database: 'connected',
    mcp: {
      enabled: MCP_ENABLED,
      status: 'unknown',
      tools: 0,
    },
    codeExecution: {
      enabled: CODE_EXEC_ENABLED,
      status: 'unknown',
      javascript: false,
      python: false,
    },
    a2a: {
      enabled: A2A_ENABLED,
      status: 'unknown',
      agents: 0,
    },
    extendedContext: {
      enabled: EXT_CONTEXT_ENABLED,
      status: 'unknown',
      activeWindows: 0,
      averageUsage: 0,
    },
    batch: {
      enabled: BATCH_ENABLED,
      status: 'unknown',
      queueSize: 0,
      processing: 0,
    },
  };

  // Check database
  try {
    await prisma.$queryRaw`SELECT 1`;
  } catch (error) {
    healthStatus.database = 'disconnected';
    healthStatus.status = 'degraded';
  }

  // Check MCP
  if (MCP_ENABLED && mcpRegistry) {
    try {
      const serverHealth = await mcpRegistry.healthCheck();
      const allHealthy = Object.values(serverHealth).every((h) => h === true);
      healthStatus.mcp.status = allHealthy ? 'healthy' : 'degraded';
      healthStatus.mcp.tools = mcpRegistry.getTools().length;

      if (!allHealthy) {
        healthStatus.status = 'degraded';
      }
    } catch (error) {
      healthStatus.mcp.status = 'error';
      healthStatus.status = 'degraded';
    }
  }

  // Check Code Execution
  if (CODE_EXEC_ENABLED && codeExecutionService) {
    try {
      const health = await codeExecutionService.healthCheck();
      healthStatus.codeExecution.status = health.enabled ? 'healthy' : 'disabled';
      healthStatus.codeExecution.javascript = health.javascript;
      healthStatus.codeExecution.python = health.python;
    } catch (error) {
      healthStatus.codeExecution.status = 'error';
      healthStatus.status = 'degraded';
    }
  }

  // Check A2A
  if (A2A_ENABLED && a2aService) {
    try {
      const health = await a2aService.healthCheck();
      healthStatus.a2a.status = health.enabled && health.initialized ? 'healthy' : 'degraded';
      healthStatus.a2a.agents = a2aService.getAvailableAgents().length;

      if (!health.enabled || !health.initialized) {
        healthStatus.status = 'degraded';
      }
    } catch (error) {
      healthStatus.a2a.status = 'error';
      healthStatus.status = 'degraded';
    }
  }

  // Check Extended Context
  if (EXT_CONTEXT_ENABLED && extendedContextService) {
    try {
      const health = await extendedContextService.healthCheck();
      healthStatus.extendedContext.status =
        health.enabled && health.initialized ? 'healthy' : 'degraded';
      healthStatus.extendedContext.activeWindows = health.activeWindows;
      healthStatus.extendedContext.averageUsage = health.averageUsage;

      if (!health.enabled || !health.initialized) {
        healthStatus.status = 'degraded';
      }
    } catch (error) {
      healthStatus.extendedContext.status = 'error';
      healthStatus.status = 'degraded';
    }
  }

  // Check Batch
  if (BATCH_ENABLED && batchService) {
    try {
      const health = await batchService.healthCheck();
      healthStatus.batch.status =
        health.enabled && health.initialized ? 'healthy' : 'degraded';
      healthStatus.batch.queueSize = health.queueHealth.queueSize;
      healthStatus.batch.processing = health.queueHealth.processingCount;

      if (!health.enabled || !health.initialized || !health.queueHealth.healthy) {
        healthStatus.status = 'degraded';
      }
    } catch (error) {
      healthStatus.batch.status = 'error';
      healthStatus.status = 'degraded';
    }
  }

  const statusCode = healthStatus.status === 'ok' ? 200 : 503;
  res.status(statusCode).json(healthStatus);
});

// Register API routes
app.use('/api/mcp', mcpRoutes);
app.use('/api/code-execution', codeExecutionRoutes);
app.use('/api/a2a', a2aRoutes);
app.use('/api/extended-context', extendedContextRoutes);
/* app.use('/api/batch', batchRoutes);
 */
// Root endpoint
app.get('/', (req, res) => {
  res.json({
    message: 'Advanced Backend API',
    version: '1.0.0',
    services: {
      mcp: MCP_ENABLED,
      codeExecution: CODE_EXEC_ENABLED,
      a2a: A2A_ENABLED,
      extendedContext: EXT_CONTEXT_ENABLED,
      batch: BATCH_ENABLED,
    },
    endpoints: {
      health: '/health',
      mcp: '/api/mcp',
      codeExecution: '/api/code-execution',
      a2a: '/api/a2a',
      extendedContext: '/api/extended-context',
      batch: '/api/batch',
    },
  });
});

// ============================================
// GRACEFUL SHUTDOWN
// ============================================

async function gracefulShutdown(signal: string) {
  console.log(`\n[Server] ${signal} received, shutting down gracefully...`);

  // Shutdown Batch Service (wait for jobs to complete)
  if (batchService) {
    console.log('[Server] Shutting down Batch Service...');
    await batchService.shutdown();
  }

  // Close Prisma connection
  await prisma.$disconnect();

  console.log('[Server] Shutdown complete');
  process.exit(0);
}

// Handle shutdown signals
process.on('SIGTERM', () => gracefulShutdown('SIGTERM'));
process.on('SIGINT', () => gracefulShutdown('SIGINT'));

// ============================================
// START SERVER
// ============================================

async function startServer() {
  try {
    // Initialize all services
    await initializeServices();

    // Start Express server
    app.listen(port, () => {
      console.log(`\n===========================================`);
      console.log(`🚀 Server running on port ${port}`);
      console.log(`===========================================`);
      console.log(`📡 Health: http://localhost:${port}/health`);
      console.log(`📚 API: http://localhost:${port}/api`);
      console.log(`===========================================\n`);
    });
  } catch (error) {
    console.error('[Server] Failed to start:', error);
    process.exit(1);
  }
}

// Start the server
startServer();
