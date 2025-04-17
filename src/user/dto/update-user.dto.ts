import { IsOptional, IsString, IsBoolean, IsNumber } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';
import { Exclude, Expose } from 'class-transformer';

export class UpdateUserDto {
  @ApiProperty({ description: '用户ID', required: true })
  @IsNumber()
  id: number;

  @ApiProperty({ required: false })
  @IsOptional()
  @IsString()
  phone?: string;

  @ApiProperty({ required: false })
  @IsOptional()
  @IsString()
  role?: string;

  @ApiProperty({ required: false })
  @IsOptional()
  @IsBoolean()
  isActive?: boolean;

}