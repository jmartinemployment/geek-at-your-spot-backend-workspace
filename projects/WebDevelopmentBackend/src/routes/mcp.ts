// ============================================
// src/routes/mcp.ts
// MCP API Routes (CORRECTED - with explicit returns)
// ============================================

import { Router, Request, Response } from 'express';
import { MCPRegistry } from '../mcp/registry/MCPRegistry';
import { MCPClient } from '../mcp/client/MCPClient';

const router = Router();

/**
 * GET /api/mcp/health
 * Health check for MCP system
 */
router.get('/health', async (req: Request, res: Response) => {
  try {
    const registry = req.app.locals.mcpRegistry as MCPRegistry;

    if (!registry || !registry.isEnabled()) {
      return res.status(200).json({
        status: 'disabled',
        message: 'MCP is not enabled',
      });
    }

    const serverHealth = await registry.healthCheck();
    const allHealthy = Object.values(serverHealth).every((h) => h === true);

    return res.status(200).json({
      status: allHealthy ? 'healthy' : 'degraded',
      servers: serverHealth,
      totalTools: registry.getTools().length,
    });
  } catch (error: any) {
    return res.status(500).json({
      status: 'error',
      message: error.message,
    });
  }
});

/**
 * GET /api/mcp/tools
 * List all available MCP tools
 */
router.get('/tools', (req: Request, res: Response) => {
  try {
    const registry = req.app.locals.mcpRegistry as MCPRegistry;

    if (!registry || !registry.isEnabled()) {
      return res.status(200).json({
        enabled: false,
        tools: [],
      });
    }

    const tools = registry.getTools();

    return res.status(200).json({
      enabled: true,
      total: tools.length,
      tools: tools.map((tool) => ({
        name: tool.name,
        description: tool.description,
        parameters: Object.keys(tool.input_schema.properties),
        required: tool.input_schema.required || [],
      })),
    });
  } catch (error: any) {
    return res.status(500).json({
      error: 'Failed to get tools',
      message: error.message,
    });
  }
});

/**
 * GET /api/mcp/stats
 * Get MCP usage statistics
 */
router.get('/stats', (req: Request, res: Response) => {
  try {
    const registry = req.app.locals.mcpRegistry as MCPRegistry;

    if (!registry || !registry.isEnabled()) {
      return res.status(200).json({
        enabled: false,
        stats: null,
      });
    }

    const stats = registry.getStats();

    return res.status(200).json({
      enabled: true,
      stats,
    });
  } catch (error: any) {
    return res.status(500).json({
      error: 'Failed to get stats',
      message: error.message,
    });
  }
});

/**
 * POST /api/mcp/execute
 * Execute a specific MCP tool
 */
router.post('/execute', async (req: Request, res: Response) => {
  try {
    const registry = req.app.locals.mcpRegistry as MCPRegistry;

    if (!registry || !registry.isEnabled()) {
      return res.status(400).json({
        error: 'MCP is not enabled',
      });
    }

    const { tool_name, params } = req.body;

    if (!tool_name) {
      return res.status(400).json({
        error: 'Missing required field: tool_name',
      });
    }

    if (!registry.hasTool(tool_name)) {
      return res.status(404).json({
        error: `Tool not found: ${tool_name}`,
      });
    }

    const result = await registry.executeTool(tool_name, params || {});

    return res.status(200).json(result);
  } catch (error: any) {
    return res.status(500).json({
      error: 'Tool execution failed',
      message: error.message,
    });
  }
});

/**
 * POST /api/mcp/chat
 * Chat with Claude using MCP tools
 */
router.post('/chat', async (req: Request, res: Response) => {
  try {
    const mcpClient = req.app.locals.mcpClient as MCPClient;

    if (!mcpClient) {
      return res.status(400).json({
        error: 'MCP Client is not available',
      });
    }

    const { messages, system_prompt, max_tool_uses, temperature } = req.body;

    if (!messages || !Array.isArray(messages)) {
      return res.status(400).json({
        error: 'Missing or invalid field: messages (must be an array)',
      });
    }

    const response = await mcpClient.chat(messages, {
      systemPrompt: system_prompt,
      maxToolUses: max_tool_uses,
      temperature,
    });

    return res.status(200).json(response);
  } catch (error: any) {
    return res.status(500).json({
      error: 'Chat failed',
      message: error.message,
    });
  }
});

/**
 * GET /api/mcp/servers
 * List all MCP servers
 */
router.get('/servers', (req: Request, res: Response) => {
  try {
    const registry = req.app.locals.mcpRegistry as MCPRegistry;

    if (!registry || !registry.isEnabled()) {
      return res.status(200).json({
        enabled: false,
        servers: [],
      });
    }

    const servers = registry.getServers();

    return res.status(200).json({
      enabled: true,
      total: servers.length,
      servers: servers.map((server) => ({
        name: server.name,
        description: server.description,
        tools: server.tools.length,
        toolNames: server.tools.map((t) => t.name),
      })),
    });
  } catch (error: any) {
    return res.status(500).json({
      error: 'Failed to get servers',
      message: error.message,
    });
  }
});

/**
 * GET /api/mcp/tool/:toolName
 * Get detailed information about a specific tool
 */
router.get('/tool/:toolName', (req: Request, res: Response) => {
  try {
    const registry = req.app.locals.mcpRegistry as MCPRegistry;

    if (!registry || !registry.isEnabled()) {
      return res.status(400).json({
        error: 'MCP is not enabled',
      });
    }

    const { toolName } = req.params;

    if (!toolName) {
      return res.status(400).json({
        error: 'Missing parameter: toolName',
      });
    }

    const tool = registry.getTool(toolName);

    if (!tool) {
      return res.status(404).json({
        error: `Tool not found: ${toolName}`,
      });
    }

    return res.status(200).json({
      name: tool.name,
      description: tool.description,
      input_schema: tool.input_schema,
    });
  } catch (error: any) {
    return res.status(500).json({
      error: 'Failed to get tool details',
      message: error.message,
    });
  }
});

/**
 * POST /api/mcp/stats/reset
 * Reset MCP statistics
 */
router.post('/stats/reset', (req: Request, res: Response) => {
  try {
    const registry = req.app.locals.mcpRegistry as MCPRegistry;

    if (!registry || !registry.isEnabled()) {
      return res.status(400).json({
        error: 'MCP is not enabled',
      });
    }

    registry.resetStats();

    return res.status(200).json({
      message: 'Statistics reset successfully',
    });
  } catch (error: any) {
    return res.status(500).json({
      error: 'Failed to reset stats',
      message: error.message,
    });
  }
});

export default router;
