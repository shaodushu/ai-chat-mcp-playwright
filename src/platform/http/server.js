/**
 * HttpApiServer — 轻量 HTTP API 服务器
 *
 * 为 Web 前端提供 REST API，复用平台实例与 MCP 共享。
 * 使用 Node.js 内置 http 模块，0 额外依赖。
 */
import http from 'http';
import { URL } from 'url';

export class HttpApiServer {
  constructor(platforms, port = 3100, host = '0.0.0.0') {
    this.platforms = platforms;
    this.port = parseInt(process.env.HTTP_PORT || port, 10);
    this.host = process.env.HTTP_HOST || host;
    this.server = null;
    this._routes = [];
    this._registerRoutes();
  }

  _registerRoutes() {
    this._route('GET', '/api/health', this._handleHealth);
    this._route('POST', '/api/:platform/launch', this._handleLaunch);
    this._route('GET', '/api/:platform/status', this._handleStatus);
    this._route('POST', '/api/:platform/chat', this._handleChat);
    this._route('POST', '/api/:platform/logout', this._handleLogout);
  }

  _route(method, pattern, handler) {
    const paramNames = [];
    const regexStr = pattern.replace(/:([a-zA-Z_]+)/g, (_, name) => {
      paramNames.push(name);
      return '([^/]+)';
    });
    this._routes.push({
      method: method.toUpperCase(),
      regex: new RegExp(`^${regexStr}$`),
      paramNames,
      handler,
    });
  }

  _match(method, pathname) {
    const m = method.toUpperCase();
    for (const route of this._routes) {
      if (route.method !== m) continue;
      const match = pathname.match(route.regex);
      if (match) {
        const params = {};
        route.paramNames.forEach((name, i) => {
          params[name] = decodeURIComponent(match[i + 1]);
        });
        return { handler: route.handler.bind(this), params };
      }
    }
    return null;
  }

  _getPlatform(name) {
    const p = this.platforms[name];
    if (!p) throw new Error(`不支持的平台: ${name}`);
    return p;
  }

  start() {
    this.server = http.createServer((req, res) => {
      req.setTimeout(900000, () => {
        if (!res.headersSent) this._json(res, 504, { error: '请求超时' });
        req.destroy();
      });
      this._handle(req, res).catch(err => {
        console.error('[HTTP] 错误:', err.message);
        if (!res.headersSent) this._json(res, 500, { error: err.message });
      });
    });
    this.server.headersTimeout = 900000;
    this.server.requestTimeout = 900000;
    this.server.listen(this.port, this.host, () => {
      console.log(`[HTTP] API 服务运行在 http://${this.host}:${this.port}`);
    });
  }

  async _handle(req, res) {
    res.setHeader('Access-Control-Allow-Origin', '*');
    res.setHeader('Access-Control-Allow-Methods', 'GET, POST, OPTIONS');
    res.setHeader('Access-Control-Allow-Headers', 'Content-Type');
    if (req.method === 'OPTIONS') {
      res.writeHead(204);
      res.end();
      return;
    }
    const url = new URL(req.url, `http://${req.headers.host || 'localhost'}`);
    const match = this._match(req.method, url.pathname);
    if (match) {
      req._query = Object.fromEntries(url.searchParams);
      await match.handler(req, res, match.params);
      return;
    }
    this._json(res, 404, { error: 'Not found' });
  }

  _json(res, status, data) {
    const body = JSON.stringify(data);
    res.setHeader('Content-Type', 'application/json');
    res.writeHead(status);
    res.end(body);
  }

  _body(req) {
    return new Promise((resolve, reject) => {
      let data = '';
      req.on('data', chunk => data += chunk);
      req.on('end', () => {
        try { resolve(data ? JSON.parse(data) : {}); }
        catch (e) { reject(new Error('无效的 JSON 请求体')); }
      });
      req.on('error', reject);
    });
  }

  // ─── Route Handlers ──────────────────────────────────────────

  async _handleHealth(req, res) {
    const statuses = {};
    for (const [name, p] of Object.entries(this.platforms)) {
      statuses[name] = { launched: !!p._launched };
    }
    this._json(res, 200, { status: 'ok', platforms: statuses });
  }

  async _handleLaunch(req, res, params) {
    const platform = this._getPlatform(params.platform);
    // 每次登录都重新打开浏览器，确保用户能看到窗口
    if (platform._launched) {
      await platform.close();
    }
    await platform.launch();
    const loggedIn = await platform.isLoggedIn();
    this._json(res, 200, {
      launched: true,
      loggedIn,
      message: loggedIn
        ? '已登录，可直接发送对话'
        : '浏览器已打开，请在窗口中手动登录后重试检测',
    });
  }

  async _handleStatus(req, res, params) {
    const platform = this._getPlatform(params.platform);
    if (!platform._launched || !platform.page) {
      this._json(res, 200, { loggedIn: false, message: '浏览器未启动，请先调用登录' });
      return;
    }
    const loggedIn = await platform.isLoggedIn();
    this._json(res, 200, { loggedIn });
  }

  async _handleChat(req, res, params) {
    const platform = this._getPlatform(params.platform);
    const body = await this._body(req);
    const prompt = body.prompt;
    const timeout = body.timeout || 180000;

    if (!prompt || !prompt.trim()) {
      this._json(res, 400, { error: 'prompt 不能为空' });
      return;
    }

    const isStream = req._query?.stream === 'true' || body.stream === true;

    await platform.withLock(async () => {
      if (!platform._launched) {
        await platform.launch();
      }
      const loggedIn = await platform.isLoggedIn();
      if (!loggedIn) {
        this._json(res, 400, { error: '未登录，请先调用登录接口' });
        return;
      }

      // 诊断：记录页面状态
      try {
        const url = platform.page?.url() || 'no page';
        const title = await platform.page?.title().catch(() => 'unknown') || 'unknown';
        console.error(`[HTTP] chat/${params.platform} 页面: ${url}, title: ${title}`);
      } catch (e) { /* ignore */ }

      try {
        await platform.sendPrompt(prompt);

        if (isStream) {
          // 流式模式：SSE
          res.setHeader('Content-Type', 'text/event-stream');
          res.setHeader('Cache-Control', 'no-cache');
          res.setHeader('Connection', 'keep-alive');
          res.writeHead(200);
          res.flushHeaders();

          let lastSent = '';
          let htmlMode = false;
          const result = await platform.waitForResponse({ timeout }, (text, delta) => {
            if (text.startsWith('__HTML__')) {
              htmlMode = true;
              text = text.slice(7);
            }
            if (text !== lastSent) {
              lastSent = text;
              const payload = JSON.stringify({ text, delta, html: htmlMode, complete: false });
              res.write(`data: ${payload}\n\n`);
            }
          });

          const resultIsHtml = htmlMode || result.text.startsWith('__HTML__');
          const cleanText = resultIsHtml ? result.text.replace('__HTML__', '') : result.text;
          const finalPayload = JSON.stringify({
            text: cleanText, html: resultIsHtml, complete: true, length: cleanText.length,
          });
          res.write(`data: ${finalPayload}\n\n`);
          res.end();
        } else {
          // 非流式：直接返回完整结果
          const result = await platform.waitForResponse({ timeout });
          const isHtml = result.text.startsWith('__HTML__');
          this._json(res, 200, {
            text: isHtml ? result.text.slice(7) : result.text,
            html: isHtml,
            complete: result.complete,
            length: result.text.length,
          });
        }
      } catch (err) {
        console.error(`[HTTP] chat/${params.platform} 错误:`, err.message, err.stack?.split('\n').slice(0, 3).join(' '));
        if (isStream) {
          res.write(`data: ${JSON.stringify({ error: err.message, complete: true })}\n\n`);
          res.end();
        } else {
          this._json(res, 500, { error: err.message });
        }
      }
    });
  }

  async _handleLogout(req, res, params) {
    const platform = this._getPlatform(params.platform);
    await platform.close();
    this._json(res, 200, { message: '浏览器已关闭，登录状态已保存' });
  }

  stop() {
    if (this.server) {
      this.server.close();
      this.server = null;
    }
  }
}
