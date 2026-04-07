import { ApiProperty } from '@nestjs/swagger';
import { IsString, IsOptional, MaxLength } from 'class-validator';

export class CreateCustomContentDto {
  @ApiProperty({ description: '唯一标识键', required: false, example: 'app-config' })
  @IsString()
  @IsOptional()
  @MaxLength(255)
  key?: string;

  @ApiProperty({ description: '标题', required: true, example: '应用配置' })
  @IsString()
  @MaxLength(255)
  title: string;

  @ApiProperty({ description: '内容', required: true, example: '{"theme": "dark"}' })
  @IsString()
  content: string;

  @ApiProperty({ description: '内容类型', required: false, default: 'text', example: 'json' })
  @IsString()
  @IsOptional()
  @MaxLength(50)
  contentType?: string;

  @ApiProperty({ description: '描述说明', required: false })
  @IsString()
  @IsOptional()
  @MaxLength(500)
  description?: string;
}
