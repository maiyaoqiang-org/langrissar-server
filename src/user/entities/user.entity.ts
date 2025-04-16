import { Entity, Column, PrimaryGeneratedColumn, CreateDateColumn, UpdateDateColumn, AfterLoad } from 'typeorm';
import { ApiProperty } from '@nestjs/swagger';
import { Exclude } from 'class-transformer';
import * as dayjs from 'dayjs';
import { Transform } from 'class-transformer';

@Entity()
export class User {
  @ApiProperty({ description: '用户ID' })
  @PrimaryGeneratedColumn()
  id: number;

  @ApiProperty({ description: '手机号' })
  @Column({ unique: true })
  phone: string;

  @ApiProperty({ description: '密码' })
  @Exclude()
  @Column()
  password: string;

  @ApiProperty({ description: '用户角色', example: 'user' })
  @Column({ default: 'user' })
  role: string;

  @ApiProperty({ description: '是否激活', default: true })
  @Column({ default: true })
  isActive: boolean;

  @ApiProperty({ description: '创建时间' })
  @CreateDateColumn()
  @Transform(({ value }) => dayjs(value).format('YYYY-MM-DD HH:mm:ss'), { toPlainOnly: true })
  createdAt: Date;

  @ApiProperty({ description: '更新时间' })
  @UpdateDateColumn()
  @Transform(({ value }) => dayjs(value).format('YYYY-MM-DD HH:mm:ss'), { toPlainOnly: true })
  updatedAt: Date;

  @ApiProperty({ description: '用户名' })
  @Column()
  username: string;
}