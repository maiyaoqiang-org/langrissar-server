import { Controller, Post, Body, UseGuards, Get, Param, Put, Delete, Request, Res } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiResponse, ApiBearerAuth } from '@nestjs/swagger';
import { OpenAIService } from './openai.service';
import { ChatRequestDto, ChatResponseDto } from './dto/chat.dto';
import { BypassTransformInterceptor } from 'src/common/decorators/bypass-transform.decorator';
import { JwtAuthGuard } from 'src/auth/jwt-auth.guard';
import { RolesGuard } from 'src/auth/roles.guard';
import { Roles } from 'src/auth/roles.decorator';
import { CreateOpenaiDto } from './dto/create-openai.dto';
import { QueryOpenaiDto } from './dto/query-openai.dto';
import { UpdateOpenaiDto } from './dto/update-openai.dto';
import { Public } from 'src/auth/public.decorator';
import { Response } from 'express'; // 导入 Response 类型
import { QueryChatRecordDto } from './dto/query-chat-record.dto'; // 导入查询 DTO
import { ApiBody } from '@nestjs/swagger'; // 导入 ApiBody

@Controller('openai')
@ApiTags('OpenAI配置管理')
@Controller('openai')
@UseGuards(JwtAuthGuard, RolesGuard)
@ApiBearerAuth()
export class OpenAIController {
  constructor(private readonly openaiService: OpenAIService) {}

  @Public()
  @BypassTransformInterceptor()
  @Post('chat')
  @ApiOperation({ summary: 'OpenAI 聊天接口 (使用默认配置)' })
  @ApiResponse({ status: 200, description: '成功' })
  async chat(@Body() chatRequest: ChatRequestDto) {
    return await this.openaiService.chat(chatRequest.content);
  }

  @Public()
  @BypassTransformInterceptor()
  @Post('chat-test')
  @ApiOperation({ summary: 'OpenAI 聊天接口测试' })
  @ApiResponse({ status: 200, description: '成功' })
  async test(@Body() chatRequest: ChatRequestDto) {
    return await this.openaiService.test(chatRequest.content);
  }

  @Post()
  @Roles('admin')
  @ApiOperation({ summary: '创建OpenAI配置' })
  @ApiResponse({ status: 201, description: '创建成功' })
  create(@Body() createOpenaiDto: CreateOpenaiDto) {
    return this.openaiService.create(createOpenaiDto);
  }

  @Post('query')
  @ApiOperation({ summary: '分页查询OpenAI配置' })
  @ApiResponse({ status: 200, description: '查询成功' })
  findAll(@Request() req, @Body() queryDto: QueryOpenaiDto) {
    return this.openaiService.findAll(req.user, queryDto);
  }

  @Get(':id')
  @ApiOperation({ summary: '获取单个OpenAI配置' })
  @ApiResponse({ status: 200, description: '获取成功' })
  findOne(@Param('id') id: string) {
    return this.openaiService.findOne(+id);
  }

  @Put(':id')
  @Roles('admin')
  @ApiOperation({ summary: '更新OpenAI配置' })
  @ApiResponse({ status: 200, description: '更新成功' })
  update(@Param('id') id: string, @Body() updateOpenaiDto: UpdateOpenaiDto) {
    return this.openaiService.update(+id, updateOpenaiDto);
  }

  @Delete(':id')
  @Roles('admin')
  @ApiOperation({ summary: '删除OpenAI配置' })
  @ApiResponse({ status: 200, description: '删除成功' })
  remove(@Param('id') id: string) {
    return this.openaiService.remove(+id);
  }

  @Public() // 根据需要决定是否需要认证
  @BypassTransformInterceptor() // 根据需要决定是否跳过响应转换
  @Post('chat/:id') // 新增接口，通过ID指定配置
  @ApiOperation({ summary: 'OpenAI 聊天接口 (使用指定配置)' })
  @ApiResponse({ status: 200, description: '成功' })
  async chatWithConfig(
    @Param('id') id: string, // 从URL参数获取配置ID
    @Body() chatRequest: ChatRequestDto
  ) {
    // 调用Service中根据ID进行聊天的逻辑
    return await this.openaiService.chatWithConfig(+id, chatRequest.content);
  }

  @Post('chat-records/query') // 分页查询聊天记录接口
  @Roles('admin')
  @ApiOperation({ summary: '分页查询OpenAI聊天记录' })
  @ApiResponse({ status: 200, description: '查询成功' })
  async queryChatRecords(@Body() queryDto: QueryChatRecordDto) {
    return await this.openaiService.findChatRecords(queryDto);
  }

  @Post('chat-records/export') // 新增导出聊天记录接口
  @Roles('admin') // 通常只有管理员才能导出
  @ApiOperation({ summary: '导出OpenAI聊天记录到Excel' })
  @ApiResponse({ status: 200, description: '导出成功', type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' })
  @ApiBody({ type: QueryChatRecordDto, description: '导出过滤条件，包含 exportDate' }) // 使用 QueryChatRecordDto 作为请求体类型
  async exportChatRecords(
    @Body() queryDto: QueryChatRecordDto & { exportDate: string }, // 接收包含 exportDate 的查询参数
    @Res() res: Response // 注入 Response 对象用于文件下载
  ) {
    // 调用 Service 中的导出方法
    const excelBuffer = await this.openaiService.exportChatRecords(queryDto);

    // 设置响应头，触发文件下载
    res.setHeader('Content-Type', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet');
    res.setHeader('Content-Disposition', `attachment; filename=chat_records_${queryDto.exportDate}.xlsx`);
    res.send(excelBuffer);
  }
}