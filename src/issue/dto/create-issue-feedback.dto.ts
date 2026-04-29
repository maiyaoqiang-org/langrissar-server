import { ApiProperty } from '@nestjs/swagger';
import { IsString, MaxLength } from 'class-validator';

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
}
