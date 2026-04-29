import { BadRequestException, Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { v4 as uuidv4 } from 'uuid';
import * as fs from 'fs';
import * as path from 'path';
import axios from 'axios';
import { SERVER_BASE_URL } from '../config/baseConfig';
import { IssueFeedback } from './entities/issue-feedback.entity';
import { CreateIssueFeedbackDto } from './dto/create-issue-feedback.dto';
import { QueryIssueFeedbackDto } from './dto/query-issue-feedback.dto';
import { UpdateIssueFeedbackDto } from './dto/update-issue-feedback.dto';
import { UserService } from '../user/user.service';
import { CustomContentService } from '../custom-content/custom-content.service';
import { FeishuStorageService } from '../feishu-storage/feishu-storage.service';

@Injectable()
export class IssueService {
  private readonly ISSUE_DIR = path.join(process.cwd(), 'issue_uploads');
  private readonly IMAGE_DIR = path.join(this.ISSUE_DIR, 'images');
  private readonly VIDEO_DIR = path.join(this.ISSUE_DIR, 'videos');

  private readonly FILES_BASE_URL = `${SERVER_BASE_URL}/issue/files`;
  private readonly IMAGE_BASE_URL = `${this.FILES_BASE_URL}/images`;
  private readonly VIDEO_BASE_URL = `${this.FILES_BASE_URL}/videos`;
  
  private readonly COZE_CHAT_URL = 'https://api.coze.cn/v3/chat';

  private readonly MAX_IMAGE_BYTES = 10 * 1024 * 1024;
  private readonly MAX_VIDEO_BYTES = 200 * 1024 * 1024;

  /** 初始化：创建存储目录 */
  constructor(
    @InjectRepository(IssueFeedback)
    private issueFeedbackRepository: Repository<IssueFeedback>,
    private userService: UserService,
    private customContentService: CustomContentService,
    private feishuStorageService: FeishuStorageService,
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
  private isImage(file: Pick<Express.Multer.File, 'mimetype'>) {
    return Boolean(file?.mimetype?.startsWith('image/'));
  }

  /** 判断是否为视频 */
  private isVideo(file: Pick<Express.Multer.File, 'mimetype'>) {
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

  /** 构建安全的curl（会对token做脱敏） */
  private buildCurl(url: string, headers: Record<string, string>, data: any) {
    const maskedHeaders: Record<string, string> = { ...headers };

    const payload = JSON.stringify(data ?? {});
    const safePayload = payload.replace(/'/g, `'\\''`);

    const parts: string[] = [`curl -X POST '${url}'`];
    for (const [k, v] of Object.entries(maskedHeaders)) {
      parts.push(`-H '${k}: ${String(v).replace(/'/g, `'\\''`)}'`);
    }
    parts.push(`-d '${safePayload}'`);
    return parts.join(' ');
  }

  /** 提交成功后通知Coze（失败不影响主流程） */
  private async notifyCozeOnSubmit(payload: any) {
    try {
      const tokenEntity = await this.customContentService.findOneByKey('app-config');
      const token = (tokenEntity?.content || '').trim();
      if (!token) {
        console.warn('[issue] Coze token empty in custom-content key=app-config');
        return;
      }

      const headers = {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${token}`,
      };

      const data = {
        bot_id: '7632379384992825379',
        user_id: 'scheduler',
        auto_save_history: true,
        additional_messages: [
          {
            role: '粉丝问题',
            content: JSON.stringify(payload),
            content_type: 'text',
          },
        ],
      };

      console.log(this.buildCurl(this.COZE_CHAT_URL, headers, data));
      await axios.post(this.COZE_CHAT_URL, data, { headers, timeout: 15000 });
    } catch (e: any) {
      console.warn('[issue] notify coze failed:', e?.message || e);
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

  /** 提交问题反馈：先校验验证码，再上传图片/视频到飞书云空间并落库 */
  async submit(dto: CreateIssueFeedbackDto, files: { images?: Express.Multer.File[]; videos?: Express.Multer.File[] }) {
    this.userService.consumeCaptchaOrThrow(dto.captchaId, dto.captcha);

    const images = Array.isArray(files?.images) ? files.images : [];
    const videos = Array.isArray(files?.videos) ? files.videos : [];

    for (const f of images) {
      if (!this.isImage(f)) {
        throw new BadRequestException('仅支持图片上传');
      }
      if ((f.size || 0) > this.MAX_IMAGE_BYTES) {
        throw new BadRequestException('图片大小不能超过10MB');
      }
    }

    if (videos.length > 5) {
      throw new BadRequestException('最多上传5个视频');
    }

    for (const f of videos) {
      if (!this.isVideo(f)) {
        throw new BadRequestException('仅支持视频上传');
      }
      if ((f.size || 0) > this.MAX_VIDEO_BYTES) {
        throw new BadRequestException('视频大小不能超过200MB');
      }
    }

    const imageUrls: string[] = [];
    for (const f of images) {
      const uploaded = await this.feishuStorageService.uploadLocalFile({
        filepath: f.path,
        originalName: f.originalname,
        mimeType: f.mimetype,
        size: f.size,
      });
      imageUrls.push(uploaded.url);
    }

    const videoUrls: string[] = [];
    for (const f of videos) {
      const uploaded = await this.feishuStorageService.uploadLocalFile({
        filepath: f.path,
        originalName: f.originalname,
        mimeType: f.mimetype,
        size: f.size,
      });
      videoUrls.push(uploaded.url);
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

    this.notifyCozeOnSubmit({
      id: entity.id,
      nickname: entity.nickname,
      question: entity.question,
      imageUrls,
      videoUrls,
      createdAt: entity.createdAt,
    });
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

  /** 管理端删除记录 */
  async adminRemove(id: string) {
    const entity = await this.issueFeedbackRepository.findOne({ where: { id } });
    if (!entity) {
      throw new NotFoundException('记录不存在');
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

}
