import { Controller, Post, Body } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiResponse } from '@nestjs/swagger';
import { OpenAIService } from './openai.service';
import { ChatRequestDto, ChatResponseDto } from './dto/chat.dto';
import { BypassTransformInterceptor } from 'src/common/decorators/bypass-transform.decorator';

@ApiTags('OpenAI')
@Controller('openai')
export class OpenAIController {
  constructor(private readonly openaiService: OpenAIService) {}

  @BypassTransformInterceptor()
  @Post('chat')
  @ApiOperation({ summary: 'OpenAI 聊天接口' })
  @ApiResponse({ status: 200, description: '成功' })
  async chat(@Body() chatRequest: ChatRequestDto) {
    return await this.openaiService.chat(chatRequest.content);
  }

  @BypassTransformInterceptor()
  @Post('chat-test')
  @ApiOperation({ summary: 'OpenAI 聊天接口' })
  @ApiResponse({ status: 200, description: '成功' })
  async test(@Body() chatRequest: ChatRequestDto) {
    return await this.openaiService.test(chatRequest.content);
  }
}