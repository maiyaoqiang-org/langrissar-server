import { Controller, Get, Post, Put, Delete, Body, Param, Query, UseGuards } from '@nestjs/common';
import { UsedCdkeyService } from './used-cdkey.service';
import { UsedCdkey } from './entities/used-cdkey.entity';
import { ApiTags, ApiOperation, ApiResponse, ApiBearerAuth, ApiQuery } from '@nestjs/swagger';
import { Roles } from '@/auth/roles.decorator';
import { JwtAuthGuard } from '@/auth/jwt-auth.guard';
import { RolesGuard } from '@/auth/roles.guard';

@ApiTags('使用记录')
@Roles('admin')
@UseGuards(JwtAuthGuard, RolesGuard) 
@Controller('used-cdkeys')
export class UsedCdkeyController {
  constructor(private readonly usedCdkeyService: UsedCdkeyService) {}

  @Post()
  @ApiOperation({ summary: '创建新的使用记录' })
  @ApiResponse({ status: 201, description: '创建成功', type: UsedCdkey })
  async create(@Body('cdkey') cdkey: string): Promise<UsedCdkey> {
    return await this.usedCdkeyService.create(cdkey);
  }

  @Get()
  @ApiOperation({ summary: '获取使用记录（带分页，可选CDKEY过滤）' })
  @ApiResponse({ status: 200, description: '获取成功' })
  @ApiQuery({ name: 'cdkey', required: false, type: String, description: 'CDKEY关键字，不传则查询所有' })
  @ApiQuery({ name: 'page', required: false, type: Number, description: '页码，默认1' })
  @ApiQuery({ name: 'limit', required: false, type: Number, description: '每页条数，默认10' })
  async findAll(
    @Query('cdkey') cdkey?: string,
    @Query('page') page: string = '1',
    @Query('limit') limit: string = '10'
  ): Promise<{
    data: UsedCdkey[];
    total: number;
    page: number;
    limit: number;
  }> {
    return await this.usedCdkeyService.findAll(
      parseInt(page) || 1,
      parseInt(limit) || 10,
      cdkey
    );
  }

  @Get(':id')
  @ApiOperation({ summary: '根据ID获取单条记录' })
  @ApiResponse({ status: 200, description: '获取成功', type: UsedCdkey })
  @ApiResponse({ status: 404, description: '记录未找到' })
  async findOne(@Param('id') id: string): Promise<UsedCdkey> {
    return await this.usedCdkeyService.findOne(+id);
  }

  @Put(':id')
  @ApiOperation({ summary: '更新记录' })
  @ApiResponse({ status: 200, description: '更新成功', type: UsedCdkey })
  @ApiResponse({ status: 404, description: '记录未找到' })
  async update(
    @Param('id') id: string,
    @Body('cdkey') cdkey: string,
  ): Promise<UsedCdkey> {
    return await this.usedCdkeyService.update(+id, cdkey);
  }

  @Delete(':id')
  @ApiOperation({ summary: '删除记录' })
  @ApiResponse({ status: 200, description: '删除成功' })
  @ApiResponse({ status: 404, description: '记录未找到' })
  async remove(@Param('id') id: string): Promise<{ message: string }> {
    await this.usedCdkeyService.remove(+id);
    return { message: '删除成功' };
  }

  @Get('check/:cdkey')
  @ApiOperation({ summary: '检查CDKEY是否已使用' })
  @ApiResponse({ status: 200, description: '检查结果' })
  async checkUsed(@Param('cdkey') cdkey: string): Promise<{ used: boolean }> {
    const used = await this.usedCdkeyService.isUsed(cdkey);
    return { used };
  }
}