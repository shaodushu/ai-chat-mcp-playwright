export const DOUBAO_URL = 'https://www.doubao.com/chat/';

export const doubaoSelectors = {
  loginButton: {
    fallback: [
      'button:has-text("登录")',
      'button:has-text("注册")',
      '[class*="login"]',
      'a:has-text("登录")',
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
      'textarea[placeholder*="发消息"]',
      'textarea[placeholder*="输入"]',
      'textarea[placeholder*="提问"]',
      'textarea',
      '[class*="chat-input"] textarea',
      '[class*="input-area"] textarea',
    ],
  },
  sendButton: {
    fallback: [
      'button:has-text("发送")',
      '[class*="send"]',
      'button[aria-label*="发送"]',
    ],
  },
  newChatButton: {
    fallback: [
      'button:has-text("新对话")',
      'button:has-text("新建")',
      '[class*="new-chat"]',
      '[class*="sidebar"] button:first-child',
    ],
  },
  aiResponse: {
    fallback: [
      '[class*="message"]:last-of-type',
      '[class*="assistant"]:last-of-type',
      '[class*="bot"]:last-of-type',
      '[class*="response"]:last-of-type',
    ],
  },
  allAiMessages: {
    fallback: [
      '[class*="message"][class*="assistant"]',
      '[class*="message"][class*="bot"]',
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
      '[class*="thinking"]',
      '[class*="streaming"]',
    ],
  },
};

export const doubaoTiming = {
  navigationTimeout: 30000,
  loginTimeout: 120000,
  loginPollInterval: 2000,
  responseTimeout: 180000,
  firstTokenTimeout: 30000,
  pollInterval: 1000,
  stabilityThreshold: 3,
};
