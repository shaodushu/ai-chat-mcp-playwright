import { ZhipuChatPlatform } from './chat.js';

export { ZhipuChatPlatform } from './chat.js';
export { zhipuSelectors, zhipuTiming, ZHIPU_URL } from './config.js';

export function createZhipuPlatform(globalConfig = {}) {
  return new ZhipuChatPlatform(globalConfig);
}
