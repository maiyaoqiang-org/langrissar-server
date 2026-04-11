import { IsString, IsNotEmpty, IsOptional, IsNumber, IsEnum, Min, Max } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';

export class ScreenshotDto {
  @ApiProperty({ description: '目标网页URL' })
  @IsString()
  @IsNotEmpty()
  url: string;

  @ApiProperty({ description: '图片格式', enum: ['png', 'jpeg'], default: 'png', required: false })
  @IsOptional()
  @IsEnum(['png', 'jpeg'])
  format?: 'png' | 'jpeg';

  @ApiProperty({ description: '图片质量（仅jpeg有效，1-100）', default: 80, required: false })
  @IsOptional()
  @IsNumber()
  @Min(1)
  @Max(100)
  quality?: number;

  @ApiProperty({ description: '视口宽度', default: 1920, required: false })
  @IsOptional()
  @IsNumber()
  @Min(375)
  @Max(3840)
  width?: number;

  @ApiProperty({ description: '视口高度', default: 1080, required: false })
  @IsOptional()
  @IsNumber()
  @Min(400)
  @Max(2160)
  height?: number;

  @ApiProperty({ description: '是否截取完整页面（滚动截屏）', default: true, required: false })
  @IsOptional()
  fullPage?: boolean;

  @ApiProperty({ description: '等待时间（毫秒），页面加载后额外等待时间', default: 2000, required: false })
  @IsOptional()
  @IsNumber()
  @Min(0)
  @Max(30000)
  waitMs?: number;
}
