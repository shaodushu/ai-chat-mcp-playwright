export const YUANBAO_URL = 'https://yuanbao.tencent.com/chat/';

export const yuanbaoSelectors = {
  loginButton: {
    fallback: [
      'button:has-text("登录")',
      'a:has-text("登录")',
      '[class*="login"]',
      'button:has-text("注册")',
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
      'textarea',
      '[class*="input-area"] textarea',
      '[class*="chat-input"] textarea',
      '[contenteditable="true"]',
    ],
  },
  sendButton: {
    fallback: [
      'button:has-text("发送")',
      'button:not(:disabled)',
      '[class*="send"]',
      '[class*="submit"]',
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
      '[class*="content"]:last-of-type',
    ],
  },
  allAiMessages: {
    fallback: [
      '[class*="message"]',
      '[class*="chat-message"]',
      '[class*="response"]',
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
      '[class*="streaming"]',
      '[class*="think"]',
    ],
  },
};

export const yuanbaoTiming = {
  navigationTimeout: 30000,
  loginTimeout: 120000,
  loginPollInterval: 2000,
  responseTimeout: 180000,
  firstTokenTimeout: 30000,
  pollInterval: 1000,
  stabilityThreshold: 3,
};
