import { ApiProperty } from '@nestjs/swagger';
import { Transform } from 'class-transformer';
import * as dayjs from 'dayjs';
import { Column, CreateDateColumn, DeleteDateColumn, Entity, PrimaryColumn, UpdateDateColumn } from 'typeorm';

@Entity('issue_feedback')
export class IssueFeedback {
  @ApiProperty({ description: 'UUID' })
  @PrimaryColumn({ type: 'varchar', length: 36 })
  id: string;

  @ApiProperty({ description: '昵称' })
  @Column({ length: 50 })
  nickname: string;

  @ApiProperty({ description: '问题描述' })
  @Column({ type: 'text' })
  question: string;

  @ApiProperty({ description: '图片URL列表（JSON字符串）', required: false })
  @Column({ type: 'text', nullable: true })
  imageUrls: string | null;

  @ApiProperty({ description: '视频URL列表（JSON字符串）', required: false })
  @Column({ type: 'text', nullable: true })
  videoUrls: string | null;

  @ApiProperty({ description: '状态', example: 'pending' })
  @Column({ length: 20, default: 'pending' })
  status: string;

  @ApiProperty({ description: '管理员备注', required: false })
  @Column({ type: 'varchar', length: 500, nullable: true })
  adminRemark: string | null;

  @ApiProperty({ description: '创建时间' })
  @CreateDateColumn({ type: 'timestamp' })
  @Transform(({ value }) => dayjs(value).format('YYYY-MM-DD HH:mm:ss'), { toPlainOnly: true })
  createdAt: Date;

  @ApiProperty({ description: '更新时间' })
  @UpdateDateColumn({ type: 'timestamp' })
  @Transform(({ value }) => dayjs(value).format('YYYY-MM-DD HH:mm:ss'), { toPlainOnly: true })
  updatedAt: Date;

  @ApiProperty({ description: '删除时间', required: false })
  @DeleteDateColumn({ type: 'timestamp' })
  @Transform(({ value }) => dayjs(value).format('YYYY-MM-DD HH:mm:ss'), { toPlainOnly: true })
  deletedAt: Date | null;
}
