import { ApiProperty } from '@nestjs/swagger';
import { IsArray, IsNotEmpty, IsOptional, IsString, IsUUID, MaxLength } from 'class-validator';

export class SubmitV2IssueFeedbackDto {
  @ApiProperty({ description: '昵称', maxLength: 50 })
  @IsString()
  @IsNotEmpty()
  @MaxLength(50)
  nickname: string;

  @ApiProperty({ description: '问题描述', maxLength: 500 })
  @IsString()
  @IsNotEmpty()
  @MaxLength(500)
  question: string;

  @ApiProperty({ description: '已上传文件的 pendingFileId 列表', type: [String], required: false })
  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  pendingFileIds?: string[];
}
