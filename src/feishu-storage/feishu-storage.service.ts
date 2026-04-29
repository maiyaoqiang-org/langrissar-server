import { BadRequestException, Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import * as fs from 'fs';
import * as path from 'path';
import { v4 as uuidv4 } from 'uuid';
import * as lark from '@larksuiteoapi/node-sdk';

type UploadLocalFileInput = {
  filepath: string;
  originalName?: string;
  mimeType?: string;
  size?: number;
};

@Injectable()
export class FeishuStorageService {
  private client: lark.Client | null = null;

  constructor(private readonly configService: ConfigService) {}

  private mustGetEnv(key: string): string {
    const value = this.configService.get<string>(key);
    if (!value) {
      throw new BadRequestException(`缺少环境变量：${key}`);
    }
    return value;
  }

  private getClient(): lark.Client {
    if (this.client) return this.client;

    const appId = this.mustGetEnv('MOYUAN_FEISHU_APP_ID');
    const appSecret = this.mustGetEnv('MOYUAN_FEISHU_APP_SECRET');
    this.client = new lark.Client({
      appId,
      appSecret,
      appType: lark.AppType.SelfBuild,
      domain: lark.Domain.Feishu,
    });
    return this.client;
  }

  private buildCandidateFileName(input: UploadLocalFileInput): string {
    const ext = path.extname(input.originalName || '');
    const safeExt = ext && ext.length <= 20 ? ext : '';
    const rawName = path.basename(input.originalName || '').replace(/\s+/g, ' ').trim();
    const rawBase = safeExt ? path.basename(rawName, safeExt) : rawName;
    if (rawBase) {
      const baseNoExt = rawBase.slice(0, safeExt ? Math.max(1, 150 - safeExt.length) : 150);
      const trimmed = baseNoExt.trim();
      return safeExt ? `${trimmed}${safeExt}` : trimmed;
    }
    return `${uuidv4()}${safeExt}`;
  }

  private async updatePublicPermissions(fileToken: string): Promise<void> {
    const client = this.getClient();
    const resp = await client.drive.permissionPublic.patch({
      params: { type: 'file' },
      path: { token: fileToken },
      data: {
        external_access: true,
        invite_external: true,
        security_entity: 'anyone_can_view',
        comment_entity: 'anyone_can_view',
        share_entity: 'anyone',
        link_share_entity: 'anyone_readable',
      },
    });

    if (resp?.code !== 0) {
      throw new BadRequestException(`飞书权限设置失败：${resp?.msg || 'unknown error'}`);
    }
  }

  private async resolvePublicUrl(fileToken: string): Promise<string> {
    const configuredPrefix = this.configService.get<string>('MOYUAN_FEISHU_FILE_URL_PREFIX');
    if (configuredPrefix) {
      const prefix = configuredPrefix.endsWith('/') ? configuredPrefix : `${configuredPrefix}/`;
      return `${prefix}${fileToken}`;
    }
    throw new BadRequestException('无法解析飞书访问链接：请配置 MOYUAN_FEISHU_FILE_URL_PREFIX');
  }

  private async uploadSmallFile(params: { fileName: string; parentNode: string; size: number; filepath: string }) {
    const client = this.getClient();
    const resp = await client.drive.file.uploadAll({
      data: {
        file_name: params.fileName,
        parent_type: 'explorer',
        parent_node: params.parentNode,
        size: params.size,
        file: fs.createReadStream(params.filepath),
      },
    });

    const fileToken = resp?.file_token;
    if (!fileToken) {
      throw new BadRequestException('飞书上传失败：未返回 file_token');
    }
    return fileToken;
  }

  private async uploadMultipartFile(params: { fileName: string; parentNode: string; size: number; filepath: string }) {
    const client = this.getClient();
    const prepareResp = await client.drive.file.uploadPrepare({
      data: {
        file_name: params.fileName,
        parent_type: 'explorer',
        parent_node: params.parentNode,
        size: params.size,
      },
    });

    if (prepareResp?.code !== 0) {
      throw new BadRequestException(`飞书预上传失败：${prepareResp?.msg || 'unknown error'}`);
    }

    const uploadId = prepareResp?.data?.upload_id;
    const blockSize = prepareResp?.data?.block_size;
    const blockNum = prepareResp?.data?.block_num;
    if (!uploadId || !blockSize || !blockNum) {
      throw new BadRequestException('飞书预上传失败：未返回 upload_id/block_size/block_num');
    }

    for (let seq = 0; seq < blockNum; seq++) {
      const start = seq * blockSize;
      const end = Math.min(params.size - 1, start + blockSize - 1);
      const chunkSize = end - start + 1;

      await client.drive.file.uploadPart({
        data: {
          upload_id: uploadId,
          seq,
          size: chunkSize,
          file: fs.createReadStream(params.filepath, { start, end }),
        },
      });
    }

    const finishResp = await client.drive.file.uploadFinish({
      data: {
        upload_id: uploadId,
        block_num: blockNum,
      },
    });

    if (finishResp?.code !== 0) {
      throw new BadRequestException(`飞书完成上传失败：${finishResp?.msg || 'unknown error'}`);
    }

    const fileToken = finishResp?.data?.file_token;
    if (!fileToken) {
      throw new BadRequestException('飞书完成上传失败：未返回 file_token');
    }
    return fileToken;
  }

  async uploadLocalFile(input: UploadLocalFileInput) {
    if (!input.filepath || !fs.existsSync(input.filepath)) {
      throw new BadRequestException('文件不存在');
    }

    const parentNode = this.mustGetEnv('MOYUAN_FEISHU_STORAGE_PARENT_NODE');
    const stat = fs.statSync(input.filepath);
    const size = input.size ?? stat.size;

    const fileName = this.buildCandidateFileName(input);
    const smallLimit = 20 * 1024 * 1024;
    const fileToken =
      size <= smallLimit
        ? await this.uploadSmallFile({ fileName, parentNode, size, filepath: input.filepath })
        : await this.uploadMultipartFile({ fileName, parentNode, size, filepath: input.filepath });

    await this.updatePublicPermissions(fileToken);
    const url = await this.resolvePublicUrl(fileToken);

    return {
      fileToken,
      url,
    };
  }
}
