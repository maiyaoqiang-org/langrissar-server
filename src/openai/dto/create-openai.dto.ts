import { IsString, IsBoolean, IsOptional } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';

export class CreateOpenaiDto {
  @ApiProperty({ description: 'API Key' })
  @IsString()
  apiKey: string;

  @ApiProperty({ description: 'Base URL', required: false })
  @IsString()
  @IsOptional()
  baseURL?: string;

  @ApiProperty({ description: 'Model' })
  @IsString()
  model: string;

  @ApiProperty({ description: '是否生效', required: false })
  @IsBoolean()
  @IsOptional()
  isActive?: boolean;
}