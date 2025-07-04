import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { OpenAIController } from './openai.controller';
import { OpenAIService } from './openai.service';
import { Openai } from './entities/openai.entity'; // Assuming this is the path to your repository
import { TypeOrmModule } from '@nestjs/typeorm';
import { ChatRecord } from './entities/chat-record.entity';
import { FeishuService } from '@/common/services/feishu.service';

@Module({
  imports: [ConfigModule,TypeOrmModule.forFeature([Openai, ChatRecord])],
  controllers: [OpenAIController],
  providers: [
    OpenAIService,
    FeishuService
  ],
  exports: [OpenAIService],
})
export class OpenAIModule {}