import { IsOptional, IsString, IsBoolean } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';

export class QueryUserDto {
  @ApiProperty({ required: false })
  @IsOptional()
  @IsString()
  role?: string;

  @ApiProperty({ required: false })
  @IsOptional()
  @IsBoolean()
  isActive?: boolean;

  @ApiProperty({ required: false })
  @IsOptional()
  @IsString()
  phone?: string;

  @ApiProperty({ default: 1 })
  page: number;

  @ApiProperty({ default: 10 })
  pageSize: number;
}