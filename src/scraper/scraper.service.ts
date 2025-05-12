import { Injectable, BadRequestException } from '@nestjs/common';
import * as puppeteer from 'puppeteer-core';
import { ScraperDto } from './dto/scraper.dto';
import { LaunchOptions } from 'puppeteer-core';

@Injectable()
export class ScraperService {
  async scrape(dto: ScraperDto) {
    try {
      // 获取运行环境
      const isWindows = process.platform === 'win32';
      
      // 配置浏览器启动选项
      const launchOptions: LaunchOptions = {
        headless: true,  // 改为使用 boolean 类型
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

      // 启动浏览器
      const browser = await puppeteer.launch(launchOptions);

      // 创建新页面
      const page = await browser.newPage();

      // 设置页面视口
      await page.setViewport({ width: 1920, height: 1080 });

      // 访问目标URL
      await page.goto(dto.url, {
        waitUntil: 'networkidle0',  // 等待网络请求完成
        timeout: 30000  // 30秒超时
      });

      // 等待选择器出现并提取内容
      const content = await page.evaluate((selector) => {
        const elements = document.querySelectorAll(selector);
        return Array.from(elements).map(el => el.textContent);
      }, dto.selector);

      // 关闭浏览器
      await browser.close();

      return {
        success: true,
        content
      };
    } catch (error) {
      throw new BadRequestException(`爬取失败: ${error.message}`);
    }
  }
}