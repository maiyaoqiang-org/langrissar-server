import { ApiProperty } from '@nestjs/swagger';
import { IsOptional, IsString, MaxLength } from 'class-validator';

export class UpdateIssueFeedbackDto {
  @ApiProperty({ description: '昵称', required: false })
  @IsOptional()
  @IsString()
  @MaxLength(50)
  nickname?: string;

  @ApiProperty({ description: '问题描述', required: false })
  @IsOptional()
  @IsString()
  @MaxLength(500)
  question?: string;

  @ApiProperty({ description: '状态', required: false, example: 'processed' })
  @IsOptional()
  @IsString()
  @MaxLength(20)
  status?: string;

  @ApiProperty({ description: '管理员备注', required: false })
  @IsOptional()
  @IsString()
  @MaxLength(500)
  adminRemark?: string;
}

