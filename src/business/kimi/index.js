/**
 * Kimi 业务模块入口
 */
import { KimiChatPlatform } from './chat.js';

export { KimiChatPlatform } from './chat.js';
export { kimiSelectors, kimiTiming, KIMI_URL } from './config.js';

export function createKimiPlatform(globalConfig = {}) {
  return new KimiChatPlatform(globalConfig);
}
