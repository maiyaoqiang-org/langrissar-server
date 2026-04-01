import { IsOptional, IsNumber, Min, IsString, IsEnum } from 'class-validator';
import { Type } from 'class-transformer';
import { TaskStatus, TaskType } from '../entities/cron-job.entity';

export class QueryCronJobDto {
  @IsOptional()
  @Type(() => Number)
  @IsNumber()
  @Min(1)
  page?: number = 1;

  @IsOptional()
  @Type(() => Number)
  @IsNumber()
  @Min(1)
  pageSize?: number = 10;

  @IsOptional()
  @IsString()
  name?: string;

  @IsOptional()
  @IsEnum(TaskStatus)
  status?: TaskStatus;

  @IsOptional()
  @IsEnum(TaskType)
  taskType?: TaskType;
}
