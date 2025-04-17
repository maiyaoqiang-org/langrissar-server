import { IsString, IsNumber } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';

export class UpdatePasswordDto {
  @ApiProperty({ description: '用户ID' })
  @IsNumber()
  id: number;

  @ApiProperty({ description: '新密码' })
  @IsString()
  password: string;
}