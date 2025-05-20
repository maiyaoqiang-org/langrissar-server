import { Transform } from 'class-transformer';
import dayjs from 'dayjs';
import { Entity, Column, PrimaryGeneratedColumn, CreateDateColumn, UpdateDateColumn } from 'typeorm';

@Entity('account')
export class Account {
  @PrimaryGeneratedColumn()
  id: number;

  @Column()
  username: string;

  @Column()
  userid: string;

  @Column()
  roleid: string;

  @Column()
  serverid: string;

  @CreateDateColumn({ type: 'timestamp' })
  @Transform(({ value }) => dayjs(value).format('YYYY-MM-DD HH:mm:ss'), { toPlainOnly: true })
  createdAt: Date;

  @UpdateDateColumn({ type: 'timestamp' })
  @Transform(({ value }) => dayjs(value).format('YYYY-MM-DD HH:mm:ss'), { toPlainOnly: true })
  updatedAt: Date;
}