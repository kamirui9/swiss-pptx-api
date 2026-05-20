/**
 * Browser Pool — 单例 Chromium + 并发信号量
 *
 * 解决 100 并发时每个请求 launch 独立 Chromium 导致资源耗尽的问题：
 * - 全局只启动 1 个 Chromium 实例
 * - 每个请求创建隔离的 BrowserContext（轻量，~10ms）
 * - 信号量限制同时进行的转换数（默认 4，通过 MAX_CONCURRENT 环境变量调整）
 */

const { chromium } = require('playwright');

// ─── 配置 ────────────────────────────────────────────────
const MAX_CONCURRENT = parseInt(process.env.MAX_CONCURRENT || '4', 10);

// ─── 信号量 ──────────────────────────────────────────────
class Semaphore {
  constructor(max) {
    this.max = max;
    this.current = 0;
    this.queue = [];
  }

  acquire() {
    if (this.current < this.max) {
      this.current++;
      return Promise.resolve();
    }
    return new Promise(resolve => {
      this.queue.push(resolve);
    });
  }

  release() {
    if (this.queue.length > 0) {
      const resolve = this.queue.shift();
      // 不减少 current，因为直接转交给队列中的下一个
      resolve();
    } else {
      this.current--;
    }
  }

  get waiting() {
    return this.queue.length;
  }

  get active() {
    return this.current;
  }
}

const semaphore = new Semaphore(MAX_CONCURRENT);

// ─── 浏览器单例 ──────────────────────────────────────────
let browser = null;
let initPromise = null;
let browserRefs = 0; // 引用计数，用于优雅关闭

async function getBrowser() {
  if (browser && browser.isConnected()) {
    return browser;
  }

  // 防止并发初始化
  if (!initPromise) {
    initPromise = (async () => {
      const launchOptions = {};
      if (process.platform === 'darwin') {
        launchOptions.channel = 'chrome';
      }

      console.log(`[browser-pool] Launching Chromium (max ${MAX_CONCURRENT} concurrent)...`);
      browser = await chromium.launch(launchOptions);
      console.log('[browser-pool] Chromium ready');

      // 进程退出时清理
      const cleanup = () => {
        if (browser && browser.isConnected()) {
          browser.close().catch(() => {});
        }
      };
      process.on('exit', cleanup);
      process.on('SIGINT', cleanup);
      process.on('SIGTERM', cleanup);

      return browser;
    })();
  }

  await initPromise;
  return browser;
}

// ─── 公开 API ───────────────────────────────────────────

/**
 * 获取一个隔离的浏览器上下文 + 页面
 * 调用方用完必须调用 releaseContext
 */
async function acquireContextAndPage() {
  await semaphore.acquire();

  try {
    const b = await getBrowser();
    const context = await b.newContext();
    const page = await context.newPage();

    // 将控制台消息转发到服务端日志（调试用）
    page.on('console', (msg) => {
      console.log(`Browser console: ${msg.text()}`);
    });

    return { browser, context, page };
  } catch (err) {
    // 获取失败时释放信号量
    semaphore.release();
    throw err;
  }
}

/**
 * 释放上下文（关闭隔离环境，归还信号量）
 */
async function releaseContext(context) {
  try {
    await context.close();
  } catch (err) {
    // 忽略关闭错误（浏览器可能已崩溃）
  } finally {
    semaphore.release();
  }
}

/**
 * 获取池状态
 */
function getStatus() {
  return {
    active: semaphore.active,
    waiting: semaphore.waiting,
    max: MAX_CONCURRENT,
    browserAlive: browser ? browser.isConnected() : false
  };
}

/**
 * 优雅关闭浏览器（用于服务关闭时）
 */
async function shutdown() {
  if (browser && browser.isConnected()) {
    console.log('[browser-pool] Shutting down Chromium...');
    await browser.close();
    browser = null;
    initPromise = null;
    console.log('[browser-pool] Chromium closed');
  }
}

module.exports = { acquireContextAndPage, releaseContext, getStatus, shutdown };
