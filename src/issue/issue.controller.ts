import { BadRequestException, Body, Controller, Delete, Get, NotFoundException, Param, Post, Res, UploadedFile, UploadedFiles, UseInterceptors } from '@nestjs/common';
import { ApiBody, ApiConsumes, ApiOperation, ApiTags } from '@nestjs/swagger';
import { Response } from 'express';
import * as fs from 'fs';
import * as path from 'path';
import { FileInterceptor, FilesInterceptor } from '@nestjs/platform-express';
import { Public } from '../auth/public.decorator';
import { IssueService } from './issue.service';
import { CreateIssueFeedbackDto } from './dto/create-issue-feedback.dto';

@ApiTags('问题反馈')
@Controller('issue')
export class IssueController {
  /** 注入服务 */
  constructor(private readonly issueService: IssueService) {}

  @Public()
  @Post('upload/images')
  @ApiOperation({ summary: '上传图片（<=10MB/张）' })
  @ApiConsumes('multipart/form-data')
  @ApiBody({
    schema: {
      type: 'object',
      properties: {
        images: {
          type: 'array',
          items: { type: 'string', format: 'binary' },
        },
      },
    },
  })
  @UseInterceptors(
    FilesInterceptor('images', 200, {
      limits: { fileSize: 10 * 1024 * 1024 },
    }),
  )
  /** 图片上传（多文件） */
  uploadImages(@UploadedFiles() files: any[]) {
    return this.issueService.uploadImages(files);
  }

  @Public()
  @Post('upload/video-temp')
  @ApiOperation({ summary: '上传视频到临时缓存（<=200MB/个）' })
  @ApiConsumes('multipart/form-data')
  @ApiBody({
    schema: {
      type: 'object',
      properties: {
        video: { type: 'string', format: 'binary' },
      },
    },
  })
  @UseInterceptors(
    FileInterceptor('video', {
      limits: { fileSize: 200 * 1024 * 1024 },
    }),
  )
  /** 视频临时上传（单文件，存内存） */
  uploadTempVideo(@UploadedFile() file: any) {
    return this.issueService.uploadTempVideo(file);
  }

  @Public()
  @Post('upload/video-temp/cleanup')
  @ApiOperation({ summary: '清理临时视频（用于提交失败回收）' })
  /** 清理临时视频 */
  cleanupTempVideos(@Body('tempIds') tempIds: string[]) {
    return this.issueService.cleanupTempVideosByIds(tempIds);
  }

  @Public()
  @Delete('upload/images/batch/:batchId')
  @ApiOperation({ summary: '清理图片批次（用于提交失败回收）' })
  /** 清理图片批次 */
  cleanupImageBatch(@Param('batchId') batchId: string) {
    return this.issueService.cleanupImageBatch(batchId);
  }

  @Public()
  @Post('submit')
  @ApiOperation({ summary: '提交问题反馈（需要验证码）' })
  /** 提交问题反馈（一次性将临时视频落盘并落库） */
  submit(@Body() dto: CreateIssueFeedbackDto) {
    return this.issueService.submit(dto);
  }

  @Public()
  @Get('files/images/:filename')
  @ApiOperation({ summary: '获取问题反馈图片文件' })
  /** 访问图片文件 */
  async getImage(@Param('filename') filename: string, @Res() res: Response) {
    const safeName = path.basename(filename);
    const filepath = this.issueService.getImagePath(safeName);

    if (!fs.existsSync(filepath)) {
      throw new NotFoundException('文件不存在');
    }

    const ext = path.extname(safeName).toLowerCase();
    if (!['.png', '.jpg', '.jpeg', '.gif', '.webp', '.bmp'].includes(ext)) {
      throw new BadRequestException('不支持的文件类型');
    }

    const contentTypeMap: Record<string, string> = {
      '.png': 'image/png',
      '.jpg': 'image/jpeg',
      '.jpeg': 'image/jpeg',
      '.gif': 'image/gif',
      '.webp': 'image/webp',
      '.bmp': 'image/bmp',
    };
    res.setHeader('Content-Type', contentTypeMap[ext] || 'application/octet-stream');
    res.setHeader('Cache-Control', 'public, max-age=86400');
    fs.createReadStream(filepath).pipe(res);
  }

  @Public()
  @Get('files/videos/:filename')
  @ApiOperation({ summary: '获取问题反馈视频文件' })
  /** 访问视频文件 */
  async getVideo(@Param('filename') filename: string, @Res() res: Response) {
    const safeName = path.basename(filename);
    const filepath = this.issueService.getVideoPath(safeName);

    if (!fs.existsSync(filepath)) {
      throw new NotFoundException('文件不存在');
    }

    const ext = path.extname(safeName).toLowerCase();
    const contentType = ext === '.webm' ? 'video/webm' : ext === '.mov' ? 'video/quicktime' : 'video/mp4';
    res.setHeader('Content-Type', contentType);
    res.setHeader('Cache-Control', 'public, max-age=86400');
    fs.createReadStream(filepath).pipe(res);
  }
}
