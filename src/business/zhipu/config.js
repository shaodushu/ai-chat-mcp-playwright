export const ZHIPU_URL = 'https://chatglm.cn/';

export const zhipuSelectors = {
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
      'button:has-text("退出")',
      'button:has-text("登出")',
      '[class*="avatar"]:not([class*="user-img"])',
      'img[alt*="avatar"]',
    ],
  },
  chatInput: {
    fallback: [
      'textarea.scroll-display-none',
      'textarea[class*="scroll"]',
      'textarea',
      '#search-input-box textarea',
      '[class*="input-outer"] textarea',
      '[class*="search-box"] textarea',
    ],
  },
  sendButton: {
    fallback: [
      '[class*="enter-icon-container"]',
      'button:has-text("发送")',
      'button[aria-label*="发送"]',
      '[class*="enter"] svg',
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
      '.advance-thinking .thinking-content .markdown-body',
      '.answer-content-wrap .markdown-body',
      '.answer-content-wrap',
      '[id^="row-answer"]:last-of-type [class*="markdown"]',
    ],
  },
  allAiMessages: {
    fallback: [
      '.answer .markdown-body',
      '[class*="answer"] [class*="markdown"]',
    ],
  },
  stopButton: {
    fallback: [
      'button:has-text("停止")',
      'button:has-text("暂停")',
      '[class*="stop"]',
      '[class*="pause"]',
    ],
  },
  /** 联网搜索按钮 */
  webSearchButton: {
    fallback: [
      '.mode-button:has-text("联网")',
      'div:has-text("联网") svg',
      '[class*="mode-button"]:has-text("联网")',
      'div[class*="mode"] span:has-text("联网")',
    ],
  },
  /** 引用信源 */
  citedSources: {
    fallback: [
      '[class*="source"]',
      '[class*="reference"]',
      '[class*="citation"]',
      '[class*="ref-link"]',
      'a[href*="http"][class*="source"]',
      '.answer-content-wrap [class*="link"]',
      '.answer-content-wrap a[href]',
    ],
  },
  streamingIndicator: {
    fallback: [
      '.advance-thinking:not(.collapse)',
      '[class*="streaming"]',
      '[class*="spinner"]',
      '[class*="loading"]',
    ],
  },
};

export const zhipuTiming = {
  navigationTimeout: 30000,
  loginTimeout: 120000,
  loginPollInterval: 2000,
  responseTimeout: 60000,
  firstTokenTimeout: 15000,
  pollInterval: 1000,
  stabilityThreshold: 3,
};
