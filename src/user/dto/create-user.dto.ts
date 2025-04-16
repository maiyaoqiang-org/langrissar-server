import { ApiProperty } from '@nestjs/swagger';

export class CreateUserDto {
  @ApiProperty({ 
    description: '手机号',
    example: '13800138000',
    required: true
  })
  phone: string;

  @ApiProperty({ 
    description: '用户名',
    example: 'username123',
    required: true
  })
  username: string;

  @ApiProperty({ 
    description: '密码',
    example: 'password123',
    required: true
  })
  password: string;

  @ApiProperty({ 
    description: '邀请码',
    example: 'ABC123',
    required: true
  })
  invitationCode: string;

  @ApiProperty({ 
    description: '验证码',
    example: '1234',
    required: true
  })
  captcha: string;

  @ApiProperty({ 
    description: '验证码ID',
    example: 'abc123def456',
    required: true
  })
  captchaId: string;
}

export class LoginDto {
  @ApiProperty({ 
    description: '手机号',
    example: '13800138000',
    required: true
  })
  phone: string;

  @ApiProperty({ 
    description: '密码',
    example: 'password123',
    required: true
  })
  password: string;

  @ApiProperty({ 
    description: '验证码',
    example: '1234',
    required: true
  })
  captcha: string;

  @ApiProperty({ 
    description: '验证码ID',
    example: 'abc123def456',
    required: true
  })
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
  count: number = 1;
}