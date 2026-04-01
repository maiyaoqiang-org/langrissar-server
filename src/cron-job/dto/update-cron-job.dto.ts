import { PartialType } from '@nestjs/mapped-types';
import { CreateCronJobDto } from './create-cron-job.dto';
import { IsEnum, IsOptional } from 'class-validator';
import { TaskStatus } from '../entities/cron-job.entity';

export class UpdateCronJobDto extends PartialType(CreateCronJobDto) {
  @IsEnum(TaskStatus, { message: '任务状态不合法' })
  @IsOptional()
  status?: TaskStatus;
}
