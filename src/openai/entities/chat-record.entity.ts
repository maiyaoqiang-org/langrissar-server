import { Entity, Column, PrimaryGeneratedColumn, CreateDateColumn, UpdateDateColumn, ManyToOne, JoinColumn } from 'typeorm';
import { Openai } from './openai.entity';
import { User } from '../../user/entities/user.entity'; // 假设User实体路径
import * as dayjs from 'dayjs';
import { Transform } from 'class-transformer';

@Entity('chat_record')
export class ChatRecord {
  @PrimaryGeneratedColumn()
  id: number;

  @Column({ nullable: true }) // 记录使用的OpenAI配置ID，如果使用默认配置则为null
  openaiConfigId: number;

  @ManyToOne(() => Openai, { nullable: true })
  @JoinColumn({ name: 'openaiConfigId' })
  openaiConfig: Openai;

  @Column({ nullable: true }) // 记录调用用户ID，如果需要的话
  userId: number;

  @ManyToOne(() => User, { nullable: true })
  @JoinColumn({ name: 'userId' })
  user: User;

  @Column('text') // 记录用户发送的内容
  requestContent: string;

  @Column('text', { nullable: true }) // 记录AI返回的内容
  responseContent: string | null; // 将类型更改为 string | null

  @Column({ default: 'pending' }) // 调用状态：pending, success, failed
  status: string;

  @Column('text', { nullable: true }) // 如果调用失败，记录错误信息
  errorMessage: string | null; // 错误信息也可能为null，建议同样更改类型

  @CreateDateColumn({ type: 'timestamp' })
  @Transform(({ value }) => dayjs(value).format('YYYY-MM-DD HH:mm:ss'), { toPlainOnly: true })
  createdAt: Date;

  @UpdateDateColumn({ type: 'timestamp' })
  @Transform(({ value }) => dayjs(value).format('YYYY-MM-DD HH:mm:ss'), { toPlainOnly: true })
  updatedAt: Date;
}