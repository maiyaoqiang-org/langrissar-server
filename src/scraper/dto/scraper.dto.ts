import { IsString, IsNotEmpty } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';

export class ScraperDto {
  @ApiProperty({ description: '目标URL' })
  @IsString()
  @IsNotEmpty()
  url: string;

  @ApiProperty({ description: '选择器' })
  @IsString()
  @IsNotEmpty()
  selector: string;
}