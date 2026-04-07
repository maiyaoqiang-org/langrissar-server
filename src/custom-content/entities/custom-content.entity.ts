import { Entity, Column, PrimaryColumn, CreateDateColumn, UpdateDateColumn, DeleteDateColumn } from 'typeorm';
import { ApiProperty } from '@nestjs/swagger';
import { Transform } from 'class-transformer';
import * as dayjs from 'dayjs';

@Entity('custom_content')
export class CustomContent {
  @ApiProperty({ description: 'UUID' })
  @PrimaryColumn({ type: 'varchar', length: 36 })
  id: string;

  @ApiProperty({ description: '唯一标识键', required: false })
  @Column({ length: 255, nullable: true, unique: true })
  key: string;

  @ApiProperty({ description: '标题' })
  @Column({ length: 255 })
  title: string;

  @ApiProperty({ description: '内容' })
  @Column({ type: 'text' })
  content: string;

  @ApiProperty({ description: '内容类型', default: 'text', example: 'json' })
  @Column({ length: 50, default: 'text' })
  contentType: string;

  @ApiProperty({ description: '描述说明', required: false })
  @Column({ length: 500, nullable: true })
  description: string;

  @ApiProperty({ description: '是否启用', default: true })
  @Column({ default: true })
  isActive: boolean;

  @ApiProperty({ description: '是否允许外部访问', default: false })
  @Column({ default: false })
  isPublic: boolean;

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
  deletedAt: Date;
}
