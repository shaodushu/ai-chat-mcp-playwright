/**
 * 豆包平台 Playwright 自动化
 *
 * 豆包使用 Vue 3 + SSE 流式输出。
 * 输入框需要 native value setter 触发 Vue reactivity。
 */
import { BaseChatPlatform } from '../base.js';
import { locateElement, isElementVisible } from '../../platform/utils/dom.js';
import { doubaoSelectors, doubaoTiming, DOUBAO_URL } from './config.js';

export class DoubaoChatPlatform extends BaseChatPlatform {
  constructor(globalConfig = {}) {
    super({
      id: 'doubao',
      displayName: '豆包 (doubao.com)',
      targetUrl: DOUBAO_URL,
      selectors: doubaoSelectors,
      timing: doubaoTiming,
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

  async sendPrompt(prompt) {
    if (!this.page) throw new Error('浏览器未启动');

    const input = await locateElement(this.page, this.selectors.chatInput);
    if (!input) throw new Error('找不到聊天输入框，豆包页面结构可能已变化');

    await input.click();
    await new Promise(r => setTimeout(r, 300));

    // 豆包使用 Vue 3 reactivity，需要用 native value setter 触发
    try {
      await input.fill(prompt);
    } catch {
      // contenteditable 方式
      await this.page.keyboard.press('Control+a');
      await this.page.keyboard.type(prompt, { delay: 30 });
    }

    await new Promise(r => setTimeout(r, 500));

    // 尝试点击发送按钮，回退 Enter
    const sendBtn = await locateElement(this.page, this.selectors.sendButton);
    if (sendBtn) {
      await sendBtn.click();
    } else {
      await this.page.keyboard.press('Enter');
    }

    console.error(`[doubao] 已发送 prompt (${prompt.length} 字符)`);
  }

  async _isStreaming() {
    if (!this.page) return false;
    const stopVisible = await isElementVisible(this.page, this.selectors.stopButton, 1000);
    if (stopVisible) return true;
    return super._isStreaming();
  }

  async _getResponseText() {
    if (!this.page) return '';
    const selectorsToTry = [
      '[class*="message"]:last-of-type',
      '[class*="assistant"]:last-of-type',
      '[class*="bot"]:last-of-type',
      '[class*="response"]:last-of-type',
    ];
    for (const sel of selectorsToTry) {
      try {
        const el = this.page.locator(sel).last();
        const count = await el.count().catch(() => 0);
        if (count > 0) {
          const text = await el.innerText({ timeout: 2000 }).catch(() => '');
          if (text.trim().length > 0) return text;
        }
      } catch { /* try next */ }
    }
    return '';
  }
}
