import { BadRequestException, Controller, Post, UploadedFile, UseInterceptors } from '@nestjs/common';
import { ApiBody, ApiConsumes, ApiOperation, ApiTags } from '@nestjs/swagger';
import { FileInterceptor } from '@nestjs/platform-express';
import { diskStorage } from 'multer';
import * as fs from 'fs';
import * as path from 'path';
import { v4 as uuidv4 } from 'uuid';
import { Public } from '../auth/public.decorator';
import { FeishuStorageService } from './feishu-storage.service';

@ApiTags('飞书存储')
@Controller('feishu-storage')
export class FeishuStorageController {
  constructor(private readonly feishuStorageService: FeishuStorageService) {}

  @Public()
  @Post('upload')
  @ApiOperation({ summary: '上传图片/视频到飞书云空间，并返回外部可访问链接' })
  @ApiConsumes('multipart/form-data')
  @ApiBody({
    schema: {
      type: 'object',
      properties: {
        file: { type: 'string', format: 'binary' },
      },
    },
  })
  @UseInterceptors(
    FileInterceptor('file', {
      limits: { fileSize: 500 * 1024 * 1024 },
      storage: diskStorage({
        destination: (req, file, cb) => {
          const tmpDir = path.join(process.cwd(), 'tmp-feishu-uploads');
          try {
            fs.mkdirSync(tmpDir, { recursive: true });
            cb(null, tmpDir);
          } catch (e) {
            cb(e as any, tmpDir);
          }
        },
        filename: (req, file, cb) => {
          const ext = path.extname(file.originalname || '').slice(0, 20);
          cb(null, `${uuidv4()}${ext || ''}`);
        },
      }),
    }),
  )
  async upload(@UploadedFile() file?: Express.Multer.File) {
    if (!file) {
      throw new BadRequestException('缺少文件');
    }

    const mimeType = file.mimetype || '';
    const isImage = mimeType.startsWith('image/');
    const isVideo = mimeType.startsWith('video/');
    if (!isImage && !isVideo) {
      fs.existsSync(file.path) && fs.unlinkSync(file.path);
      throw new BadRequestException('仅支持图片/视频');
    }

    try {
      return await this.feishuStorageService.uploadLocalFile({
        filepath: file.path,
        originalName: file.originalname,
        mimeType: file.mimetype,
        size: file.size,
      });
    } finally {
      fs.existsSync(file.path) && fs.unlinkSync(file.path);
    }
  }
}

