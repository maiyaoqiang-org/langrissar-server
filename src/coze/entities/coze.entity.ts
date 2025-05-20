import { Entity, Column, PrimaryGeneratedColumn, CreateDateColumn, UpdateDateColumn, DeleteDateColumn, ManyToMany, JoinTable } from 'typeorm';
import { Transform } from 'class-transformer';
import * as dayjs from 'dayjs';
import { User } from '../../user/entities/user.entity';

@Entity('coze')
export class Coze {
  @PrimaryGeneratedColumn()
  id: number;

  @Column()
  botId: string;

  @Column()
  token: string;

  @Column({ default: false })
  needAuth: boolean;

  @CreateDateColumn({ type: 'timestamp' })
  @Transform(({ value }) => dayjs(value).format('YYYY-MM-DD HH:mm:ss'), { toPlainOnly: true })
  createdAt: Date;

  @UpdateDateColumn({ type: 'timestamp' })
  @Transform(({ value }) => dayjs(value).format('YYYY-MM-DD HH:mm:ss'), { toPlainOnly: true })
  updatedAt: Date;

  @DeleteDateColumn({ type: 'timestamp' })
  @Transform(({ value }) => dayjs(value).format('YYYY-MM-DD HH:mm:ss'), { toPlainOnly: true })
  deletedAt: Date;

  @ManyToMany(() => User)
  @JoinTable({
    name: 'coze_users',
    joinColumn: { name: 'coze_id', referencedColumnName: 'id' },
    inverseJoinColumn: { name: 'user_id', referencedColumnName: 'id' }
  })
  users: User[];
}