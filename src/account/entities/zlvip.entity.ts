import { Entity, Column, PrimaryGeneratedColumn, CreateDateColumn, UpdateDateColumn, OneToMany } from 'typeorm';
import { Account } from './account.entity';
import * as dayjs from 'dayjs';
import { Transform } from 'class-transformer';

@Entity('zlvip')
export class ZlVip {
  @PrimaryGeneratedColumn()
  id: number;

  @Column({ type: 'varchar', length: 255, comment: '用户名' })
  name: string;

  @Column({ type: 'json', comment: '用户信息JSON对象' })
  @Transform(
    ({ value }) => (typeof value === 'string' ? JSON.parse(value) : value),
    { toClassOnly: true }
  )
  @Transform(
    ({ value }) => (typeof value === 'object' ? JSON.stringify(value) : value),
    { toPlainOnly: true }
  )
  userInfo: any;

  @OneToMany(() => Account, account => account.zlVip)
  accounts: Account[];

  @CreateDateColumn({ type: 'timestamp' })
  @Transform(({ value }) => dayjs(value).format('YYYY-MM-DD HH:mm:ss'), { toPlainOnly: true })
  createdAt: Date;

  @UpdateDateColumn({ type: 'timestamp' })
  @Transform(({ value }) => dayjs(value).format('YYYY-MM-DD HH:mm:ss'), { toPlainOnly: true })
  updatedAt: Date;
}