import { ApiProperty } from '@nestjs/swagger';
import { IsOptional, IsNumberString, IsString, IsEnum } from 'class-validator';
import { Type } from 'class-transformer';

export enum ChatRecordStatus {
  PENDING = 'pending',
  SUCCESS = 'success',
  FAILED = 'failed',
}

export class QueryChatRecordDto {
  @ApiProperty({ description: '页码', required: false, default: 1 })
  @IsOptional()
  @Type(() => Number)
  page?: number = 1;

  @ApiProperty({ description: '每页数量', required: false, default: 10 })
  @IsOptional()
  @Type(() => Number)
  pageSize?: number = 10;

  @ApiProperty({ description: '请求内容关键词', required: false })
  @IsOptional()
  @IsString()
  requestContent?: string;

  @ApiProperty({ description: '响应内容关键词', required: false })
  @IsOptional()
  @IsString()
  responseContent?: string;

  @ApiProperty({ description: '状态', required: false, enum: ChatRecordStatus })
  @IsOptional()
  @IsEnum(ChatRecordStatus)
  status?: ChatRecordStatus;

  @ApiProperty({ description: 'OpenAI配置ID', required: false })
  @IsOptional()
  @Type(() => Number)
  openaiConfigId?: number;

  @ApiProperty({ description: '用户ID', required: false })
  @IsOptional()
  @Type(() => Number)
  userId?: number; // 如果您在 ChatRecord Entity 中关联了 User
}