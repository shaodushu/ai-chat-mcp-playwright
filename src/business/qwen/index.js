import { QwenChatPlatform } from './chat.js';

export { QwenChatPlatform } from './chat.js';
export { qwenSelectors, qwenTiming, QWEN_URL } from './config.js';

export function createQwenPlatform(globalConfig = {}) {
  return new QwenChatPlatform(globalConfig);
}
