import { ApiProperty } from '@nestjs/swagger';
import { IsOptional, IsString } from 'class-validator';

export class QueryZlVipDto {
  @ApiProperty({ required: false, description: 'VIP名称' })
  @IsOptional()
  name?: string;

  @ApiProperty({ required: false, description: '页码', default: 1 })
  @IsOptional()
  page?: number;

  @ApiProperty({ required: false, description: '每页数量', default: 10 })
  @IsOptional()
  pageSize?: number;
}