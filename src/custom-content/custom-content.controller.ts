import { Controller, Get, Post, Put, Delete, Body, Param, Query, UseGuards } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiBearerAuth } from '@nestjs/swagger';
import { CustomContentService } from './custom-content.service';
import { CreateCustomContentDto } from './dto/create-custom-content.dto';
import { UpdateCustomContentDto } from './dto/update-custom-content.dto';
import { QueryCustomContentDto } from './dto/query-custom-content.dto';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { RolesGuard } from '../auth/roles.guard';
import { Roles } from '../auth/roles.decorator';
import { Public } from '../auth/public.decorator';

@ApiTags('自定义内容管理')
@Controller('custom-content')
@UseGuards(JwtAuthGuard, RolesGuard)
@ApiBearerAuth()
export class CustomContentController {
  constructor(private readonly customContentService: CustomContentService) {}

  /** 创建自定义内容（admin） */
  @Post()
  @Roles('admin')
  @ApiOperation({ summary: '创建自定义内容' })
  create(@Body() createDto: CreateCustomContentDto) {
    return this.customContentService.create(createDto);
  }

  /** 分页查询自定义内容列表（admin） */
  @Get()
  @Roles('admin')
  @ApiOperation({ summary: '分页查询自定义内容列表' })
  findAll(@Query() queryDto: QueryCustomContentDto) {
    return this.customContentService.findAll(queryDto);
  }

  /** 搜索自定义内容（admin，精简列表，用于变量选择） */
  @Get('search')
  @Roles('admin')
  @ApiOperation({ summary: '搜索自定义内容（精简列表）' })
  search(@Query('keyword') keyword: string) {
    return this.customContentService.search(keyword);
  }

  /** 根据ID获取自定义内容（admin） */
  @Get('detail/:id')
  @Roles('admin')
  @ApiOperation({ summary: '根据ID获取自定义内容' })
  findOne(@Param('id') id: string) {
    return this.customContentService.findOne(id);
  }

  /** 更新自定义内容（admin） */
  @Put(':id')
  @Roles('admin')
  @ApiOperation({ summary: '更新自定义内容' })
  update(@Param('id') id: string, @Body() updateDto: UpdateCustomContentDto) {
    return this.customContentService.update(id, updateDto);
  }

  /** 删除自定义内容（admin） */
  @Delete(':id')
  @Roles('admin')
  @ApiOperation({ summary: '删除自定义内容' })
  remove(@Param('id') id: string) {
    return this.customContentService.remove(id);
  }

  /** 切换启用/停用状态（admin） */
  @Put(':id/toggle')
  @Roles('admin')
  @ApiOperation({ summary: '切换启用/停用状态' })
  toggle(@Param('id') id: string) {
    return this.customContentService.toggle(id);
  }

  /** 切换外部访问状态（admin） */
  @Put(':id/toggle-public')
  @Roles('admin')
  @ApiOperation({ summary: '切换外部访问状态' })
  togglePublic(@Param('id') id: string) {
    return this.customContentService.togglePublic(id);
  }

  /** 公开接口：根据ID查询内容（无需token） */
  @Public()
  @Get('public/id/:id')
  @ApiOperation({ summary: '公开接口-根据ID查询内容' })
  findPublicById(@Param('id') id: string) {
    return this.customContentService.findOneActive(id);
  }

  /** 公开接口：根据key查询内容（无需token） */
  @Public()
  @Get('public/key/:key')
  @ApiOperation({ summary: '公开接口-根据key查询内容' })
  findPublicByKey(@Param('key') key: string) {
    return this.customContentService.findOneActiveByKey(key);
  }
}
