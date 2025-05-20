import { Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import OpenAI from 'openai';
import { LoggerService } from '../common/services/logger.service';

@Injectable()
export class OpenAIService {
  private openai: OpenAI;
  private readonly logger = LoggerService.getInstance();

  constructor(private configService: ConfigService) {
    this.openai = new OpenAI({
        apiKey: "pat_cwTGWpIiEJxF1Yx7bXuBA7mCDzj7ovbrfVrmEB4V0LDjYltx3R0LFMFRrl0IGDaR",
        baseURL: "https://moyuan.zeabur.app/v1"
      });
  }

  async chat(content: string) {
    try {
      this.logger.info('OpenAI API 调用开始', { content });
      
      const completion = await this.openai.chat.completions.create({
        messages: [{ role: "user", content }],
        model: "mengzhan",
        // temperature: 0.7,
        // max_tokens: 1000,
      });

      this.logger.info('OpenAI API 调用成功', { response: completion.choices[0].message });
      return { replyContent: completion.choices[0].message.content };
    } catch (error) {
      this.logger.error('OpenAI API 调用失败', { error });
      throw new Error(`OpenAI API 调用失败: ${error.message}`);
    }
  }

  async test(content: string) {
    try {
      return { replyContent: `老子为什么要${content}` };
    } catch (error) {
      this.logger.error('OpenAI API 调用失败', { error });
      throw new Error(`OpenAI API 调用失败: ${error.message}`);
    }
  }
}