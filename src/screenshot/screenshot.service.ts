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
  // private readonly KEEP_SEGMENT_FILES = process.env.NODE_ENV === 'development';
  private readonly KEEP_SEGMENT_FILES = false;
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

      const width = dto.width || 414;
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

    /** 每段截图记录：buffer + 截图时的 scrollY */
    const segments: { buffer: Buffer; scrollY: number; scrollH: number; headerH: number }[] = [];
    let currentY = 0;
    let finalScrollHeight = 0;
    const maxSegments = 100;
    const scrollDelay = 800;

    for (let i = 0; i < maxSegments; i++) {
      await page.evaluate((y: number) => window.scrollTo(0, y), currentY);
      await new Promise(r => setTimeout(r, scrollDelay));

      const scrollInfo = await page.evaluate(() => {
        const elements = document.querySelectorAll('*');
        let maxHeader = 0;
        for (const el of elements) {
          const style = window.getComputedStyle(el);
          if (style.position !== 'fixed' && style.position !== 'sticky') continue;
          const rect = el.getBoundingClientRect();
          if (rect.height <= 0 || rect.height >= 300) continue;
          if (rect.top < -1 || rect.top > 1) continue;
          maxHeader = Math.max(maxHeader, rect.height);
        }
        return {
          scrollY: window.scrollY,
          scrollHeight: document.documentElement.scrollHeight,
          headerH: Math.round(maxHeader),
        };
      });

      const scrollHeight = scrollInfo.scrollHeight;
      finalScrollHeight = Math.max(finalScrollHeight, scrollHeight);

      const lastY = segments.length >= 1 ? segments[segments.length - 1].scrollY : -1;
      if (segments.length >= 1 && scrollInfo.scrollY <= lastY + 1) {
        this.logger.log(`滚动未推进: prevY=${lastY}, currentY=${scrollInfo.scrollY}，停止截图`);
        break;
      }

      const segBuffer = await page.screenshot({
        type: format as 'png' | 'jpeg',
        encoding: 'binary',
        ...(format === 'jpeg' ? { quality: quality || 80 } : {}),
      }) as Buffer;

      const isAtBottom = scrollInfo.scrollY + viewportHeight >= scrollHeight - 1;

      segments.push({ buffer: segBuffer, scrollY: scrollInfo.scrollY, scrollH: scrollHeight, headerH: scrollInfo.headerH });
      this.logger.log(`分段截图: Y=${scrollInfo.scrollY}, headerH=${scrollInfo.headerH}, scrollH=${scrollHeight}, 段数=${segments.length}`);

      if (isAtBottom) {
        this.logger.log(`已接近底部: scrollY=${scrollInfo.scrollY}, viewportH=${viewportHeight}, scrollH=${scrollHeight}，停止截图`);
        break;
      }

      const step = scrollInfo.headerH > 0
        ? Math.max(1, viewportHeight - scrollInfo.headerH)
        : viewportHeight;
      currentY = scrollInfo.scrollY + step - 2;

      if (currentY >= scrollHeight) {
        await page.evaluate((y: number) => window.scrollTo(0, y), currentY);
        await new Promise(r => setTimeout(r, scrollDelay));
        const newScrollHeight = await page.evaluate(() => document.documentElement.scrollHeight);
        finalScrollHeight = Math.max(finalScrollHeight, newScrollHeight);
        this.logger.log(`到底检测: newY=${currentY}, newScrollH=${newScrollHeight}`);
        if (newScrollHeight <= scrollHeight) break;
      }
    }

    this.logger.log(`分段截图完成，共 ${segments.length} 段，最终scrollH=${finalScrollHeight}，开始拼接...`);

    if (segments.length === 1) {
      const segPath = path.join(this.SCREENSHOT_DIR, `_seg_0_final.png`);
      fs.writeFileSync(segPath, segments[0].buffer);
      return segments[0].buffer;
    }

    /** 保存原始段文件 */
    const tempFiles: string[] = [];
    for (let i = 0; i < segments.length; i++) {
      const segPath = path.join(this.SCREENSHOT_DIR, `_seg_${i}_${Date.now()}.png`);
      fs.writeFileSync(segPath, segments[i].buffer);
      tempFiles.push(segPath);
      this.logger.log(`临时段文件: ${segPath} (${(segments[i].buffer.length / 1024).toFixed(1)}KB), scrollY=${segments[i].scrollY}`);
    }

    const croppedFiles: string[] = [];
    const isLast = (i: number) => i === segments.length - 1;

    for (let i = 0; i < tempFiles.length; i++) {
      const seg = segments[i];
      const croppedPath = path.join(this.SCREENSHOT_DIR, `_seg_${i}_cropped_${Date.now()}.png`);
      const meta = await sharp(tempFiles[i]).metadata();
      const imageWidth = meta.width || Math.round((viewport?.width || 1920) * dpr);
      const imageHeight = meta.height || Math.round(viewportHeight * dpr);

      const keptStartY = seg.scrollY + (i === 0 ? 0 : seg.headerH);
      const nextKeptStartY = !isLast(i)
        ? (segments[i + 1].scrollY + segments[i + 1].headerH)
        : finalScrollHeight;
      const keptEndY = Math.max(keptStartY, Math.min(nextKeptStartY, finalScrollHeight));

      if (keptEndY <= keptStartY) {
        this.logger.log(`跳过段${i}: headerH=${seg.headerH}, kept=[${keptStartY}, ${keptEndY})`);
        continue;
      }

      const cropTop = Math.max(0, Math.round((keptStartY - seg.scrollY) * dpr));
      let cropHeight = Math.max(1, Math.round((keptEndY - keptStartY) * dpr));

      if (cropTop >= imageHeight) {
        cropHeight = 1;
      } else if (cropTop + cropHeight > imageHeight) {
        cropHeight = Math.max(1, imageHeight - cropTop);
      }

      await sharp(tempFiles[i])
        .extract({
          top: cropTop,
          left: 0,
          width: imageWidth,
          height: cropHeight,
        })
        .toFile(croppedPath);
      croppedFiles.push(croppedPath);
      this.logger.log(`裁剪段${i}: headerH=${seg.headerH}, cropTop=${cropTop}, cropHeight=${cropHeight}, kept=[${keptStartY}, ${keptEndY})`);
    }

    if (croppedFiles.length === 0) {
      return segments[0].buffer;
    }

    /** 逐段拼接：用 sharp 逐个 extend + composite */
    let resultBuffer = await sharp(croppedFiles[0]).png().toBuffer();

    for (let i = 1; i < croppedFiles.length; i++) {
      const segMeta = await sharp(resultBuffer).metadata();
      const nextMeta = await sharp(croppedFiles[i]).metadata();

      resultBuffer = await sharp(resultBuffer)
        .extend({
          top: 0,
          bottom: nextMeta.height || 0,
          left: 0,
          right: 0,
          background: { r: 255, g: 255, b: 255, alpha: 1 },
        })
        .composite([{
          input: croppedFiles[i],
          top: segMeta.height || 0,
          left: 0,
        }])
        .png()
        .toBuffer();

      this.logger.log(`拼接段${i}: 累计高度=${(segMeta.height || 0) + (nextMeta.height || 0)}px`);
    }

    const finalMeta = await sharp(resultBuffer).metadata();
    this.logger.log(`拼接完成: 最终高度=${finalMeta.height}px, 宽度=${finalMeta.width}px`);

    if (!this.KEEP_SEGMENT_FILES) {
      this.logger.log('清理分段临时文件...');
      const allTempFiles = [...tempFiles, ...croppedFiles];
      for (const file of allTempFiles) {
        try {
          if (fs.existsSync(file)) {
            fs.unlinkSync(file);
          }
        } catch (e) {
          this.logger.warn(`删除临时文件失败 ${file}: ${e.message}`);
        }
      }
      this.logger.log(`清理完成，共删除 ${allTempFiles.length} 个临时文件`);
    }

    return resultBuffer;
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
