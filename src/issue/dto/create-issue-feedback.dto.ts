import { ApiProperty } from '@nestjs/swagger';
import { IsArray, IsOptional, IsString, MaxLength, ArrayMaxSize } from 'class-validator';

export class CreateIssueFeedbackDto {
  @ApiProperty({ description: '昵称', maxLength: 50 })
  @IsString()
  @MaxLength(50)
  nickname: string;

  @ApiProperty({ description: '问题描述', maxLength: 500 })
  @IsString()
  @MaxLength(500)
  question: string;

  @ApiProperty({ description: '验证码ID' })
  @IsString()
  captchaId: string;

  @ApiProperty({ description: '验证码' })
  @IsString()
  captcha: string;

  @ApiProperty({ description: '图片URL列表', required: false, type: [String] })
  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  imageUrls?: string[];

  @ApiProperty({ description: '视频临时ID列表', required: false, type: [String], maxItems: 5 })
  @IsOptional()
  @IsArray()
  @ArrayMaxSize(5)
  @IsString({ each: true })
  videoTempIds?: string[];
}

