/**
 * BaseChatPlatform — AI 对话平台抽象基类
 *
 * 封装公共逻辑：浏览器生命周期、storageState 持久化、互斥锁、流式回复检测。
 * 子类只需实现平台特定的 DOM 交互（选择器不同）。
 */
import fs from 'fs';
import path from 'path';
import { BrowserManager } from '../platform/browser/manager.js';
import { locateElement, isElementVisible } from '../platform/utils/dom.js';

export class BaseChatPlatform {
  /**
   * @param {object} platformConfig - 平台配置 { id, displayName, targetUrl, selectors, timing }
   * @param {object} globalConfig - 全局配置 { storageDir, headless, executablePath }
   */
  constructor(platformConfig, globalConfig = {}) {
    this.id = platformConfig.id;
    this.displayName = platformConfig.displayName;
    this.targetUrl = platformConfig.targetUrl;
    this.selectors = platformConfig.selectors;
    this.timing = platformConfig.timing || {};

    this.storageDir = globalConfig.storageDir || './storage';
    this.browserManager = new BrowserManager({
      headless: globalConfig.headless,
      executablePath: globalConfig.executablePath,
      storageDir: this.storageDir,
    });

    this.browser = null;
    this.context = null;
    this.page = null;
    this._fingerprint = null;
    this._launched = false;
    this._lock = Promise.resolve();
  }

  // ── 子类必须实现 ──────────────────────────────────────────────

  /** 检测当前是否已登录 */
  async isLoggedIn() {
    throw new Error('子类必须实现 isLoggedIn()');
  }

  /** 在聊天输入框中输入 prompt 并发送 */
  async sendPrompt(prompt) {
    throw new Error('子类必须实现 sendPrompt(prompt)');
  }

  // ── 子类可选覆盖 ──────────────────────────────────────────────

  /** 获取流式输出指示器是否可见（子类可覆盖） */
  async _isStreaming() {
    if (this.selectors.streamingIndicator) {
      return isElementVisible(this.page, this.selectors.streamingIndicator, 1000);
    }
    return false;
  }

  /** 点击新建对话按钮（子类可覆盖） */
  async _newConversation() {
    if (this.selectors.newChatButton) {
      const btn = await locateElement(this.page, this.selectors.newChatButton);
      if (btn) {
        await btn.click();
        await new Promise(r => setTimeout(r, 1500));
      }
    }
  }

  // ── 公共方法 ──────────────────────────────────────────────────

  get stateFile() {
    return path.join(this.storageDir, this.id, 'storage_state.json');
  }

  async launch() {
    if (this._launched) return;

    const userDataDir = path.join(this.storageDir, this.id);
    const stateFile = this.stateFile;

    const { context, fingerprint } = await this.browserManager.launchUserContext(this.id, stateFile);
    this.context = context;
    this._fingerprint = fingerprint;
    this.page = await this.context.newPage();

    const navigationTimeout = this.timing.navigationTimeout || 30000;
    this.page.setDefaultTimeout(navigationTimeout);

    console.error(`[${this.id}] 导航到 ${this.targetUrl}`);
    await this.page.goto(this.targetUrl, { waitUntil: 'domcontentloaded', timeout: navigationTimeout });
    await new Promise(r => setTimeout(r, 2000));

    this._launched = true;
    console.error(`[${this.id}] 浏览器启动完成`);
  }

  async close() {
    this._launched = false;
    if (this.page) {
      try {
        if (this.context) {
          await this.context.storageState({ path: this.stateFile });
          console.error(`[${this.id}] 登录状态已保存`);
        }
      } catch (e) { /* ignore */ }
      try { await this.page.close(); } catch (e) { /* ignore */ }
      this.page = null;
    }
    if (this.context) {
      try { await this.context.close(); } catch (e) { /* ignore */ }
      this.context = null;
    }
    // 关闭浏览器进程，释放文件锁
    try {
      await this.browserManager?.closeUserBrowser(this.id);
    } catch (e) { /* ignore */ }
    console.error(`[${this.id}] 浏览器已关闭`);
  }

  /**
   * 等待用户手动登录完成。
   * @param {{ timeout?: number, pollInterval?: number }} opts
   */
  async waitForLogin(opts = {}) {
    const timeout = opts.timeout || this.timing.loginTimeout || 120000;
    const pollInterval = opts.pollInterval || this.timing.loginPollInterval || 2000;
    const start = Date.now();

    while (Date.now() - start < timeout) {
      const loggedIn = await this.isLoggedIn();
      if (loggedIn) {
        console.error(`[${this.id}] 登录成功`);
        return true;
      }
      console.error(`[${this.id}] 等待登录中... (${Math.round((Date.now() - start) / 1000)}s)`);
      await new Promise(r => setTimeout(r, pollInterval));
    }

    throw new Error(`登录超时 (${timeout / 1000}s)`);
  }

  /**
   * 等待 AI 回复完成（基于文本稳定性的流式检测）。
   * @param {{ timeout?: number, pollInterval?: number, stabilityThreshold?: number }} opts
   * @returns {Promise<{ text: string, complete: boolean }>}
   */
  async waitForResponse(opts = {}) {
    const timeout = opts.timeout || this.timing.responseTimeout || 180000;
    const pollInterval = opts.pollInterval || this.timing.pollInterval || 1000;
    const stabilityThreshold = opts.stabilityThreshold || this.timing.stabilityThreshold || 3;
    const firstTokenTimeout = this.timing.firstTokenTimeout || 30000;
    const start = Date.now();

    // 阶段一：等待首个 token（响应开始）
    let responseStarted = false;
    let lastText = '';
    let streamingIterations = 0;

    while (Date.now() - start < firstTokenTimeout) {
      const isStreaming = await this._isStreaming();
      lastText = await this._getResponseText();

      if (lastText.length > 0) {
        responseStarted = true;
        console.error(`[${this.id}] 收到首个响应内容 (${lastText.length} 字符)`);
        break;
      }
      if (isStreaming) {
        streamingIterations++;
        // 持续检测到流式但无内容 → 继续等待最多 firstTokenTimeout
        if (streamingIterations > 10) {
          responseStarted = true;
          console.error(`[${this.id}] 检测到流式输出，继续等待内容`);
          break;
        }
      }
      await new Promise(r => setTimeout(r, 500));
    }

    if (!responseStarted) {
      const partial = await this._getResponseText();
      if (partial.length > 0) {
        return { text: partial, complete: true };
      }
      throw new Error(`AI 在 ${firstTokenTimeout / 1000}s 内未开始回复`);
    }

    // 阶段二：文本稳定性检测
    let stableCount = 0;
    let emptyPollCount = 0;

    while (Date.now() - start < timeout) {
      await new Promise(r => setTimeout(r, pollInterval));

      const currentText = await this._getResponseText();
      const isStreaming = await this._isStreaming();

      if (currentText.length === 0) {
        emptyPollCount++;
        if (emptyPollCount > 30) {
          // 连续30次内容为空 → 可能页面结构有变，返回空结果避免无限等待
          console.error(`[${this.id}] 警告: 连续30次轮询内容为空，强制结束`);
          return { text: '', complete: false, error: 'content_empty' };
        }
      } else {
        emptyPollCount = 0;
      }

      if (currentText !== lastText) {
        stableCount = 0;
        lastText = currentText;
      } else if (!isStreaming && currentText.length > 0) {
        stableCount++;
      }

      if (stableCount >= stabilityThreshold && currentText.length > 0) {
        console.error(`[${this.id}] 回复完成 (${currentText.length} 字符, ${Math.round((Date.now() - start) / 1000)}s)`);
        return { text: currentText, complete: true };
      }
    }

    // 阶段三：超时 — 返回部分文本
    const partial = await this._getResponseText();
    console.error(`[${this.id}] 回复超时(${timeout / 1000}s)，返回部分文本 (${partial.length} 字符)`);
    return { text: partial || '(内容获取失败，请检查页面是否正确加载)', complete: false };
  }

  /**
   * 获取当前页面中 AI 最新的回复文本（子类可覆盖）。
   */
  async _getResponseText() {
    if (!this.page) return '';
    if (!this.selectors.aiResponse) return '';

    try {
      const el = await locateElement(this.page, this.selectors.aiResponse);
      if (!el) return '';
      return await el.innerText({ timeout: 2000 }).catch(() => '');
    } catch {
      return '';
    }
  }

  // ── 互斥锁 ────────────────────────────────────────────────────

  async withLock(fn) {
    let resolve;
    const next = new Promise(r => resolve = r);
    const prev = this._lock;
    this._lock = this._lock.then(() => next);
    return prev.then(async () => {
      try { return await fn(); }
      finally { resolve(); }
    });
  }
}
