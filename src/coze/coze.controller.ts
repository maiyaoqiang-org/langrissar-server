import { Controller, Get, Post, Body, Put, Param, Delete, UseGuards, Request } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiResponse, ApiBearerAuth } from '@nestjs/swagger';
import { CozeService } from './coze.service';
import { CreateCozeDto } from './dto/create-coze.dto';
import { UpdateCozeDto } from './dto/update-coze.dto';
import { QueryCozeDto } from './dto/query-coze.dto';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { RolesGuard } from '../auth/roles.guard';
import { Roles } from '../auth/roles.decorator';

@ApiTags('Coze管理')
@Controller('coze')
@UseGuards(JwtAuthGuard, RolesGuard)
@ApiBearerAuth()
export class CozeController {
  constructor(private readonly cozeService: CozeService) {}

  @Post()
  @Roles('admin')
  @ApiOperation({ summary: '创建Coze' })
  @ApiResponse({ status: 201, description: '创建成功' })
  create(@Body() createCozeDto: CreateCozeDto) {
    return this.cozeService.create(createCozeDto);
  }

  @Post('query')
  @ApiOperation({ summary: '分页查询Coze' })
  @ApiResponse({ status: 200, description: '查询成功' })
  findAll(@Request() req, @Body() queryDto: QueryCozeDto) {
    return this.cozeService.findAll(req.user, queryDto);
  }

  @Get(':id')
  @ApiOperation({ summary: '获取单个Coze' })
  @ApiResponse({ status: 200, description: '获取成功' })
  findOne(@Param('id') id: string) {
    return this.cozeService.findOne(+id);
  }

  @Put(':id')
  @Roles('admin')
  @ApiOperation({ summary: '更新Coze' })
  @ApiResponse({ status: 200, description: '更新成功' })
  update(@Param('id') id: string, @Body() updateCozeDto: UpdateCozeDto) {
    return this.cozeService.update(+id, updateCozeDto);
  }

  @Delete(':id')
  @Roles('admin')
  @ApiOperation({ summary: '删除Coze' })
  @ApiResponse({ status: 200, description: '删除成功' })
  remove(@Param('id') id: string) {
    return this.cozeService.remove(+id);
  }
}