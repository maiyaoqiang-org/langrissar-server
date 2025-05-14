import { IsOptional, IsString, IsNumber, IsBoolean } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';
import { User } from '../../user/entities/user.entity';

export class QueryCozeDto {
  @ApiProperty({ description: '页码', required: false })
  @IsNumber()
  @IsOptional()
  page?: number = 1;

  @ApiProperty({ description: '每页数量', required: false })
  @IsNumber()
  @IsOptional()
  pageSize?: number = 10;

  @ApiProperty({ description: 'Bot ID', required: false })
  @IsString()
  @IsOptional()
  botId?: string;

  @ApiProperty({ description: '是否需要认证', required: false })
  @IsBoolean()
  @IsOptional()
  needAuth?: boolean;

}