import { BadRequestException, Body, Controller, Get, Headers, NotFoundException, Param, Post, Res, UploadedFile, UploadedFiles, UseInterceptors } from '@nestjs/common';
import { ApiBody, ApiConsumes, ApiHeader, ApiOperation, ApiTags } from '@nestjs/swagger';
import { Response } from 'express';
import * as fs from 'fs';
import * as path from 'path';
import { FileFieldsInterceptor, FileInterceptor } from '@nestjs/platform-express';
import { diskStorage } from 'multer';
import { v4 as uuidv4 } from 'uuid';
import { Public } from '../auth/public.decorator';
import { IssueService } from './issue.service';
import { CreateIssueFeedbackDto } from './dto/create-issue-feedback.dto';
import { VerifyCaptchaDto } from './dto/verify-captcha.dto';
import { SubmitV2IssueFeedbackDto } from './dto/submit-v2-issue-feedback.dto';

@ApiTags('问题反馈')
@Controller('issue')
export class IssueController {
  /** 注入服务 */
  constructor(private readonly issueService: IssueService) {}

  @Public()
  @Post('submit')
  @ApiOperation({ summary: '提交问题反馈（需要验证码）' })
  @ApiConsumes('multipart/form-data')
  @ApiBody({
    schema: {
      type: 'object',
      properties: {
        nickname: { type: 'string' },
        question: { type: 'string' },
        captchaId: { type: 'string' },
        captcha: { type: 'string' },
        images: { type: 'array', items: { type: 'string', format: 'binary' } },
        videos: { type: 'array', items: { type: 'string', format: 'binary' } },
      },
    },
  })
  @UseInterceptors(
    FileFieldsInterceptor(
      [
        { name: 'images', maxCount: 200 },
        { name: 'videos', maxCount: 5 },
      ],
      {
        limits: {
          fileSize: 200 * 1024 * 1024,
        },
        storage: diskStorage({
          destination: (req, file, cb) => {
            const tmpDir = path.join(process.cwd(), 'tmp-issue-submit');
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
      },
    ),
  )
  /** 提交问题反馈：先校验验证码，再上传图片/视频到飞书云空间并落库 */
  async submit(
    @Body() dto: CreateIssueFeedbackDto,
    @UploadedFiles() files: { images?: Express.Multer.File[]; videos?: Express.Multer.File[] },
  ) {
    try {
      return await this.issueService.submit(dto, files);
    } finally {
      const allFiles: Express.Multer.File[] = [
        ...((files?.images as Express.Multer.File[] | undefined) || []),
        ...((files?.videos as Express.Multer.File[] | undefined) || []),
      ];
      for (const f of allFiles) {
        if (f?.path && fs.existsSync(f.path)) {
          try {
            fs.unlinkSync(f.path);
          } catch {}
        }
      }
    }
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
  @Post('verify-captcha')
  @ApiOperation({ summary: '校验验证码，获取 uploadToken（V2 流程第一步）' })
  /** 校验验证码，返回 uploadToken */
  verifyCaptcha(@Body() dto: VerifyCaptchaDto) {
    return this.issueService.verifyCaptchaAndGetToken(dto);
  }

  @Public()
  @Post('upload-file')
  @ApiOperation({ summary: '上传单个文件（V2 流程第二步），需要 x-upload-token Header' })
  @ApiHeader({ name: 'x-upload-token', description: 'verify-captcha 返回的 uploadToken', required: true })
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
      limits: { fileSize: 200 * 1024 * 1024 },
    }),
  )
  /** 接收单个文件，同步上传飞书，返回 fileToken 和 url */
  uploadFile(
    @Headers('x-upload-token') uploadToken: string,
    @UploadedFile() file: Express.Multer.File,
  ) {
    return this.issueService.uploadFile(uploadToken, file);
  }

  @Public()
  @Post('submit-v2')
  @ApiOperation({ summary: '提交问题反馈 V2（需要 x-upload-token Header，无文件）' })
  @ApiHeader({ name: 'x-upload-token', description: 'verify-captcha 返回的 uploadToken', required: true })
  /** 新版提交：验证 token，检查文件状态，落库 */
  submitV2(
    @Headers('x-upload-token') uploadToken: string,
    @Body() dto: SubmitV2IssueFeedbackDto,
  ) {
    return this.issueService.submitV2(uploadToken, dto);
  }
}
