import { Entity, Column, PrimaryGeneratedColumn, CreateDateColumn, ManyToOne, JoinColumn } from 'typeorm';
import { ApiProperty } from '@nestjs/swagger';
import { User } from './user.entity';

@Entity()
export class InvitationCode {
  @ApiProperty({ description: '邀请码ID' })
  @PrimaryGeneratedColumn()
  id: number;

  @ApiProperty({ description: '邀请码' })
  @Column({ unique: true })
  code: string;

  @ApiProperty({ description: '是否已使用' })
  @Column({ default: false })
  isUsed: boolean;

  @ApiProperty({ description: '创建者ID' })
  @Column({ nullable: true })
  createdById: number;

  @ManyToOne(() => User, { nullable: true })
  @JoinColumn({ name: 'createdById' })
  createdBy: User;

  @ApiProperty({ description: '使用者ID' })
  @Column({ nullable: true })
  usedById: number;

  @ManyToOne(() => User, { nullable: true })
  @JoinColumn({ name: 'usedById' })
  usedBy: User;

  @ApiProperty({ description: '创建时间' })
  @CreateDateColumn()
  createdAt: Date;

  @ApiProperty({ description: '使用时间' })
  @Column({ nullable: true })
  usedAt: Date;
}