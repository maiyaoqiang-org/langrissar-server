import { Entity, Column, PrimaryGeneratedColumn, CreateDateColumn, UpdateDateColumn, OneToMany } from 'typeorm';
import * as dayjs from 'dayjs';
import { CronJobLog } from './cron-job-log.entity';
import { Transform } from 'class-transformer';

export enum TaskType {
  URL = 'url',
  CURL = 'curl',
}

export enum TaskStatus {
  ENABLED = 1,
  DISABLED = 0,
}

@Entity('cron_job')
export class CronJobEntity {
  @PrimaryGeneratedColumn()
  id: number;

  @Column({ comment: '任务名称' })
  name: string;

  @Column({ comment: '任务描述', nullable: true, type: 'text' })
  description: string;

  @Column({ comment: 'cron表达式' })
  cronExpression: string;

  @Column({ comment: 'cron表达式中文描述', nullable: true, length: 500 })
  cronDescription: string;

  @Column({ type: 'enum', enum: TaskType, comment: '任务类型' })
  taskType: TaskType;

  @Column({ comment: '目标URL（taskType=url时使用）', nullable: true, length: 1000 })
  targetUrl: string;

  @Column({ comment: '请求方法（GET/POST等）', nullable: true, default: 'GET', length: 10 })
  httpMethod: string;

  @Column({ comment: '请求头（JSON格式）', nullable: true, type: 'text' })
  headers: string;

  @Column({ comment: '请求体', nullable: true, type: 'text' })
  body: string;

  @Column({ comment: 'curl命令（taskType=curl时使用）', nullable: true, type: 'text' })
  curlCommand: string;

  @Column({ type: 'enum', enum: TaskStatus, default: TaskStatus.ENABLED, comment: '任务状态 1启用 0禁用' })
  status: TaskStatus;

  @Column({ comment: '超时时间（毫秒）', default: 30000 })
  timeout: number;

  @Column({ comment: '失败重试次数', default: 0 })
  retryCount: number;

  @Column({ comment: '自定义变量配置（JSON格式）', nullable: true, type: 'text' })
  variables: string;

  @Column({ comment: '上次执行时间', nullable: true, type: 'timestamp' })
  lastRunTime: Date;

  @Column({ comment: '下次执行时间', nullable: true, type: 'timestamp' })
  nextRunTime: Date;

  @Column({ comment: '执行次数', default: 0 })
  runCount: number;

  @Column({ comment: '成功次数', default: 0 })
  successCount: number;

  @Column({ comment: '失败次数', default: 0 })
  failCount: number;

  @CreateDateColumn({ type: 'timestamp' })
  @Transform(({ value }) => dayjs(value).format('YYYY-MM-DD HH:mm:ss'), { toPlainOnly: true })
  createdAt: Date;

  @UpdateDateColumn({ type: 'timestamp' })
  @Transform(({ value }) => dayjs(value).format('YYYY-MM-DD HH:mm:ss'), { toPlainOnly: true })
  updatedAt: Date;

  @OneToMany(() => CronJobLog, (log) => log.cronJob)
  logs: CronJobLog[];
}
