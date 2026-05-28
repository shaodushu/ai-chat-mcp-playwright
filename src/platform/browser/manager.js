/**
 * BrowserManager — 简化的浏览器管理器
 *
 * 单用户、本地模式，不需要槽位控制/Docker/进程隔离。
 * 保留指纹随机化和浏览器数据目录管理。
 */
import { chromium } from 'playwright';
import fs from 'fs';
import path from 'path';

const USER_AGENTS = [
  'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0.0.0 Safari/537.36',
  'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/123.0.0.0 Safari/537.36',
  'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0.0.0 Safari/537.36',
  'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/123.0.0.0 Safari/537.36',
  'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0.0.0 Safari/537.36 Edg/124.0.0.0',
  'Mozilla/5.0 (Windows NT 10.0; Win64; x64; rv:125.0) Gecko/20100101 Firefox/125.0',
];

const VIEWPORTS = [
  { width: 1920, height: 1080 },
  { width: 1680, height: 1050 },
  { width: 1600, height: 900 },
  { width: 1440, height: 900 },
  { width: 1366, height: 768 },
];

const TIMEZONES = [
  'Asia/Shanghai',
  'Asia/Hong_Kong',
  'Asia/Singapore',
  'Asia/Tokyo',
];

const LOCALES = ['zh-CN', 'zh-TW', 'en-US'];

function generateRandomFingerprint() {
  return {
    userAgent: USER_AGENTS[Math.floor(Math.random() * USER_AGENTS.length)],
    viewport: VIEWPORTS[Math.floor(Math.random() * VIEWPORTS.length)],
    timezone: TIMEZONES[Math.floor(Math.random() * TIMEZONES.length)],
    locale: LOCALES[Math.floor(Math.random() * LOCALES.length)],
  };
}

function ensureDir(dir) {
  if (!fs.existsSync(dir)) {
    fs.mkdirSync(dir, { recursive: true });
  }
}

export class BrowserManager {
  constructor(options = {}) {
    this.headless = options.headless ?? (process.env.HEADLESS === 'true');
    this.executablePath = options.executablePath || process.env.BROWSER_EXECUTABLE_PATH || '';
    this.storageDir = options.storageDir || './storage';
    this.randomizeFingerprint = options.randomizeFingerprint ?? true;
    this.userBrowsers = new Map(); // userId → context (用于跟踪和清理)
  }

  /**
   * 为用户启动独立浏览器上下文（persistent context）。
   * @param {string} userId - 用户标识（平台名）
   * @param {string} stateFile - storageState 文件路径
   * @returns {Promise<{ context: BrowserContext, fingerprint: object }>}
   */
  async launchUserContext(userId, stateFile) {
    const userDataDir = path.join(this.storageDir, userId);

    // 首次启动时清理旧数据；有 storageState 保留登录态
    if (!fs.existsSync(stateFile)) {
      if (fs.existsSync(userDataDir)) {
        fs.rmSync(userDataDir, { recursive: true, force: true });
      }
    }

    ensureDir(userDataDir);

    const fingerprint = generateRandomFingerprint();
    console.error(`[BrowserManager] 为用户 ${userId} 启动浏览器，指纹: UA=${fingerprint.userAgent.substring(0, 40)}..., 视口=${fingerprint.viewport.width}x${fingerprint.viewport.height}`);

    const launchOptions = {
      headless: this.headless,
      args: [
        '--disable-blink-features=AutomationControlled',
        '--disable-features=NetworkPrediction,PreconnectToNonOrigins',
        '--no-sandbox',
        '--disable-setuid-sandbox',
      ],
    };

    if (this.executablePath) {
      launchOptions.executablePath = this.executablePath;
    }

    const context = await chromium.launchPersistentContext(userDataDir, launchOptions);

    if (this.randomizeFingerprint) {
      await context.addInitScript((fp) => {
        Object.defineProperty(navigator, 'userAgent', {
          get: () => fp.userAgent,
          configurable: true,
        });
        Object.defineProperty(navigator, 'platform', {
          get: () => fp.userAgent.includes('Mac') ? 'MacIntel' : 'Win32',
          configurable: true,
        });
        Object.defineProperty(navigator, 'language', {
          get: () => fp.locale,
          configurable: true,
        });
        Object.defineProperty(navigator, 'languages', {
          get: () => [fp.locale, 'en-US'],
          configurable: true,
        });
        const originalDateTimeFormat = Intl.DateTimeFormat;
        Intl.DateTimeFormat = function (...args) {
          if (args.length === 0 || !args[1]?.timeZone) {
            args[1] = { ...(args[1] || {}), timeZone: fp.timezone };
          }
          return originalDateTimeFormat.apply(this, args);
        };
        Intl.DateTimeFormat.prototype = originalDateTimeFormat.prototype;
        Intl.DateTimeFormat.supportedLocalesOf = originalDateTimeFormat.supportedLocalesOf;
      }, fingerprint);

      const pages = context.pages();
      for (const page of pages) {
        await page.setViewportSize(fingerprint.viewport);
      }
    }

    // 跟踪上下文，用于 closeUserBrowser 清理
    this.userBrowsers.set(userId, context);

    return { context, fingerprint };
  }

  /**
   * 关闭用户的浏览器实例。
   */
  async closeUserBrowser(userId) {
    const context = this.userBrowsers.get(userId);
    if (context) {
      try { await context.close(); } catch (e) { /* ignore */ }
      this.userBrowsers.delete(userId);
    }
  }

  /**
   * 创建普通浏览器上下文（用于已有 persistent context 的场景）。
   * @param {string} stateFile - storageState 文件路径
   * @returns {Promise<BrowserContext>}
   */
  async createContext(stateFile) {
    const browser = await chromium.launch({
      headless: this.headless,
      args: ['--disable-blink-features=AutomationControlled', '--no-sandbox'],
      executablePath: this.executablePath || undefined,
    });

    const contextOptions = {
      viewport: { width: 1920, height: 1080 },
    };

    if (fs.existsSync(stateFile)) {
      contextOptions.storageState = stateFile;
    }

    return { browser, context: await browser.newContext(contextOptions) };
  }

  async closeContext(browser, context) {
    try { await context?.close(); } catch (e) { /* ignore */ }
    try { await browser?.close(); } catch (e) { /* ignore */ }
  }
}
