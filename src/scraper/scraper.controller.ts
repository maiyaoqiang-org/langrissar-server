import { Controller, Post, Body } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiResponse } from '@nestjs/swagger';
import { ScraperService } from './scraper.service';
import { ScraperDto } from './dto/scraper.dto';

@ApiTags('网页爬虫')
@Controller('scraper')
export class ScraperController {
  constructor(private readonly scraperService: ScraperService) {}

  @Post()
  @ApiOperation({ summary: '网页内容提取' })
  @ApiResponse({ status: 200, description: '提取成功' })
  @ApiResponse({ status: 400, description: '提取失败' })
  async scrape(@Body() dto: ScraperDto) {
    return this.scraperService.scrape(dto);
  }
}