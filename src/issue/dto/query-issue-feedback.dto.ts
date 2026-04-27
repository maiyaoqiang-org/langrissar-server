import { ApiProperty } from '@nestjs/swagger';
import { IsInt, IsOptional, IsString, Max, Min } from 'class-validator';
import { Type } from 'class-transformer';

export class QueryIssueFeedbackDto {
  @ApiProperty({ description: '昵称关键词', required: false })
  @IsOptional()
  @IsString()
  nickname?: string;

  @ApiProperty({ description: '状态', required: false, example: 'pending' })
  @IsOptional()
  @IsString()
  status?: string;

  @ApiProperty({ description: '页码', required: false, default: 1 })
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  page?: number;

  @ApiProperty({ description: '每页数量', required: false, default: 10 })
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  @Max(100)
  pageSize?: number;
}

