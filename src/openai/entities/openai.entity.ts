import { Entity, Column, PrimaryGeneratedColumn, CreateDateColumn, UpdateDateColumn, DeleteDateColumn } from 'typeorm';
import { Transform } from 'class-transformer';
import * as dayjs from 'dayjs';

@Entity('openai')
export class Openai {
  @PrimaryGeneratedColumn()
  id: number;

  @Column()
  apiKey: string;

  @Column({ nullable: true })
  baseURL: string;

  @Column()
  model: string;

  @Column({ default: true })
  isActive: boolean;

  @CreateDateColumn({ type: 'timestamp' })
  @Transform(({ value }) => dayjs(value).format('YYYY-MM-DD HH:mm:ss'), { toPlainOnly: true })
  createdAt: Date;

  @UpdateDateColumn({ type: 'timestamp' })
  @Transform(({ value }) => dayjs(value).format('YYYY-MM-DD HH:mm:ss'), { toPlainOnly: true })
  updatedAt: Date;

  @DeleteDateColumn({ type: 'timestamp' })
  @Transform(({ value }) => dayjs(value).format('YYYY-MM-DD HH:mm:ss'), { toPlainOnly: true })
  deletedAt: Date;
}