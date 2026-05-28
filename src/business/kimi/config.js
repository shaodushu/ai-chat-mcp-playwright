/**
 * Kimi 平台配置 — DOM 选择器 + 时间参数
 *
 * 每个选择器包含 primary（语义化定位, 可选）和 fallback（CSS/文本选择器数组）。
 * locateElement() 依次尝试 primary → fallback[0] → fallback[1] → ...
 */

export const KIMI_URL = 'https://www.kimi.com/';

export const kimiSelectors = {
  // ── 登录检测 ──────────────────────────────────────────────────
  /** 登录页/登录按钮可见 → 未登录 */
  loginButton: {
    fallback: [
      'button:has-text("登录")',
      'a:has-text("登录")',
      'div:has-text("手机号登录")',
      '[class*="login"]',
    ],
  },
  /** 已登录标识（头像/用户菜单可见） */
  loggedInIndicator: {
    fallback: [
      '[class*="user-avatar"]',
      '[class*="UserAvatar"]',
      '[class*="avatar"]',
      'img[alt*="avatar"]',
      'button:has-text("退出")',
      '[class*="user-center"]',
    ],
  },

  // ── 聊天交互 ──────────────────────────────────────────────────
  /** 聊天输入框 */
  chatInput: {
    primary: { type: 'placeholder', value: '输入你的问题' },
    fallback: [
      'textarea[placeholder*="问题"]',
      'textarea[placeholder*="输入"]',
      'textarea[placeholder*="提问"]',
      '[contenteditable="true"]',
      'div[placeholder*="输入"]',
      'textarea',
      '[class*="chat-input"] textarea',
      '#chat-input',
    ],
  },
  /** 发送按钮 */
  sendButton: {
    fallback: [
      'button[class*="send"]',
      'button:has-text("发送")',
      '[class*="send-btn"]',
      'button[aria-label*="发送"]',
      'button[aria-label*="send"]',
      '[class*="chat-input"] button',
      'button:has(svg)',
    ],
  },
  /** 新建对话按钮 */
  newChatButton: {
    fallback: [
      'button:has-text("新对话")',
      'button:has-text("新建")',
      'a:has-text("新对话")',
      '[class*="new-chat"]',
      '[class*="sidebar"] button:first-child',
    ],
  },

  // ── AI 回复 ──────────────────────────────────────────────────
  /** AI 最新的回复内容（取最后一个 AI 消息） */
  aiResponse: {
    fallback: [
      '[class*="message"][class*="assistant"]:last-of-type',
      '[class*="message"][class*="ai"]:last-of-type',
      '[class*="chat-message"][class*="bot"]:last-of-type',
      '[class*="agent"]:last-of-type [class*="content"]',
      '[class*="response"]:last-of-type',
      '[class*="kimi-message"][class*="assistant"]:last-of-type',
    ],
  },
  /** 所有 AI 回复消息 */
  allAiMessages: {
    fallback: [
      '[class*="message"][class*="assistant"]',
      '[class*="message"][class*="ai"]',
      '[class*="chat-message"][class*="bot"]',
      '[class*="agent"] [class*="content"]',
      '[class*="response"]',
    ],
  },

  // ── 流式输出检测 ──────────────────────────────────────────────
  /** 停止生成按钮（生成中时可见） */
  stopButton: {
    fallback: [
      'button:has-text("停止")',
      'button:has-text("暂停")',
      '[class*="stop"]',
      '[class*="pause"]',
      'button[aria-label*="停止"]',
      'button[aria-label*="stop"]',
    ],
  },
  /** 流式输出指示器（加载动画/思考中） */
  streamingIndicator: {
    fallback: [
      '[class*="loading"]',
      '[class*="spinner"]',
      '[class*="streaming"]',
      '[class*="typing"]',
      '[class*="thinking"]',
      '[class*="dot"]',
    ],
  },
};

/** 时间参数默认值 */
export const kimiTiming = {
  navigationTimeout: 30000,
  loginTimeout: 120000,
  loginPollInterval: 2000,
  responseTimeout: 120000,
  firstTokenTimeout: 30000,
  pollInterval: 1000,
  stabilityThreshold: 3,
};
