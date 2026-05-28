/**
 * PlatformMcpServer — MCP Server 平台层
 *
 * 通过 ToolRegistry 注册工具，连接 MCP SDK 的 ListTools / CallTool 请求。
 * 工具定义和 handler 由 BusinessModule 提供。
 */
import { Server } from '@modelcontextprotocol/sdk/server/index.js';
import { StdioServerTransport } from '@modelcontextprotocol/sdk/server/stdio.js';
import {
  CallToolRequestSchema,
  ListToolsRequestSchema,
} from '@modelcontextprotocol/sdk/types.js';
import { ToolRegistry } from './registry.js';

export class PlatformMcpServer {
  /**
   * @param {string} serverName
   * @param {string} version
   */
  constructor(serverName, version) {
    this.mcpServer = new Server(
      { name: serverName, version },
      { capabilities: { tools: {} } }
    );
    this.toolRegistry = new ToolRegistry();

    this.mcpServer.onerror = (error) => {
      console.error('[MCP Server Error]', error);
    };

    this._setupHandlers();
  }

  _setupHandlers() {
    this.mcpServer.setRequestHandler(ListToolsRequestSchema, async () => ({
      tools: this.toolRegistry.getDefinitions(),
    }));

    this.mcpServer.setRequestHandler(CallToolRequestSchema, async (request) => {
      const { name, arguments: args } = request.params;
      const handler = this.toolRegistry.getHandler(name);
      if (!handler) {
        return { content: [{ type: 'text', text: `未知工具: ${name}` }], isError: true };
      }
      try {
        return await handler(args);
      } catch (err) {
        return { content: [{ type: 'text', text: `错误: ${err.message}` }], isError: true };
      }
    });
  }

  async run() {
    const transport = new StdioServerTransport();
    await this.mcpServer.connect(transport);
    console.error('MCP Server running on stdio');
  }

  async close() {
    await this.mcpServer.close();
  }
}
