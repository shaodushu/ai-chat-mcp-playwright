/**
 * ai-chat-mcp-playwright 入口
 *
 * 启动 MCP Server + HTTP API，注册所有 AI 平台。
 * 通过 platform 参数动态路由到对应平台。
 */
import 'dotenv/config';
import path from 'path';
import { fileURLToPath } from 'url';
import { PlatformMcpServer } from './platform/mcp/server.js';
import { HttpApiServer } from './platform/http/server.js';
import { createKimiPlatform } from './business/kimi/index.js';
import { createDeepSeekPlatform } from './business/deepseek/index.js';
import { createDoubaoPlatform } from './business/doubao/index.js';
import { createQwenPlatform } from './business/qwen/index.js';
import { createYuanbaoPlatform } from './business/yuanbao/index.js';
import { createZhipuPlatform } from './business/zhipu/index.js';

const __dirname = path.dirname(fileURLToPath(import.meta.url));

const SUPPORTED_PLATFORMS = ['kimi', 'deepseek', 'doubao', 'qwen', 'yuanbao', 'zhipu'];

function createPlatforms(globalConfig) {
  return {
    kimi: createKimiPlatform(globalConfig),
    deepseek: createDeepSeekPlatform(globalConfig),
    doubao: createDoubaoPlatform(globalConfig),
    qwen: createQwenPlatform(globalConfig),
    yuanbao: createYuanbaoPlatform(globalConfig),
    zhipu: createZhipuPlatform(globalConfig),
  };
}

function getPlatform(platforms, name) {
  const p = platforms[name];
  if (!p) {
    throw new Error(`不支持的平台: ${name}。支持的平台: ${SUPPORTED_PLATFORMS.join(', ')}`);
  }
  return p;
}

// ── 注册 MCP 工具 ───────────────────────────────────────────────

function registerTools(registry, platforms) {
  registry.register({
    name: 'ai_login',
    description: `打开指定AI平台并检测登录状态。如未登录，请在浏览器窗口中手动登录（手机验证码或扫码）。支持的平台: ${SUPPORTED_PLATFORMS.join(', ')}`,
    inputSchema: {
      type: 'object',
      properties: {
        platform: {
          type: 'string',
          description: `AI平台标识: ${SUPPORTED_PLATFORMS.join(', ')}`,
        },
        wait: {
          type: 'boolean',
          description: '是否阻塞等待登录完成（默认 false）',
        },
        timeout: {
          type: 'number',
          description: '等待超时毫秒数（默认 120000）',
        },
      },
      required: ['platform'],
    },
    handler: async (args) => {
      const { platform: name, wait, timeout } = args;
      const platform = getPlatform(platforms, name);

      await platform.launch();

      const loggedIn = await platform.isLoggedIn();
      if (loggedIn) {
        return { content: [{ type: 'text', text: `[${name}] 已处于登录状态，无需重新登录。` }] };
      }

      if (wait) {
        await platform.waitForLogin({ timeout });
        return { content: [{ type: 'text', text: `[${name}] 登录成功。登录状态已保存，后续可直接使用 ai_chat。` }] };
      }

      return {
        content: [{
          type: 'text',
          text: `[${name}] 已打开 ${platform.targetUrl}，请在浏览器窗口中手动登录（手机验证码或扫码）。登录完成后可调用 ai_chat。若需等待登录完成，请使用 wait=true 参数。`,
        }],
      };
    },
  });

  registry.register({
    name: 'ai_chat',
    description: `向指定AI平台发送 prompt，等待并返回完整回复。需先调用 ai_login 登录。支持的平台: ${SUPPORTED_PLATFORMS.join(', ')}`,
    inputSchema: {
      type: 'object',
      properties: {
        platform: {
          type: 'string',
          description: `AI平台标识: ${SUPPORTED_PLATFORMS.join(', ')}`,
        },
        prompt: {
          type: 'string',
          description: '发送给AI的指令/问题',
        },
        timeout: {
          type: 'number',
          description: '等待回复超时毫秒数（默认 120000）',
        },
      },
      required: ['platform', 'prompt'],
    },
    handler: async (args) => {
      const { platform: name, prompt, timeout } = args;
      const platform = getPlatform(platforms, name);

      return platform.withLock(async () => {
        if (!platform._launched) {
          await platform.launch();
        }

        const loggedIn = await platform.isLoggedIn();
        if (!loggedIn) {
          return {
            content: [{ type: 'text', text: `[${name}] 未登录，请先调用 ai_login 登录。` }],
            isError: true,
          };
        }

        try {
          await platform.sendPrompt(prompt);
        } catch (err) {
          return {
            content: [{ type: 'text', text: `[${name}] 发送 prompt 失败: ${err.message}` }],
            isError: true,
          };
        }

        try {
          const result = await platform.waitForResponse({ timeout });
          const status = result.complete ? '' : ' (部分回复，可能未完成)';
          return {
            content: [{ type: 'text', text: result.text + status }],
          };
        } catch (err) {
          return {
            content: [{ type: 'text', text: `[${name}] 获取回复失败: ${err.message}` }],
            isError: true,
          };
        }
      });
    },
  });

  registry.register({
    name: 'ai_logout',
    description: `关闭指定平台的浏览器并清除登录状态。支持的平台: ${SUPPORTED_PLATFORMS.join(', ')}`,
    inputSchema: {
      type: 'object',
      properties: {
        platform: {
          type: 'string',
          description: `AI平台标识: ${SUPPORTED_PLATFORMS.join(', ')}`,
        },
      },
      required: ['platform'],
    },
    handler: async (args) => {
      const { platform: name } = args;
      const platform = getPlatform(platforms, name);

      await platform.close();
      return { content: [{ type: 'text', text: `[${name}] 浏览器已关闭，登录状态已保存。` }] };
    },
  });
}

// ── 入口 ────────────────────────────────────────────────────────

async function main() {
  const globalConfig = {
    storageDir: process.env.STORAGE_DIR || path.join(__dirname, '..', 'storage'),
    headless: process.env.HEADLESS === 'true',
    executablePath: process.env.BROWSER_EXECUTABLE_PATH || '',
  };

  const mcpServer = new PlatformMcpServer('ai-chat-mcp', '0.1.0');
  const platforms = createPlatforms(globalConfig);

  registerTools(mcpServer.toolRegistry, platforms);

  const shutdown = async () => {
    console.error('\n[Server] 正在关闭...');
    for (const [, platform] of Object.entries(platforms)) {
      try { await platform.close(); } catch (e) { /* ignore */ }
    }
    await mcpServer.close();
    process.exit(0);
  };

  process.on('SIGINT', shutdown);
  process.on('SIGTERM', shutdown);

  console.error(`[Server] ai-chat-mcp v0.1.0 启动`);
  console.error(`[Server] 支持的平台: ${SUPPORTED_PLATFORMS.join(', ')}`);
  console.error(`[Server] 已注册平台: ${Object.keys(platforms).filter(k => platforms[k]).join(', ')}`);

  const httpServer = new HttpApiServer(platforms);
  httpServer.start();

  await mcpServer.run();
}

main().catch((err) => {
  console.error('致命错误:', err);
  process.exit(1);
});
