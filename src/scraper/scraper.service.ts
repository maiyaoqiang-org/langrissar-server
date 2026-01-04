import { Injectable, BadRequestException, ForbiddenException } from '@nestjs/common';
import * as puppeteer from 'puppeteer-core';
import { ScraperDto } from './dto/scraper.dto';
import { LaunchOptions } from 'puppeteer-core';

@Injectable()
export class ScraperService {
  private lastRequestTime: number = 0;
  private isProcessing: boolean = false;
  private readonly COOLDOWN_MS = 5000; // 5秒冷却时间

  async scrape(dto: ScraperDto) {
    // 1. 并发控制：同时只能有一个爬虫任务
    if (this.isProcessing) {
      throw new ForbiddenException('服务器正在处理其他爬虫任务，请稍后再试');
    }

    // 2. 频率控制：两次请求之间必须间隔一定时间
    const now = Date.now();
    if (now - this.lastRequestTime < this.COOLDOWN_MS) {
      const waitTime = Math.ceil((this.COOLDOWN_MS - (now - this.lastRequestTime)) / 1000);
      throw new ForbiddenException(`请求过于频繁，请在 ${waitTime} 秒后再试`);
    }

    this.isProcessing = true;
    this.lastRequestTime = now;

    let browser: puppeteer.Browser | null = null;
    try {
    const isWindows = process.platform === 'win32';
    const launchOptions: LaunchOptions = {
      headless: true,
      args: [
        '--no-sandbox',
        '--disable-setuid-sandbox',
        '--disable-dev-shm-usage',
        '--disable-gpu'
      ],
      ...(isWindows 
        ? { channel: 'chrome' as const } 
        : { executablePath: '/usr/bin/chromium-browser' }
      )
    };

    browser = await puppeteer.launch(launchOptions);
    const page = await browser.newPage();
    await page.setViewport({ width: 1920, height: 1080 });

    // 启用请求拦截以加速加载
    await page.setRequestInterception(true);
    page.on('request', (req) => {
      const resourceType = req.resourceType();
      if (['image', 'media', 'font', 'stylesheet'].includes(resourceType)) {
        req.abort();
      } else {
        req.continue();
      }
    });

    await page.goto(dto.url, {
      waitUntil: 'domcontentloaded',
      timeout: 60000
    });

    // 等待目标选择器出现，增加稳定性
    try {
      await page.waitForSelector(dto.selector, { timeout: 10000 });
    } catch (e) {
      console.warn(`等待选择器 ${dto.selector} 超时，尝试直接获取内容`);
    }

    const content = await page.evaluate((selector) => {
      const elements = document.querySelectorAll(selector);
      return Array.from(elements).map(el => el.textContent);
    }, dto.selector);

    return {
      success: true,
      content
    };
  } catch (error) {
    throw new BadRequestException(`爬取失败: ${error.message}`);
  } finally {
      this.isProcessing = false;
      if (browser) {
        await browser.close().catch(e => 
          console.error('浏览器关闭失败:', e));
      }
    }
}
}