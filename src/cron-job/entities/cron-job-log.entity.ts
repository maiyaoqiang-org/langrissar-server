import { Entity, Column, PrimaryGeneratedColumn, CreateDateColumn, ManyToOne, JoinColumn } from 'typeorm';
import * as dayjs from 'dayjs';
import { CronJobEntity } from './cron-job.entity';
import { Transform } from 'class-transformer';

export enum LogStatus {
  SUCCESS = 'success',
  FAILED = 'failed',
  RUNNING = 'running',
}

@Entity('cron_job_log')
export class CronJobLog {
  @PrimaryGeneratedColumn()
  id: number;

  @Column({ comment: '关联的定时任务ID' })
  cronJobId: number;

  @ManyToOne(() => CronJobEntity, (cronJob) => cronJob.logs, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'cronJobId' })
  cronJob: CronJobEntity;

  @Column({ type: 'enum', enum: LogStatus, comment: '执行状态' })
  status: LogStatus;

  @Column({ comment: '开始时间', type: 'timestamp' })
  @Transform(({ value }) => dayjs(value).format('YYYY-MM-DD HH:mm:ss'), { toPlainOnly: true })
  startTime: Date;

  @Column({ comment: '结束时间', nullable: true, type: 'timestamp' })
  @Transform(({ value }) => value ? dayjs(value).format('YYYY-MM-DD HH:mm:ss') : null, { toPlainOnly: true })
  endTime: Date;

  @Column({ comment: '执行耗时（毫秒）', nullable: true })
  duration: number;

  @Column({ comment: 'HTTP状态码', nullable: true })
  statusCode: number;

  @Column({ comment: '响应结果', nullable: true, type: 'text' })
  response: string;

  @Column({ comment: '错误信息', nullable: true, type: 'text' })
  errorMessage: string;

  @Column({ comment: '重试次数', default: 0 })
  retryTimes: number;

  @CreateDateColumn({ type: 'timestamp' })
  @Transform(({ value }) => dayjs(value).format('YYYY-MM-DD HH:mm:ss'), { toPlainOnly: true })
  createdAt: Date;
}
