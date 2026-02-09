// ============================================
// src/mcp/registry/MCPRegistry.ts
// MCP Registry: Central Tool Management
// ============================================

import { logger } from '../../utils/logger';
import {
  MCPServer,
  MCPTool,
  MCPToolHandler,
  MCPExecutionContext,
  MCPToolResult,
  MCPRegistryConfig,
  ToolExecutionOptions,
  RegistryStats,
} from '../types';
import { toErrorMessage } from '../../utils/errors';
import { ProjectKnowledgeServer } from '../servers/ProjectKnowledgeServer';
import { ServiceCatalogServer } from '../servers/ServiceCatalogServer';
import { PricingServer } from '../servers/PricingServer';

export class MCPRegistry {
  private readonly servers: Map<string, MCPServer> = new Map();
  private readonly tools: Map<string, { server: MCPServer; handler: MCPToolHandler }> = new Map();
  private readonly context: MCPExecutionContext;
  private readonly config: MCPRegistryConfig;

  private stats = {
    totalExecutions: 0,
    successfulExecutions: 0,
    failedExecutions: 0,
    totalExecutionTime: 0,
  };

  constructor(config: MCPRegistryConfig) {
    this.config = config;
    this.context = {
      prisma: config.prisma,
      timeout: config.timeout || 10000,
    };
  }

  async initialize(): Promise<void> {
    if (!this.config.enabled) {
      logger.info('[MCPRegistry] MCP is disabled');
      return;
    }

    try {
      const projectServer = new ProjectKnowledgeServer();
      const serviceServer = new ServiceCatalogServer();
      const pricingServer = new PricingServer();

      await projectServer.initialize(this.context);
      await serviceServer.initialize(this.context);
      await pricingServer.initialize(this.context);

      this.servers.set(projectServer.name, projectServer);
      this.servers.set(serviceServer.name, serviceServer);
      this.servers.set(pricingServer.name, pricingServer);

      for (const server of this.servers.values()) {
        for (const tool of server.tools) {
          const handler = server.handlers.get(tool.name);
          if (handler) {
            this.tools.set(tool.name, { server, handler });
          }
        }
      }

      logger.info(`[MCPRegistry] Initialized with ${this.servers.size} servers and ${this.tools.size} tools`);
    } catch (error) {
      logger.error('[MCPRegistry] Initialization failed:', { error });
      throw error;
    }
  }

  getTools(): MCPTool[] {
    const tools: MCPTool[] = [];
    for (const server of this.servers.values()) {
      tools.push(...server.tools);
    }
    return tools;
  }

  async executeTool(
    toolName: string,
    params: any,
    options: ToolExecutionOptions = {}
  ): Promise<MCPToolResult> {
    const startTime = Date.now();
    this.stats.totalExecutions++;

    try {
      const toolEntry = this.tools.get(toolName);
      if (!toolEntry) {
        this.stats.failedExecutions++;
        return {
          success: false,
          error: `Tool not found: ${toolName}`,
        };
      }

      const execContext: MCPExecutionContext = {
        ...this.context,
        timeout: options.timeout || this.context.timeout,
      };

      const timeoutMs = execContext.timeout || 10000;
      const result = await this.executeWithTimeout(
        toolEntry.handler(params, execContext),
        timeoutMs
      );

      const executionTime = Date.now() - startTime;
      this.stats.totalExecutionTime += executionTime;

      if (result.success) {
        this.stats.successfulExecutions++;
      } else {
        this.stats.failedExecutions++;
      }

      return {
        ...result,
        metadata: {
          ...result.metadata,
          executionTime,
        },
      };
    } catch (error: unknown) {
      this.stats.failedExecutions++;
      const executionTime = Date.now() - startTime;

      return {
        success: false,
        error: `Tool execution failed: ${toErrorMessage(error)}`,
        metadata: {
          executionTime,
        },
      };
    }
  }

  private async executeWithTimeout<T>(
    promise: Promise<T>,
    timeoutMs: number
  ): Promise<T> {
    return Promise.race([
      promise,
      new Promise<T>((_, reject) =>
        setTimeout(() => reject(new Error('Tool execution timeout')), timeoutMs)
      ),
    ]);
  }

  getTool(toolName: string): MCPTool | undefined {
    const toolEntry = this.tools.get(toolName);
    if (!toolEntry) return undefined;
    return toolEntry.server.tools.find((t) => t.name === toolName);
  }

  hasTool(toolName: string): boolean {
    return this.tools.has(toolName);
  }

  getServers(): MCPServer[] {
    return Array.from(this.servers.values());
  }

  getServer(serverName: string): MCPServer | undefined {
    return this.servers.get(serverName);
  }

  async healthCheck(): Promise<Record<string, boolean>> {
    const health: Record<string, boolean> = {};
    for (const [name, server] of this.servers.entries()) {
      try {
        health[name] = await server.healthCheck();
      } catch {
        health[name] = false;
      }
    }
    return health;
  }

  getStats(): RegistryStats {
    const successRate = this.stats.totalExecutions > 0
      ? this.stats.successfulExecutions / this.stats.totalExecutions
      : 0;

    const averageExecutionTime = this.stats.totalExecutions > 0
      ? this.stats.totalExecutionTime / this.stats.totalExecutions
      : 0;

    let projectTools = 0;
    let serviceTools = 0;
    let pricingTools = 0;

    for (const { server } of this.tools.values()) {
      if (server.name === 'ProjectKnowledgeServer') projectTools++;
      if (server.name === 'ServiceCatalogServer') serviceTools++;
      if (server.name === 'PricingServer') pricingTools++;
    }

    return {
      totalTools: this.tools.size,
      projectTools,
      serviceTools,
      pricingTools,
      totalExecutions: this.stats.totalExecutions,
      successRate,
      averageExecutionTime,
    };
  }

  resetStats(): void {
    this.stats = {
      totalExecutions: 0,
      successfulExecutions: 0,
      failedExecutions: 0,
      totalExecutionTime: 0,
    };
  }

  isEnabled(): boolean {
    return this.config.enabled;
  }
}

export async function getMCPRegistry(config: MCPRegistryConfig): Promise<MCPRegistry> {
  const registry = new MCPRegistry(config);
  if (config.enabled) {
    await registry.initialize();
  }
  return registry;
}
