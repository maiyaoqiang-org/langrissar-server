import { Injectable, BadRequestException } from '@nestjs/common';
import * as puppeteer from 'puppeteer-core';
import { ScraperDto } from './dto/scraper.dto';
import { LaunchOptions } from 'puppeteer-core';

@Injectable()
export class ScraperService {
  async scrape(dto: ScraperDto) {
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

    await page.goto(dto.url, {
      waitUntil: 'networkidle0',
      timeout: 60000
    });

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
    if (browser) {
      await browser.close().catch(e => 
        console.error('浏览器关闭失败:', e));
    }
  }
}
}