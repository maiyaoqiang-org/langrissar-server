import { ApiProperty } from '@nestjs/swagger';
import { IsOptional, IsNumber, IsBoolean, IsString, Min, Max, IsDateString } from 'class-validator';
import { Transform } from 'class-transformer';

export class QueryInvitationCodeDto {
  @ApiProperty({
    description: '页码',
    example: 1,
    default: 1,
    required: false
  })
  @IsOptional()
  @IsNumber()
  @Min(1)
  @Transform(({ value }) => Number(value))
  page: number = 1;

  @ApiProperty({
    description: '每页数量',
    example: 10,
    default: 10,
    required: false
  })
  @IsOptional()
  @IsNumber()
  @Min(1)
  @Max(100)
  @Transform(({ value }) => Number(value))
  pageSize: number = 10;

  @ApiProperty({
    description: '是否已使用',
    example: true,
    required: false
  })
  @IsOptional()
  @Transform(({ value }) => {
    if (value === 'true') return true;
    if (value === 'false') return false;
    return value;
  })
  isUsed?: boolean;

  @ApiProperty({
    description: '开始时间',
    example: '2024-01-01',
    required: false
  })
  @IsOptional()
  @IsDateString()
  startDate?: string;

  @ApiProperty({
    description: '结束时间',
    example: '2024-12-31',
    required: false
  })
  @IsOptional()
  @IsDateString()
  endDate?: string;

  @ApiProperty({
    description: '创建者ID',
    example: 1,
    required: false
  })
  @IsOptional()
  @IsNumber()
  @Min(1)
  @Transform(({ value }) => Number(value))
  createdById?: number;
}