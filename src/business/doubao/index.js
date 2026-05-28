import { DoubaoChatPlatform } from './chat.js';

export { DoubaoChatPlatform } from './chat.js';
export { doubaoSelectors, doubaoTiming, DOUBAO_URL } from './config.js';

export function createDoubaoPlatform(globalConfig = {}) {
  return new DoubaoChatPlatform(globalConfig);
}
