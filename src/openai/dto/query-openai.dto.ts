import { IsOptional, IsString, IsNumber, IsBoolean } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';

export class QueryOpenaiDto {
  @ApiProperty({ description: '页码', required: false })
  @IsNumber()
  @IsOptional()
  page?: number = 1;

  @ApiProperty({ description: '每页数量', required: false })
  @IsNumber()
  @IsOptional()
  pageSize?: number = 10;

  @ApiProperty({ description: 'Model', required: false })
  @IsString()
  @IsOptional()
  model?: string;

  @ApiProperty({ description: '是否生效', required: false })
  @IsBoolean()
  @IsOptional()
  isActive?: boolean;
}