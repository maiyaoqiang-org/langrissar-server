import { Injectable, ForbiddenException, Logger } from '@nestjs/common';
import { Cron } from '@nestjs/schedule';
import * as puppeteer from 'puppeteer-core';
import { LaunchOptions } from 'puppeteer-core';
import * as fs from 'fs';
import * as path from 'path';
import { v4 as uuidv4 } from 'uuid';
import axios from 'axios';
import { ScreenshotDto } from './dto/screenshot.dto';
import { FEISHU_WEBHOOK_URL } from '../config/baseConfig';

@Injectable()
export class ScreenshotService {
  private readonly logger = new Logger(ScreenshotService.name);
  private isProcessing: boolean = false;
  private lastRequestTime: number = 0;
  private readonly COOLDOWN_MS = 3000;
  private readonly SCREENSHOT_DIR = path.join(process.cwd(), 'screenshots');
  private readonly MAX_AGE_DAYS = 30;
  private readonly BASE_URL = 'https://maiyaoqiang.fun/api/screenshot/files';

  private readonly MOBILE_UA = 'Mozilla/5.0 (iPhone; CPU iPhone OS 17_0 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/17.0 Mobile/15E148 Safari/604.1';
  private readonly DESKTOP_UA = 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36';

  constructor() {
    this.ensureDir();
  }

  /** 确保截图目录存在 */
  private ensureDir() {
    if (!fs.existsSync(this.SCREENSHOT_DIR)) {
      fs.mkdirSync(this.SCREENSHOT_DIR, { recursive: true });
      this.logger.log(`截图目录已创建: ${this.SCREENSHOT_DIR}`);
    }
  }

  /** 提交截图任务，立即返回访问地址，异步执行截图并发送飞书通知 */
  async submitScreenshot(dto: ScreenshotDto) {
    if (this.isProcessing) {
      throw new ForbiddenException('服务器正在处理其他截图任务，请稍后再试');
    }

    const now = Date.now();
    if (now - this.lastRequestTime < this.COOLDOWN_MS) {
      const waitTime = Math.ceil((this.COOLDOWN_MS - (now - this.lastRequestTime)) / 1000);
      throw new ForbiddenException(`请求过于频繁，请在 ${waitTime} 秒后再试`);
    }

    const format = dto.format || 'png';
    const filename = `${uuidv4()}.${format}`;
    const filepath = path.join(this.SCREENSHOT_DIR, filename);
    const fileUrl = `${this.BASE_URL}/${filename}`;

    this.isProcessing = true;
    this.lastRequestTime = now;

    this.executeAndNotify(dto, filepath, filename, fileUrl).catch(err => {
      this.logger.error(`截图任务异步执行失败: ${err.message}`);
    });

    return {
      success: true,
      message: '截图任务已提交，完成后将通过飞书机器人通知',
      filename,
      fileUrl,
    };
  }

  /** 获取截图文件路径 */
  getScreenshotPath(filename: string): string {
    return path.join(this.SCREENSHOT_DIR, filename);
  }

  /** 异步执行截图、保存文件并发送飞书通知 */
  private async executeAndNotify(dto: ScreenshotDto, filepath: string, filename: string, fileUrl: string) {
    let browser: puppeteer.Browser | null = null;
    try {
      const isWindows = process.platform === 'win32';
      const launchOptions: LaunchOptions = {
        headless: true,
        args: [
          '--no-sandbox',
          '--disable-setuid-sandbox',
          '--disable-dev-shm-usage',
          '--disable-gpu',
          '--font-render-hinting=none',
          '--lang=zh-CN',
        ],
        ...(isWindows
          ? { channel: 'chrome' as const }
          : { executablePath: '/usr/bin/chromium-browser' }
        ),
      };

      browser = await puppeteer.launch(launchOptions);
      const page = await browser.newPage();

      const width = dto.width || 1920;
      const height = dto.height || 1080;
      const isMobileWidth = width <= 768;

      await page.setViewport({
        width,
        height,
        deviceScaleFactor: 2,
        isMobile: isMobileWidth,
        hasTouch: isMobileWidth,
      });

      await page.setUserAgent(isMobileWidth ? this.MOBILE_UA : this.DESKTOP_UA);
      await page.setExtraHTTPHeaders({
        'Accept-Language': 'zh-CN,zh;q=0.9,en;q=0.8',
      });

      await page.goto(dto.url, {
        waitUntil: 'domcontentloaded',
        timeout: 60000,
      });

      const waitMs = dto.waitMs !== undefined ? dto.waitMs : 3000;
      if (waitMs > 0) {
        await new Promise(resolve => setTimeout(resolve, waitMs));
      }

      await page.evaluate(async () => {
        const scrollHeight = document.documentElement.scrollHeight;
        let currentScroll = 0;
        const step = Math.min(300, scrollHeight / 10);
        while (currentScroll < scrollHeight) {
          currentScroll += step;
          window.scrollTo(0, currentScroll);
          await new Promise(r => setTimeout(r, 200));
        }
        window.scrollTo(0, 0);
        await new Promise(r => setTimeout(r, 500));
      });

      await new Promise(resolve => setTimeout(resolve, 1500));

      const format = dto.format || 'png';
      const fullPage = dto.fullPage !== undefined ? dto.fullPage : true;

      const screenshotOptions: puppeteer.ScreenshotOptions = {
        type: format,
        fullPage,
        encoding: 'binary',
      };

      if (format === 'jpeg') {
        screenshotOptions.quality = dto.quality || 80;
      }

      const imageBuffer = await page.screenshot(screenshotOptions) as Buffer;

      fs.writeFileSync(filepath, imageBuffer);
      this.logger.log(`截图已保存: ${filepath} (${(imageBuffer.length / 1024).toFixed(1)}KB)`);

      await this.sendFeishuText(
        `网页截图完成\n目标: ${dto.url}\n查看地址: ${fileUrl}`
      );
    } catch (error) {
      this.logger.error(`截图执行失败: ${error.message}`);
      await this.sendFeishuText(`网页截图失败: ${dto.url}\n错误: ${error.message}`);
    } finally {
      this.isProcessing = false;
      if (browser) {
        await browser.close().catch(e => this.logger.error(`浏览器关闭失败: ${e.message}`));
      }
    }
  }

  /** 每天凌晨3点清理超过30天的截图文件 */
  @Cron('0 0 3 * * *')
  handleCleanup() {
    this.logger.log('开始清理过期截图文件...');
    this.cleanupOldFiles();
  }

  /** 清理超过指定天数的截图文件 */
  private cleanupOldFiles() {
    if (!fs.existsSync(this.SCREENSHOT_DIR)) return;

    const now = Date.now();
    const maxAgeMs = this.MAX_AGE_DAYS * 24 * 60 * 60 * 1000;
    let deletedCount = 0;
    let totalSize = 0;

    const files = fs.readdirSync(this.SCREENSHOT_DIR);
    for (const file of files) {
      const filepath = path.join(this.SCREENSHOT_DIR, file);
      try {
        const stat = fs.statSync(filepath);
        if (stat.isFile() && (now - stat.mtimeMs) > maxAgeMs) {
          const fileSize = stat.size;
          fs.unlinkSync(filepath);
          deletedCount++;
          totalSize += fileSize;
        }
      } catch (e) {
        this.logger.warn(`清理文件失败 ${file}: ${e.message}`);
      }
    }

    if (deletedCount > 0) {
      this.logger.log(`清理完成: 删除 ${deletedCount} 个文件，释放 ${(totalSize / 1024 / 1024).toFixed(1)}MB`);
    } else {
      this.logger.log('没有需要清理的过期文件');
    }
  }

  /** 发送飞书文本消息 */
  private async sendFeishuText(text: string) {
    try {
      await axios.post(FEISHU_WEBHOOK_URL, {
        msg_type: 'text',
        content: { text },
      });
    } catch (error) {
      this.logger.error(`飞书文本消息发送失败: ${error.message}`);
    }
  }
}
