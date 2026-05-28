export const QWEN_URL = 'https://www.qianwen.com/';

export const qwenSelectors = {
  loginButton: {
    fallback: [
      'button:has-text("登录")',
      'a:has-text("登录")',
      'button:has-text("注册")',
      '[class*="login"]',
      'a[href*="login"]',
    ],
  },
  loggedInIndicator: {
    fallback: [
      '[class*="avatar"]',
      'img[alt*="avatar"]',
      '[class*="user"]',
      'button:has-text("退出")',
    ],
  },
  chatInput: {
    fallback: [
      'textarea[placeholder*="输入"]',
      'textarea[placeholder*="提问"]',
      'textarea[placeholder*="问"]',
      '[contenteditable="true"]',
      'textarea',
      '[class*="input"] textarea',
      '[class*="chat"] textarea',
    ],
  },
  sendButton: {
    fallback: [
      'button:has-text("发送")',
      'button:has-text("提问")',
      '[class*="send"]',
      'button[aria-label*="发送"]',
    ],
  },
  newChatButton: {
    fallback: [
      'button:has-text("新对话")',
      'button:has-text("新建")',
      '[class*="new"]',
      '[class*="sidebar"] button:first-child',
    ],
  },
  aiResponse: {
    fallback: [
      '[class*="message"]:last-of-type',
      '[class*="assistant"]:last-of-type',
      '[class*="bot"]:last-of-type',
      '[class*="response"]:last-of-type',
      '[class*="answer"]:last-of-type',
    ],
  },
  allAiMessages: {
    fallback: [
      '[class*="message"]',
      '[class*="response"]',
      '[class*="answer"]',
    ],
  },
  stopButton: {
    fallback: [
      'button:has-text("停止")',
      'button:has-text("暂停")',
      '[class*="stop"]',
    ],
  },
  streamingIndicator: {
    fallback: [
      '[class*="loading"]',
      '[class*="typing"]',
      '[class*="think"]',
      '[class*="streaming"]',
    ],
  },
};

export const qwenTiming = {
  navigationTimeout: 30000,
  loginTimeout: 120000,
  loginPollInterval: 2000,
  responseTimeout: 180000,
  firstTokenTimeout: 30000,
  pollInterval: 1000,
  stabilityThreshold: 3,
};
