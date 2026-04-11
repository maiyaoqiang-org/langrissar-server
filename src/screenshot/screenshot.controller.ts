import { Controller, Post, Body, Query, Get, Param, Res, NotFoundException } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiQuery } from '@nestjs/swagger';
import { Response } from 'express';
import * as fs from 'fs';
import * as path from 'path';
import { ScreenshotService } from './screenshot.service';
import { ScreenshotDto } from './dto/screenshot.dto';
import { Public } from '../auth/public.decorator';

@ApiTags('网页截图')
@Controller('screenshot')
export class ScreenshotController {
  constructor(private readonly screenshotService: ScreenshotService) {}

  /** 提交截图任务（POST），截图完成后通过飞书机器人发送 */
  @Post()
  @ApiOperation({ summary: '提交网页截图任务（结果发送到飞书）' })
  async screenshot(@Body() dto: ScreenshotDto) {
    return this.screenshotService.submitScreenshot(dto);
  }

  /** 提交截图任务（GET），截图完成后通过飞书机器人发送 */
  @Public()
  @Get()
  @ApiOperation({ summary: '提交网页截图任务（结果发送到飞书）' })
  @ApiQuery({ name: 'url', description: '目标网页URL', required: true })
  @ApiQuery({ name: 'format', description: '图片格式 png/jpeg', required: false })
  @ApiQuery({ name: 'width', description: '视口宽度', required: false })
  @ApiQuery({ name: 'height', description: '视口高度', required: false })
  @ApiQuery({ name: 'fullPage', description: '是否截取完整页面', required: false })
  async screenshotGet(
    @Query('url') url: string,
    @Query('format') format: 'png' | 'jpeg',
    @Query('width') width: string,
    @Query('height') height: string,
    @Query('fullPage') fullPage: string,
  ) {
    const dto = new ScreenshotDto();
    dto.url = url;
    dto.format = format || 'png';
    dto.width = width ? parseInt(width) : 1920;
    dto.height = height ? parseInt(height) : 1080;
    dto.fullPage = fullPage === 'false' ? false : true;

    return this.screenshotService.submitScreenshot(dto);
  }

  /** 通过文件名获取截图文件 */
  @Public()
  @Get('files/:filename')
  @ApiOperation({ summary: '获取截图文件' })
  async getScreenshotFile(
    @Param('filename') filename: string,
    @Res() res: Response,
  ) {
    const safeName = path.basename(filename);
    const filepath = this.screenshotService.getScreenshotPath(safeName);

    if (!fs.existsSync(filepath)) {
      throw new NotFoundException('截图文件不存在或正在处理中');
    }

    const ext = path.extname(safeName).toLowerCase();
    const contentType = ext === '.jpeg' || ext === '.jpg' ? 'image/jpeg' : 'image/png';

    res.setHeader('Content-Type', contentType);
    res.setHeader('Cache-Control', 'public, max-age=86400');
    const stream = fs.createReadStream(filepath);
    stream.pipe(res);
  }
}
