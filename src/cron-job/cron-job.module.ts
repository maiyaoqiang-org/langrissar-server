import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { CronJobController } from './cron-job.controller';
import { CronJobService } from './cron-job.service';
import { CronJobEntity } from './entities/cron-job.entity';
import { CronJobLog } from './entities/cron-job-log.entity';
 import { CustomContent } from '../custom-content/entities/custom-content.entity';

@Module({
  imports: [TypeOrmModule.forFeature([CronJobEntity, CronJobLog, CustomContent])],
  controllers: [CronJobController],
  providers: [CronJobService],
  exports: [CronJobService],
})
export class CronJobModule {}
