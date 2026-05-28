export const DEEPSEEK_URL = 'https://chat.deepseek.com/';

export const deepseekSelectors = {
  loginButton: {
    fallback: [
      'button:has-text("登录")',
      'button:has-text("Log in")',
      'button:has-text("Sign in")',
      'a:has-text("登录")',
      '[class*="login"]',
    ],
  },
  loggedInIndicator: {
    fallback: [
      '[class*="avatar"]',
      '[class*="user-avatar"]',
      'img[alt*="avatar"]',
      '[class*="user-info"]',
      'button:has-text("退出")',
    ],
  },
  chatInput: {
    fallback: [
      '#chat-input',
      'textarea[placeholder*="输入"]',
      'textarea[placeholder*="message"]',
      'textarea',
      '[class*="chat-input"] textarea',
    ],
  },
  sendButton: {
    fallback: [
      'div[role="button"][class*="send"]',
      'button:has-text("发送")',
      'button[aria-label*="send"]',
      '[class*="send-btn"]',
      'button:has(svg)',
    ],
  },
  newChatButton: {
    fallback: [
      'button:has-text("新对话")',
      'button:has-text("New")',
      '[class*="new-chat"]',
      'a[href*="new"]',
    ],
  },
  aiResponse: {
    fallback: [
      '[class*="message"]:last-of-type',
      '[class*="ds-message"]:last-of-type',
      '[class*="assistant"]:last-of-type [class*="content"]',
      '[class*="assistant-message"]:last-of-type',
      '[class*="chat-message"]:last-of-type',
    ],
  },
  allAiMessages: {
    fallback: [
      '[class*="ds-message"]',
      '[class*="assistant-message"]',
      '[class*="message"][class*="assistant"]',
      '[class*="chat-message"]',
    ],
  },
  stopButton: {
    fallback: [
      'button:has-text("停止")',
      'button:has-text("Stop")',
      '[class*="stop"]',
      '[class*="pause"]',
    ],
  },
  streamingIndicator: {
    fallback: [
      '[class*="typing"]',
      '[class*="think"]',
      '[class*="loading"]',
      '[class*="spinner"]',
    ],
  },
};

export const deepseekTiming = {
  navigationTimeout: 30000,
  loginTimeout: 120000,
  loginPollInterval: 2000,
  responseTimeout: 180000,
  firstTokenTimeout: 30000,
  pollInterval: 1000,
  stabilityThreshold: 3,
};
