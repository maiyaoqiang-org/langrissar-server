import { IsString, IsBoolean, IsArray, IsOptional } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';

export class CreateCozeDto {
  @ApiProperty({ description: 'Bot ID' })
  @IsString()
  botId: string;

  @ApiProperty({ description: 'Token' })
  @IsString()
  token: string;

  @ApiProperty({ description: '是否需要认证' })
  @IsBoolean()
  @IsOptional()
  needAuth?: boolean;

  @ApiProperty({ description: '关联的用户ID列表' })
  @IsArray()
  @IsOptional()
  userIds?: number[];
}