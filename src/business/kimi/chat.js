/**
 * KimiChatPlatform — kimi.com 的 Playwright 自动化实现
 */
import { BaseChatPlatform } from '../base.js';
import { locateElement, isElementVisible } from '../../platform/utils/dom.js';
import { kimiSelectors, kimiTiming, KIMI_URL } from './config.js';

export class KimiChatPlatform extends BaseChatPlatform {
  constructor(globalConfig = {}) {
    super({
      id: 'kimi',
      displayName: 'Kimi (kimi.com)',
      targetUrl: KIMI_URL,
      selectors: kimiSelectors,
      timing: kimiTiming,
    }, globalConfig);
  }

  async isLoggedIn() {
    if (!this.page) return false;

    try {
      // 检查当前 URL，登录页通常包含 /login
      const url = this.page.url();
      if (url.includes('/login')) return false;

      // 先尝试 checkOnly：不导航，只检查当前页面
      const loggedIn = await isElementVisible(this.page, this.selectors.loggedInIndicator, 2000);
      if (loggedIn) return true;

      // 再检查聊天输入框是否可见（已登录的最可靠特征）
      const chatVisible = await isElementVisible(this.page, this.selectors.chatInput, 2000);
      return chatVisible;
    } catch {
      return false;
    }
  }

  async sendPrompt(prompt) {
    if (!this.page) throw new Error('浏览器未启动');

    // 定位输入框
    const input = await locateElement(this.page, this.selectors.chatInput);
    if (!input) {
      throw new Error('找不到聊天输入框，kimi.com 页面结构可能已变化');
    }

    // 清空并输入
    await input.click();
    await new Promise(r => setTimeout(r, 300));

    // 尝试 fill（适用于 textarea），失败则用 type（适用于 contenteditable）
    try {
      await input.fill('');
      await input.fill(prompt);
    } catch {
      await input.click();
      // Ctrl+A 全选 + 输入
      await this.page.keyboard.press('Control+a');
      await this.page.keyboard.type(prompt, { delay: 50 });
    }

    await new Promise(r => setTimeout(r, 500));

    // 定位发送按钮并点击
    const sendBtn = await locateElement(this.page, this.selectors.sendButton);
    if (sendBtn) {
      await sendBtn.click();
    } else {
      // 回退：按 Enter 发送
      await this.page.keyboard.press('Enter');
    }

    console.error(`[kimi] 已发送 prompt (${prompt.length} 字符)`);
  }

  /** Kimi 特有：检查是否有停止按钮来判断流式输出中 */
  async _isStreaming() {
    if (!this.page) return false;
    const stopVisible = await isElementVisible(this.page, this.selectors.stopButton, 1000);
    if (stopVisible) return true;
    return super._isStreaming();
  }

  /**
   * Kimi 的 AI 回复选择器：尝试多种选择器取最新一条 AI 消息。
   */
  async _getResponseText() {
    if (!this.page) return '';

    // 尝试多个 AI 回复选择器
    const selectorsToTry = [
      '[class*="message"][class*="assistant"]:last-of-type',
      '[class*="message"][class*="ai"]:last-of-type',
      '[class*="chat-message"][class*="bot"]:last-of-type',
      '[class*="agent"]:last-of-type [class*="content"]',
      '[class*="response"]:last-of-type',
      '[class*="markdown"]:last-of-type',
    ];

    for (const sel of selectorsToTry) {
      try {
        const el = this.page.locator(sel).last();
        const count = await el.count().catch(() => 0);
        if (count > 0) {
          const text = await el.innerText({ timeout: 2000 }).catch(() => '');
          if (text.trim().length > 0) return text;
        }
      } catch {
        // 尝试下一个
      }
    }

    return '';
  }
}
