import { ApiProperty } from '@nestjs/swagger';
import { IsNotEmpty, IsString } from 'class-validator';

export class VerifyCaptchaDto {
  @ApiProperty({ description: '验证码ID' })
  @IsString()
  @IsNotEmpty()
  captchaId: string;

  @ApiProperty({ description: '验证码' })
  @IsString()
  @IsNotEmpty()
  captcha: string;
}
