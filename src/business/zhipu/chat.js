/**
 * 智谱平台 Playwright 自动化
 *
 * 智谱清言 (ChatGLM) React SPA。
 * 使用通用选择器适配。
 */
import { BaseChatPlatform } from '../base.js';
import { locateElement, isElementVisible } from '../../platform/utils/dom.js';
import { zhipuSelectors, zhipuTiming, ZHIPU_URL } from './config.js';

export class ZhipuChatPlatform extends BaseChatPlatform {
  constructor(globalConfig = {}) {
    super({
      id: 'zhipu',
      displayName: '智谱 (chatglm.cn)',
      targetUrl: ZHIPU_URL,
      selectors: zhipuSelectors,
      timing: zhipuTiming,
    }, globalConfig);
  }

  async isLoggedIn() {
    if (!this.page) return false;
    try {
      const url = this.page.url();
      if (url.includes('/login') || url.includes('/auth')) return false;

      const loggedIn = await isElementVisible(this.page, this.selectors.loggedInIndicator, 2000);
      if (loggedIn) return true;

      const chatVisible = await isElementVisible(this.page, this.selectors.chatInput, 2000);
      return chatVisible;
    } catch {
      return false;
    }
  }

  async _closeDialog() {
    if (!this.page) return;
    try {
      const dialog = this.page.locator('.claw-guide-dialog, .el-dialog.claw-guide-dialog');
      if (await dialog.count().then(c => c > 0).catch(() => false)) {
        const closeBtn = dialog.locator('.close-btn');
        if (await closeBtn.count().then(c => c > 0).catch(() => false)) {
          await closeBtn.click();
          await new Promise(r => setTimeout(r, 500));
          console.error('[zhipu] 已关闭产品上新弹窗');
        }
      }
    } catch { /* ignore */ }
  }

  async _toggleWebSearch() {
    if (!this.page || !this.selectors.webSearchButton) return;
    try {
      const webBtn = await locateElement(this.page, this.selectors.webSearchButton);
      if (!webBtn) return;
      // 检查是否已选中（有 selected 类名）
      const isSelected = await webBtn.evaluate(el =>
        el.classList.contains('selected') ||
        el.querySelector('.selected') !== null ||
        el.closest('.selected') !== null
      ).catch(() => false);
      if (!isSelected) {
        await webBtn.click();
        await new Promise(r => setTimeout(r, 800));
        console.error('[zhipu] 已开启联网搜索');
      }
    } catch { /* ignore */ }
  }

  async sendPrompt(prompt) {
    if (!this.page) throw new Error('浏览器未启动');

    await this._closeDialog();

    // 开启联网搜索
    await this._toggleWebSearch();

    const input = await locateElement(this.page, this.selectors.chatInput);
    if (!input) throw new Error('找不到聊天输入框，智谱页面结构可能已变化');

    await input.click();
    await new Promise(r => setTimeout(r, 300));

    try {
      await input.fill('');
      await input.fill(prompt);
    } catch {
      await this.page.keyboard.press('Control+a');
      await this.page.keyboard.type(prompt, { delay: 30 });
    }

    await new Promise(r => setTimeout(r, 500));

    const sendBtn = await locateElement(this.page, this.selectors.sendButton);
    if (sendBtn) {
      await sendBtn.click();
    } else {
      await this.page.keyboard.press('Enter');
    }

    console.error(`[zhipu] 已发送 prompt (${prompt.length} 字符)`);
  }

  async _isStreaming() {
    if (!this.page) return false;

    // 1. 检查停止按钮
    const stopVisible = await isElementVisible(this.page, this.selectors.stopButton, 1000);
    if (stopVisible) return true;

    // 2. 检查思考区域 — 如果思考区域存在但还没"思考结束"标记 → 仍在思考
    try {
      const thinkingDone = this.page.locator('.advance-thinking-done_text');
      const doneCount = await thinkingDone.count().catch(() => 0);
      if (doneCount === 0) {
        const thinkingArea = this.page.locator('.advance-thinking');
        const areaCount = await thinkingArea.count().catch(() => 0);
        if (areaCount > 0) return true;
      }
    } catch { /* ignore */ }

    // 3. 检查发送按钮是否禁用（生成中按钮会变灰或变成停止图标）
    try {
      const enterBtn = this.page.locator('.enter-icon-container');
      const enterCount = await enterBtn.count().catch(() => 0);
      if (enterCount > 0) {
        // 检查是否显式禁用（非 empty 状态，因为 empty 是默认状态）
        const isDisabled = await enterBtn.first().evaluate(el =>
          el.getAttribute('disabled') !== null ||
          el.classList.contains('disabled') ||
          el.closest('[class*="disabled"]') !== null
        ).catch(() => false);
        if (isDisabled) return true;
      }

      // 检查是否有停止按钮覆盖层
      const stopBtn = this.page.locator('button:has-text("停止"), [class*="stop"][class*="btn"], .cancel-btn');
      if (await stopBtn.count().then(c => c > 0).catch(() => false)) return true;
    } catch { /* ignore */ }

    return super._isStreaming();
  }

  /**
   * 提取 AI 回复区域的内容 + 引用信源，将 citation 转换为超链接。
   */
  async _getResponseText() {
    if (!this.page) return '';

    // 在页面中克隆 DOM，将 .source-item-num[data-url] 转换为 <a> 链接，返回 HTML
    const result = await this.page.evaluate(() => {
      // 1. 取答案内容
      const answerEl = document.querySelector(
        '.answer:last-of-type .answer-content-wrap:not(.text-advance-thinking-content)'
      ) || document.querySelector('.answer:last-of-type .markdown-body');
      if (!answerEl) return null;

      const clone = answerEl.cloneNode(true);
      // 转换引用标记为可点击链接
      clone.querySelectorAll('.source-item-num[data-url]').forEach(span => {
        const url = span.getAttribute('data-url');
        if (!url) return;
        const a = document.createElement('a');
        a.href = url;
        a.target = '_blank';
        a.rel = 'noopener noreferrer';
        a.textContent = span.textContent || url;
        a.style.textDecoration = 'underline';
        span.parentNode.replaceChild(a, span);
      });

      const contentHtml = clone.innerHTML;

      // 2. 取引用信源
      const sourcesEl = document.querySelector('.sources-tab-container.sources-tab-text-container');
      const sourcesHtml = sourcesEl ? sourcesEl.innerHTML : '';

      const container = document.createElement('div');
      const contentDiv = document.createElement('div');
      contentDiv.className = 'ai-answer-content';
      contentDiv.innerHTML = contentHtml;
      container.appendChild(contentDiv);

      if (sourcesHtml) {
        const sourcesDiv = document.createElement('div');
        sourcesDiv.className = 'ai-sources';
        sourcesDiv.innerHTML = sourcesHtml;
        container.appendChild(sourcesDiv);
      }

      return container.outerHTML;
    });

    if (result && result.length > 100) return `__HTML__${result}`;

    // fallback: 原生 Playwright 选择器
    let html = '';
    const selectors = [
      '.answer:last-of-type .answer-content-wrap:not(.text-advance-thinking-content)',
      '.answer:last-of-type .markdown-body',
    ];
    for (const sel of selectors) {
      try {
        const el = this.page.locator(sel).last();
        if (await el.count().then(c => c > 0).catch(() => false)) {
          const inner = await el.innerHTML({ timeout: 2000 }).catch(() => '');
          if (inner && inner.trim().length > 50) { html = inner; break; }
        }
      } catch { /* try next */ }
    }
    if (!html) return '';
    return `__HTML__<div class="ai-answer-content">${html}</div>`;
  }
}
