import { BadRequestException, Injectable, NotFoundException } from '@nestjs/common';
import { Cron } from '@nestjs/schedule';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { v4 as uuidv4 } from 'uuid';
import * as fs from 'fs';
import * as path from 'path';
import { SERVER_BASE_URL } from '../config/baseConfig';
import { IssueFeedback } from './entities/issue-feedback.entity';
import { CreateIssueFeedbackDto } from './dto/create-issue-feedback.dto';
import { QueryIssueFeedbackDto } from './dto/query-issue-feedback.dto';
import { UpdateIssueFeedbackDto } from './dto/update-issue-feedback.dto';
import { UserService } from '../user/user.service';

type TempVideoItem = {
  id: string;
  originalName: string;
  mimeType: string;
  size: number;
  buffer: Buffer;
  createdAt: number;
};

type UploadedFileLike = {
  originalname: string;
  mimetype: string;
  size: number;
  buffer: Buffer;
};

@Injectable()
export class IssueService {
  private readonly ISSUE_DIR = path.join(process.cwd(), 'issue_uploads');
  private readonly IMAGE_DIR = path.join(this.ISSUE_DIR, 'images');
  private readonly VIDEO_DIR = path.join(this.ISSUE_DIR, 'videos');

  private readonly FILES_BASE_URL = `${SERVER_BASE_URL}/issue/files`;
  private readonly IMAGE_BASE_URL = `${this.FILES_BASE_URL}/images`;
  private readonly VIDEO_BASE_URL = `${this.FILES_BASE_URL}/videos`;

  private readonly MAX_IMAGE_BYTES = 10 * 1024 * 1024;
  private readonly MAX_VIDEO_BYTES = 200 * 1024 * 1024;

  private readonly TMP_VIDEO_TTL_MS = 2 * 60 * 60 * 1000;
  private readonly TMP_VIDEO_MAX_TOTAL_BYTES = 5 * 1024 * 1024 * 1024;

  private tmpVideos: Map<string, TempVideoItem> = new Map();
  private tmpVideosTotalBytes = 0;

  /** 初始化：创建存储目录 */
  constructor(
    @InjectRepository(IssueFeedback)
    private issueFeedbackRepository: Repository<IssueFeedback>,
    private userService: UserService,
  ) {
    this.ensureDirs();
  }

  /** 确保上传目录存在 */
  private ensureDirs() {
    if (!fs.existsSync(this.ISSUE_DIR)) {
      fs.mkdirSync(this.ISSUE_DIR, { recursive: true });
    }
    if (!fs.existsSync(this.IMAGE_DIR)) {
      fs.mkdirSync(this.IMAGE_DIR, { recursive: true });
    }
    if (!fs.existsSync(this.VIDEO_DIR)) {
      fs.mkdirSync(this.VIDEO_DIR, { recursive: true });
    }
  }

  /** 判断是否为图片 */
  private isImage(file: UploadedFileLike) {
    return Boolean(file?.mimetype?.startsWith('image/'));
  }

  /** 判断是否为视频 */
  private isVideo(file: UploadedFileLike) {
    return Boolean(file?.mimetype?.startsWith('video/'));
  }

  /** 从原文件名提取安全的后缀名 */
  private safeExt(originalName: string) {
    const ext = path.extname(originalName || '').toLowerCase();
    if (!ext || ext.length > 10) return '';
    return ext;
  }

  /** 解析 JSON 数组字符串（失败返回空数组） */
  private parseJsonArray(value?: string) {
    if (!value) return [];
    try {
      const parsed = JSON.parse(value);
      return Array.isArray(parsed) ? parsed : [];
    } catch {
      return [];
    }
  }

  /** 从 URL 解析文件名 */
  private extractFilenameFromUrl(url: string) {
    try {
      const u = new URL(url);
      return path.basename(u.pathname);
    } catch {
      return '';
    }
  }

  /** 上传图片并落盘，返回可访问 URL 列表 */
  async uploadImages(files: UploadedFileLike[]) {
    if (!files?.length) {
      throw new BadRequestException('请选择图片');
    }

    for (const f of files) {
      if (!this.isImage(f)) {
        throw new BadRequestException('仅支持图片上传');
      }
      if (f.size > this.MAX_IMAGE_BYTES) {
        throw new BadRequestException('图片大小不能超过10MB');
      }
    }

    const urls: string[] = [];
    for (const f of files) {
      const ext = this.safeExt(f.originalname) || '.png';
      const filename = `${uuidv4()}${ext}`;
      const filepath = path.join(this.IMAGE_DIR, filename);
      await fs.promises.writeFile(filepath, f.buffer);
      urls.push(`${this.IMAGE_BASE_URL}/${filename}`);
    }

    return { urls };
  }

  /** 上传视频到内存临时缓存，返回 tempId */
  async uploadTempVideo(file: UploadedFileLike) {
    if (!file) {
      throw new BadRequestException('请选择视频');
    }
    if (!this.isVideo(file)) {
      throw new BadRequestException('仅支持视频上传');
    }
    if (file.size > this.MAX_VIDEO_BYTES) {
      throw new BadRequestException('视频大小不能超过200MB');
    }

    if (this.tmpVideosTotalBytes + file.size > this.TMP_VIDEO_MAX_TOTAL_BYTES) {
      throw new BadRequestException('容量已超上限，请联系管理员处理');
    }

    const id = uuidv4();
    const item: TempVideoItem = {
      id,
      originalName: file.originalname,
      mimeType: file.mimetype,
      size: file.size,
      buffer: file.buffer,
      createdAt: Date.now(),
    };

    this.tmpVideos.set(id, item);
    this.tmpVideosTotalBytes += item.size;

    return { tempId: id, size: item.size, originalName: item.originalName };
  }

  /** 提交问题反馈：校验验证码，落库，并将临时视频一次性落盘 */
  async submit(dto: CreateIssueFeedbackDto) {
    this.userService.consumeCaptchaOrThrow(dto.captchaId, dto.captcha);

    const imageUrls = dto.imageUrls?.filter(Boolean) || [];
    const videoTempIds = dto.videoTempIds?.filter(Boolean) || [];

    if (videoTempIds.length > 5) {
      throw new BadRequestException('最多上传5个视频');
    }

    const videoUrls: string[] = [];
    for (const tempId of videoTempIds) {
      const item = this.tmpVideos.get(tempId);
      if (!item) {
        throw new BadRequestException('存在无效或已过期的视频，请重新上传');
      }
    }

    for (const tempId of videoTempIds) {
      const item = this.tmpVideos.get(tempId);
      if (!item) continue;

      const ext = this.safeExt(item.originalName) || '.mp4';
      const filename = `${uuidv4()}${ext}`;
      const filepath = path.join(this.VIDEO_DIR, filename);
      await fs.promises.writeFile(filepath, item.buffer);
      videoUrls.push(`${this.VIDEO_BASE_URL}/${filename}`);

      this.tmpVideos.delete(tempId);
      this.tmpVideosTotalBytes -= item.size;
    }

    const entity = this.issueFeedbackRepository.create({
      id: uuidv4(),
      nickname: dto.nickname,
      question: dto.question,
      imageUrls: imageUrls.length ? JSON.stringify(imageUrls) : null,
      videoUrls: videoUrls.length ? JSON.stringify(videoUrls) : null,
      status: 'pending',
      adminRemark: null,
    });

    await this.issueFeedbackRepository.save(entity);
    return { id: entity.id };
  }

  /** 管理端分页查询问题反馈 */
  async adminQuery(queryDto: QueryIssueFeedbackDto) {
    const query = this.issueFeedbackRepository
      .createQueryBuilder('issue')
      .orderBy('issue.createdAt', 'DESC');

    if (queryDto.nickname) {
      query.andWhere('issue.nickname LIKE :nickname', { nickname: `%${queryDto.nickname}%` });
    }
    if (queryDto.status) {
      query.andWhere('issue.status = :status', { status: queryDto.status });
    }

    const page = Number(queryDto.page) || 1;
    const pageSize = Number(queryDto.pageSize) || 10;

    const [items, total] = await query
      .skip((page - 1) * pageSize)
      .take(pageSize)
      .getManyAndCount();

    return {
      items: items.map((it) => ({
        ...it,
        imageUrls: this.parseJsonArray(it.imageUrls || '[]'),
        videoUrls: this.parseJsonArray(it.videoUrls || '[]'),
      })),
      total,
      page,
      pageSize,
      totalPages: Math.ceil(total / pageSize),
    };
  }

  /** 管理端获取详情 */
  async adminDetail(id: string) {
    const entity = await this.issueFeedbackRepository.findOne({ where: { id } });
    if (!entity) {
      throw new NotFoundException('记录不存在');
    }
    return {
      ...entity,
      imageUrls: this.parseJsonArray(entity.imageUrls || '[]'),
      videoUrls: this.parseJsonArray(entity.videoUrls || '[]'),
    };
  }

  /** 管理端更新记录（状态/备注等） */
  async adminUpdate(id: string, dto: UpdateIssueFeedbackDto) {
    const entity = await this.issueFeedbackRepository.findOne({ where: { id } });
    if (!entity) {
      throw new NotFoundException('记录不存在');
    }
    Object.assign(entity, dto);
    const saved = await this.issueFeedbackRepository.save(entity);
    return {
      ...saved,
      imageUrls: this.parseJsonArray(saved.imageUrls || '[]'),
      videoUrls: this.parseJsonArray(saved.videoUrls || '[]'),
    };
  }

  /** 管理端删除记录并删除对应资源文件 */
  async adminRemove(id: string) {
    const entity = await this.issueFeedbackRepository.findOne({ where: { id } });
    if (!entity) {
      throw new NotFoundException('记录不存在');
    }

    const imageUrls = this.parseJsonArray(entity.imageUrls || '[]') as string[];
    const videoUrls = this.parseJsonArray(entity.videoUrls || '[]') as string[];

    for (const url of imageUrls) {
      const filename = this.extractFilenameFromUrl(url);
      if (!filename) continue;
      const filepath = path.join(this.IMAGE_DIR, filename);
      if (fs.existsSync(filepath)) {
        await fs.promises.unlink(filepath).catch(() => undefined);
      }
    }
    for (const url of videoUrls) {
      const filename = this.extractFilenameFromUrl(url);
      if (!filename) continue;
      const filepath = path.join(this.VIDEO_DIR, filename);
      if (fs.existsSync(filepath)) {
        await fs.promises.unlink(filepath).catch(() => undefined);
      }
    }

    await this.issueFeedbackRepository.softRemove(entity);
    return { id };
  }

  /** 获取图片文件本地路径 */
  getImagePath(filename: string) {
    return path.join(this.IMAGE_DIR, filename);
  }

  /** 获取视频文件本地路径 */
  getVideoPath(filename: string) {
    return path.join(this.VIDEO_DIR, filename);
  }

  @Cron('*/10 * * * *')
  /** 定时清理过期的临时视频缓存 */
  cleanupTempVideos() {
    const now = Date.now();
    for (const [id, item] of this.tmpVideos.entries()) {
      if (item.createdAt + this.TMP_VIDEO_TTL_MS < now) {
        this.tmpVideos.delete(id);
        this.tmpVideosTotalBytes -= item.size;
      }
    }
    if (this.tmpVideosTotalBytes < 0) {
      this.tmpVideosTotalBytes = 0;
    }
  }
}
