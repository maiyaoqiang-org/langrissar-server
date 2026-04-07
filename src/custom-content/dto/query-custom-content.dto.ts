import { IsOptional, IsString, IsNumber, IsBoolean } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';
import { Transform } from 'class-transformer';

export class QueryCustomContentDto {
  @ApiProperty({ description: '页码', required: false })
  @IsNumber()
  @IsOptional()
  @Transform(({ value }) => parseInt(value))
  page?: number = 1;

  @ApiProperty({ description: '每页数量', required: false })
  @IsNumber()
  @IsOptional()
  @Transform(({ value }) => parseInt(value))
  pageSize?: number = 10;

  @ApiProperty({ description: '标识键（模糊搜索）', required: false })
  @IsString()
  @IsOptional()
  key?: string;

  @ApiProperty({ description: '标题（模糊搜索）', required: false })
  @IsString()
  @IsOptional()
  title?: string;

  @ApiProperty({ description: '内容类型', required: false })
  @IsString()
  @IsOptional()
  contentType?: string;

  @ApiProperty({ description: '是否启用', required: false })
  @IsBoolean()
  @IsOptional()
  @Transform(({ value }) => value === 'true' || value === true)
  isActive?: boolean;
}
