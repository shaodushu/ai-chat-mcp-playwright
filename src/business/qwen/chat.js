/**
 * 千问平台 Playwright 自动化
 *
 * 通义千问基于 Alibaba ChatUI，React SPA。
 * 使用通用选择器适配。
 */
import { BaseChatPlatform } from '../base.js';
import { locateElement, isElementVisible } from '../../platform/utils/dom.js';
import { qwenSelectors, qwenTiming, QWEN_URL } from './config.js';

export class QwenChatPlatform extends BaseChatPlatform {
  constructor(globalConfig = {}) {
    super({
      id: 'qwen',
      displayName: '千问 (tongyi.aliyun.com)',
      targetUrl: QWEN_URL,
      selectors: qwenSelectors,
      timing: qwenTiming,
    }, globalConfig);
  }

  async isLoggedIn() {
    if (!this.page) return false;
    try {
      const url = this.page.url();
      if (url.includes('/login')) return false;

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
    if (!input) throw new Error('找不到聊天输入框，千问页面结构可能已变化');

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

    console.error(`[qwen] 已发送 prompt (${prompt.length} 字符)`);
  }

  async _isStreaming() {
    if (!this.page) return false;
    const stopVisible = await isElementVisible(this.page, this.selectors.stopButton, 1000);
    if (stopVisible) return true;
    return super._isStreaming();
  }
}
