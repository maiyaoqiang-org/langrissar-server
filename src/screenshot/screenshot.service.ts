import { Injectable, ForbiddenException, Logger } from '@nestjs/common';
import { Cron } from '@nestjs/schedule';
import * as puppeteer from 'puppeteer-core';
import { LaunchOptions } from 'puppeteer-core';
import * as fs from 'fs';
import * as path from 'path';
import { v4 as uuidv4 } from 'uuid';
import axios from 'axios';
import * as sharp from 'sharp';
import { ScreenshotDto } from './dto/screenshot.dto';
import {
  FEISHU_WEBHOOK_URL,
  FEISHU_WEBHOOK_MOYUAN_SCREENSHOT_URL,
  SERVER_BASE_URL
} from '../config/baseConfig';

// 用法
// https://maiyaoqiang.fun/api/screenshot?url=https://my.feishu.cn/docx/M3CndOaXQowS1ixfh7mc7IsZnJ2&width=414

@Injectable()
export class ScreenshotService {
  private readonly logger = new Logger(ScreenshotService.name);
  private isProcessing: boolean = false;
  private lastRequestTime: number = 0;
  private readonly COOLDOWN_MS = 3000;
  private readonly SCREENSHOT_DIR = path.join(process.cwd(), 'screenshots');
  private readonly MAX_AGE_DAYS = 30;
  private readonly BASE_URL = `${SERVER_BASE_URL}/screenshot/files`;

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

      const format = dto.format || 'png';
      const fullPage = dto.fullPage !== undefined ? dto.fullPage : true;

      let imageBuffer: Buffer;

      if (fullPage) {
        imageBuffer = await this.stitchedScreenshot(page, format, dto.quality, height);
      } else {
        const screenshotOptions: puppeteer.ScreenshotOptions = {
          type: format as 'png' | 'jpeg',
          encoding: 'binary',
        };
        if (format === 'jpeg') {
          screenshotOptions.quality = dto.quality || 80;
        }
        imageBuffer = await page.screenshot(screenshotOptions) as Buffer;
      }

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

  /** 分段截图拼接：逐段滚动并截取视口，最后纵向拼接成完整页面截图 */
  private async stitchedScreenshot(
    page: puppeteer.Page,
    format: string,
    quality: number | undefined,
    viewportHeight: number,
  ): Promise<Buffer> {
    const viewport = await page.viewport();
    const dpr = viewport?.deviceScaleFactor || 1;
    const canvasWidth = (viewport?.width || 1920) * dpr;

    /** 检测页面中 fixed/sticky 定位的顶部栏高度 */
    const fixedHeaderHeight = await page.evaluate(() => {
      const elements = document.querySelectorAll('*');
      let maxBottom = 0;
      for (const el of elements) {
        const style = window.getComputedStyle(el);
        const rect = el.getBoundingClientRect();
        if ((style.position === 'fixed' || style.position === 'sticky')
          && rect.top === 0 && rect.height > 0 && rect.height < 200) {
          maxBottom = Math.max(maxBottom, rect.height);
        }
      }
      return maxBottom;
    });
    this.logger.log(`检测到固定顶部栏高度: ${fixedHeaderHeight}px`);

    /** 有效滚动步长 = 视口高度 - 顶部栏高度（避免内容被切掉） */
    const scrollStep = fixedHeaderHeight > 0 ? viewportHeight - fixedHeaderHeight : viewportHeight;

    const segments: Buffer[] = [];
    let currentY = 0;
    let prevScrollHeight = 0;
    let noGrowthCount = 0;
    const maxSegments = 50;
    const scrollDelay = 500;
    const maxNoGrowth = 3;

    while (segments.length < maxSegments) {
      await page.evaluate((y: number) => window.scrollTo(0, y), currentY);
      await new Promise(r => setTimeout(r, scrollDelay));

      const scrollHeight = await page.evaluate(() => document.documentElement.scrollHeight);

      if (scrollHeight > prevScrollHeight) {
        noGrowthCount = 0;
      } else {
        noGrowthCount++;
      }
      prevScrollHeight = scrollHeight;

      if (currentY >= scrollHeight && noGrowthCount >= maxNoGrowth) break;

      const segBuffer = await page.screenshot({
        type: format as 'png' | 'jpeg',
        encoding: 'binary',
        ...(format === 'jpeg' ? { quality: quality || 80 } : {}),
      }) as Buffer;
      segments.push(segBuffer);

      this.logger.log(`分段截图: Y=${currentY}, scrollH=${scrollHeight}, 段数=${segments.length}`);

      currentY += scrollStep;

      if (currentY >= scrollHeight) {
        await page.evaluate((y: number) => window.scrollTo(0, y), currentY);
        await new Promise(r => setTimeout(r, scrollDelay));
        const newScrollHeight = await page.evaluate(() => document.documentElement.scrollHeight);
        if (newScrollHeight <= scrollHeight) {
          noGrowthCount++;
        } else {
          noGrowthCount = 0;
          prevScrollHeight = newScrollHeight;
        }
        if (noGrowthCount >= maxNoGrowth) break;
      }
    }

    this.logger.log(`分段截图完成，共 ${segments.length} 段，开始拼接...`);

    if (segments.length === 1) {
      const segPath = path.join(this.SCREENSHOT_DIR, `_seg_0_final.png`);
      fs.writeFileSync(segPath, segments[0]);
      return segments[0];
    }

    const segPixelHeight = viewportHeight * dpr;
    const fixedHeaderPixelHeight = fixedHeaderHeight * dpr;

    /** 先把每段保存为临时文件并裁剪掉顶部栏 */
    const tempFiles: string[] = [];
    for (let i = 0; i < segments.length; i++) {
      const segPath = path.join(this.SCREENSHOT_DIR, `_seg_${i}_${Date.now()}.png`);
      fs.writeFileSync(segPath, segments[i]);
      tempFiles.push(segPath);
      this.logger.log(`临时段文件: ${segPath} (${(segments[i].length / 1024).toFixed(1)}KB)`);
    }

    /** 裁剪每段的固定顶部栏（第一段保留，后续段裁掉） */
    const croppedFiles: string[] = [];
    for (let i = 0; i < tempFiles.length; i++) {
      if (i === 0 || fixedHeaderHeight <= 0) {
        croppedFiles.push(tempFiles[i]);
      } else {
        const croppedPath = path.join(this.SCREENSHOT_DIR, `_seg_${i}_cropped_${Date.now()}.png`);
        await sharp(tempFiles[i])
          .extract({
            top: fixedHeaderPixelHeight,
            left: 0,
            width: canvasWidth,
            height: segPixelHeight - fixedHeaderPixelHeight,
          })
          .toFile(croppedPath);
        croppedFiles.push(croppedPath);
        this.logger.log(`裁剪顶部栏: ${croppedPath}`);
      }
    }

    /** 计算每段实际有效高度（设备像素） */
    const firstSegHeight = segPixelHeight;
    const otherSegHeight = fixedHeaderHeight > 0 ? segPixelHeight - fixedHeaderPixelHeight : segPixelHeight;

    /** 拼接所有段 */
    const baseMeta = await sharp(croppedFiles[0]).metadata();
    this.logger.log(`第一段元数据: ${JSON.stringify({ width: baseMeta.width, height: baseMeta.height, channels: baseMeta.channels, format: baseMeta.format })}`);

    const totalPixelHeight = firstSegHeight + otherSegHeight * (croppedFiles.length - 1);
    const extendBottom = totalPixelHeight - (baseMeta.height || firstSegHeight);

    const composites = croppedFiles.slice(1).map((filePath, index) => ({
      input: filePath,
      top: firstSegHeight + index * otherSegHeight,
      left: 0,
    }));

    const stitchedBuffer = await sharp(croppedFiles[0])
      .extend({
        top: 0,
        bottom: Math.max(0, extendBottom),
        left: 0,
        right: 0,
        background: { r: 255, g: 255, b: 255, alpha: 1 },
      })
      .composite(composites)
      .png()
      .toBuffer();

    /** 按实际 scrollHeight 裁剪底部多余白边 */
    const totalCssHeight = prevScrollHeight;
    const totalCropPixelHeight = totalCssHeight * dpr;
    if (totalCropPixelHeight < totalPixelHeight) {
      const finalBuffer = await sharp(stitchedBuffer)
        .extract({ top: 0, left: 0, width: baseMeta.width || canvasWidth, height: totalCropPixelHeight })
        .toBuffer();
      this.logger.log(`底部裁剪完成: 总CSS高度=${totalCssHeight}px, 设备像素=${totalCropPixelHeight}px`);
      return finalBuffer;
    }

    this.logger.log(`拼接完成: 总高度=${totalPixelHeight}px (设备像素)`);
    return stitchedBuffer;
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
      await axios.post(
        process.env.NODE_ENV === 'development' ?  FEISHU_WEBHOOK_URL : FEISHU_WEBHOOK_MOYUAN_SCREENSHOT_URL,
        {
          msg_type: 'text',
          content: { text },
        });
    } catch (error) {
      this.logger.error(`飞书文本消息发送失败: ${error.message}`);
    }
  }
}
