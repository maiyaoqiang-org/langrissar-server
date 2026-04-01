import { IsOptional, IsNumber, Min, IsString, IsEnum, IsDateString } from 'class-validator';
import { Type } from 'class-transformer';
import { LogStatus } from '../entities/cron-job-log.entity';

export class QueryCronJobLogDto {
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
  @Type(() => Number)
  @IsNumber()
  cronJobId?: number;

  @IsOptional()
  @IsEnum(LogStatus)
  status?: LogStatus;

  @IsOptional()
  @IsDateString()
  startDate?: string;

  @IsOptional()
  @IsDateString()
  endDate?: string;
}
