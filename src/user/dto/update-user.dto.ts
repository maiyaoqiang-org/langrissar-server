import { IsOptional, IsString, IsBoolean, IsNumber } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';
import { Exclude, Expose } from 'class-transformer';

@Exclude()
export class UpdateUserDto {
  @Expose()
  @ApiProperty({ description: '用户ID', required: true })
  @IsNumber()
  id: number;

  @Expose()
  @ApiProperty({ required: false })
  @IsOptional()
  @IsString()
  phone?: string;

  @Expose()
  @ApiProperty({ required: false })
  @IsOptional()
  @IsString()
  role?: string;

  @Expose()
  @ApiProperty({ required: false })
  @IsOptional()
  @IsBoolean()
  isActive?: boolean;
}