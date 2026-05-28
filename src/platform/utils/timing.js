export function delay(ms) {
  return new Promise(resolve => setTimeout(resolve, ms));
}

export function randomDelay(min = 800, max = 1500) {
  return delay(Math.floor(Math.random() * (max - min + 1)) + min);
}
