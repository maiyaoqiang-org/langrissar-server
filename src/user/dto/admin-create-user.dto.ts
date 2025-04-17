import { IsString, IsOptional } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';

export class AdminCreateUserDto {
  @ApiProperty({ description: '手机号' })
  @IsString()
  phone: string;

  @ApiProperty({ description: '密码' })
  @IsString()
  password: string;

  @ApiProperty({ description: '用户名' })
  @IsString()
  username: string;

  @ApiProperty({ description: '角色', required: false })
  @IsOptional()
  @IsString()
  role?: string;
}