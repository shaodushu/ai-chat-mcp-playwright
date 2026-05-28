/**
 * 元宝平台 Playwright 自动化
 *
 * 腾讯元宝基于 Vue 3，支持 Ctrl+Enter 发送。
 */
import { BaseChatPlatform } from '../base.js';
import { locateElement, isElementVisible } from '../../platform/utils/dom.js';
import { yuanbaoSelectors, yuanbaoTiming, YUANBAO_URL } from './config.js';

export class YuanbaoChatPlatform extends BaseChatPlatform {
  constructor(globalConfig = {}) {
    super({
      id: 'yuanbao',
      displayName: '元宝 (yuanbao.tencent.com)',
      targetUrl: YUANBAO_URL,
      selectors: yuanbaoSelectors,
      timing: yuanbaoTiming,
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
    if (!input) throw new Error('找不到聊天输入框，元宝页面结构可能已变化');

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
      // Ctrl+Enter 发送（元宝默认快捷键）
      await this.page.keyboard.press('Control+Enter');
    }

    console.error(`[yuanbao] 已发送 prompt (${prompt.length} 字符)`);
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
      '[class*="content"]:last-of-type',
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
