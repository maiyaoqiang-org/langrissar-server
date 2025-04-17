import { ApiProperty } from '@nestjs/swagger';
import { IsString, IsNotEmpty, Length, Matches, IsNumber, Min, Max } from 'class-validator';
import { Exclude } from 'class-transformer';

export class CreateUserDto {
  @ApiProperty({ 
    description: '手机号',
    example: '13800138000',
    required: true
  })
  @IsString()
  @IsNotEmpty()
  @Matches(/^1[3-9]\d{9}$/, { message: '请输入正确的手机号' })
  phone: string;

  @ApiProperty({ 
    description: '用户名',
    example: 'username123',
    required: true
  })
  @IsString()
  @IsNotEmpty()
  @Length(2, 20, { message: '用户名长度必须在2-20个字符之间' })
  username: string;

  @ApiProperty({ 
    description: '密码',
    example: 'password123',
    required: true
  })
  @IsString()
  @IsNotEmpty()
  @Length(6, 20, { message: '密码长度必须在6-20个字符之间' })
  password: string;

  @ApiProperty({ 
    description: '邀请码',
    example: 'ABC123',
    required: true
  })
  @IsString()
  @IsNotEmpty()
  @Length(6, 6, { message: '邀请码长度必须为6位' })
  invitationCode: string;

  @ApiProperty({ 
    description: '验证码',
    example: '1234',
    required: true
  })
  @IsString()
  @IsNotEmpty()
  @Length(4, 4, { message: '验证码长度必须为4位' })
  captcha: string;

  @ApiProperty({ 
    description: '验证码ID',
    example: 'abc123def456',
    required: true
  })
  @IsString()
  @IsNotEmpty()
  captchaId: string;
}

export class LoginDto {
  @ApiProperty({ 
    description: '手机号',
    example: '13800138000',
    required: true
  })
  @IsString()
  @IsNotEmpty()
  @Matches(/^1[3-9]\d{9}$/, { message: '请输入正确的手机号' })
  phone: string;

  @ApiProperty({ 
    description: '密码',
    example: 'password123',
    required: true
  })
  @IsString()
  @IsNotEmpty()
  @Length(6, 20, { message: '密码长度必须在6-20个字符之间' })
  password: string;

  @ApiProperty({ 
    description: '验证码',
    example: '1234',
    required: true
  })
  @IsString()
  @IsNotEmpty()
  @Length(4, 4, { message: '验证码长度必须为4位' })
  captcha: string;

  @ApiProperty({ 
    description: '验证码ID',
    example: 'abc123def456',
    required: true
  })
  @IsString()
  @IsNotEmpty()
  captchaId: string;
}

export class CreateInvitationCodeDto {
  @ApiProperty({ 
    description: '邀请码数量',
    example: 5,
    default: 1,
    minimum: 1,
    maximum: 100
  })
  @IsNumber()
  @Min(1)
  @Max(100)
  count: number = 1;
}