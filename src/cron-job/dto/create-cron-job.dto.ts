import { IsString, IsNotEmpty, IsEnum, IsOptional, IsNumber, Min, IsUrl, ValidateIf } from 'class-validator';
import { TaskType, TaskStatus } from '../entities/cron-job.entity';

export class CreateCronJobDto {
  @IsString()
  @IsNotEmpty({ message: '任务名称不能为空' })
  name: string;

  @IsString()
  @IsOptional()
  description?: string;

  @IsString()
  @IsNotEmpty({ message: 'cron表达式不能为空' })
  cronExpression: string;

  @IsString()
  @IsOptional()
  cronDescription?: string;

  @IsEnum(TaskType, { message: '任务类型不合法' })
  taskType: TaskType;

  @ValidateIf((o) => o.taskType === TaskType.URL)
  @IsUrl({}, { message: '目标URL格式不正确' })
  @IsNotEmpty({ message: 'URL类型任务必须填写目标URL' })
  targetUrl?: string;

  @IsString()
  @IsOptional()
  httpMethod?: string;

  @IsString()
  @IsOptional()
  headers?: string;

  @IsString()
  @IsOptional()
  body?: string;

  @ValidateIf((o) => o.taskType === TaskType.CURL)
  @IsString()
  @IsNotEmpty({ message: 'CURL类型任务必须填写curl命令' })
  curlCommand?: string;

  @IsOptional()
  @IsNumber()
  @Min(1000)
  timeout?: number;

  @IsOptional()
  @IsNumber()
  @Min(0)
  retryCount?: number;

  @IsString()
  @IsOptional()
  variables?: string;
}
