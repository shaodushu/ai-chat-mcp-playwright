import { DeepSeekChatPlatform } from './chat.js';

export { DeepSeekChatPlatform } from './chat.js';
export { deepseekSelectors, deepseekTiming, DEEPSEEK_URL } from './config.js';

export function createDeepSeekPlatform(globalConfig = {}) {
  return new DeepSeekChatPlatform(globalConfig);
}
