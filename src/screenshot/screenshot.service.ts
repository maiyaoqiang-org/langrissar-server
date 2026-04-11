import { Injectable, BadRequestException, ForbiddenException, Logger } from '@nestjs/common';
import * as puppeteer from 'puppeteer-core';
import { LaunchOptions } from 'puppeteer-core';
import axios from 'axios';
import { ScreenshotDto } from './dto/screenshot.dto';
import { FEISHU_WEBHOOK_URL } from '../config/baseConfig';

@Injectable()
export class ScreenshotService {
  private readonly logger = new Logger(ScreenshotService.name);
  private isProcessing: boolean = false;
  private lastRequestTime: number = 0;
  private readonly COOLDOWN_MS = 3000;

  private readonly MOBILE_UA = 'Mozilla/5.0 (iPhone; CPU iPhone OS 17_0 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/17.0 Mobile/15E148 Safari/604.1';
  private readonly DESKTOP_UA = 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36';

  /** 提交截图任务，立即返回，截图完成后异步发送到飞书 */
  async submitScreenshot(dto: ScreenshotDto) {
    if (this.isProcessing) {
      throw new ForbiddenException('服务器正在处理其他截图任务，请稍后再试');
    }

    const now = Date.now();
    if (now - this.lastRequestTime < this.COOLDOWN_MS) {
      const waitTime = Math.ceil((this.COOLDOWN_MS - (now - this.lastRequestTime)) / 1000);
      throw new ForbiddenException(`请求过于频繁，请在 ${waitTime} 秒后再试`);
    }

    this.isProcessing = true;
    this.lastRequestTime = now;

    this.executeAndSend(dto).catch(err => {
      this.logger.error(`截图任务异步执行失败: ${err.message}`);
    });

    return {
      success: true,
      message: '截图任务已提交，完成后将通过飞书机器人发送',
    };
  }

  /** 异步执行截图并发送到飞书 */
  private async executeAndSend(dto: ScreenshotDto) {
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

      await this.sendToFeishu(imageBuffer, format, dto.url);
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

  /** 上传图片到飞书并通过webhook发送图片消息 */
  private async sendToFeishu(imageBuffer: Buffer, format: string, url: string) {
    try {
      const imageKey = await this.uploadFeishuImage(imageBuffer, format);
      await axios.post(FEISHU_WEBHOOK_URL, {
        msg_type: 'image',
        content: {
          image_key: imageKey,
        },
      });
      this.logger.log(`截图已通过飞书发送: ${url}`);
    } catch (error) {
      this.logger.error(`飞书发送图片失败，降级发送文本: ${error.message}`);
      await this.sendFeishuText(`网页截图完成但发送图片失败: ${url}\n错误: ${error.message}`);
    }
  }

  /** 上传图片到飞书获取image_key */
  private async uploadFeishuImage(imageBuffer: Buffer, format: string): Promise<string> {
    const FormData = (await import('form-data')).default;
    const formData = new FormData();
    formData.append('image_type', 'message');
    formData.append('image', imageBuffer, {
      filename: `screenshot.${format}`,
      contentType: format === 'jpeg' ? 'image/jpeg' : 'image/png',
    });

    const uploadUrl = 'https://open.feishu.cn/open-apis/im/v1/images';
    const response = await axios.post(uploadUrl, formData, {
      headers: {
        ...formData.getHeaders(),
      },
      params: {
        receive_id: 'feishu_bot',
      },
    });

    if (response.data?.code !== 0) {
      throw new Error(`飞书图片上传失败: ${JSON.stringify(response.data)}`);
    }

    return response.data.data.image_key;
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
