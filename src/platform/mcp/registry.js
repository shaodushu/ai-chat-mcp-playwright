/**
 * ToolRegistry — MCP 工具注册表
 *
 * 存储工具定义和对应的 handler，供 PlatformMcpServer 使用。
 */
export class ToolRegistry {
  constructor() {
    this._definitions = [];
    this._handlers = new Map();
  }

  /**
   * @param {{ name: string, description: string, inputSchema: object, handler: Function }} toolDef
   */
  register(toolDef) {
    this._definitions.push({
      name: toolDef.name,
      description: toolDef.description,
      inputSchema: toolDef.inputSchema,
    });
    this._handlers.set(toolDef.name, toolDef.handler);
  }

  registerAll(tools) {
    for (const tool of tools) {
      this.register(tool);
    }
  }

  getDefinitions() {
    return this._definitions;
  }

  getHandler(name) {
    return this._handlers.get(name);
  }
}
