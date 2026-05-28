import { YuanbaoChatPlatform } from './chat.js';

export { YuanbaoChatPlatform } from './chat.js';
export { yuanbaoSelectors, yuanbaoTiming, YUANBAO_URL } from './config.js';

export function createYuanbaoPlatform(globalConfig = {}) {
  return new YuanbaoChatPlatform(globalConfig);
}
