import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { FeishuStorageController } from './feishu-storage.controller';
import { FeishuStorageService } from './feishu-storage.service';

@Module({
  imports: [ConfigModule],
  controllers: [FeishuStorageController],
  providers: [FeishuStorageService],
  exports: [FeishuStorageService],
})
export class FeishuStorageModule {}

