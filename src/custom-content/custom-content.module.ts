import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { CustomContentService } from './custom-content.service';
import { CustomContentController } from './custom-content.controller';
import { CustomContent } from './entities/custom-content.entity';

@Module({
  imports: [TypeOrmModule.forFeature([CustomContent])],
  controllers: [CustomContentController],
  providers: [CustomContentService],
})
export class CustomContentModule {}
