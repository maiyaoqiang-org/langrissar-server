import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { CozeService } from './coze.service';
import { CozeController } from './coze.controller';
import { Coze } from './entities/coze.entity';
import { User } from '../user/entities/user.entity';

@Module({
  imports: [TypeOrmModule.forFeature([Coze, User])],
  controllers: [CozeController],
  providers: [CozeService],
})
export class CozeModule {}