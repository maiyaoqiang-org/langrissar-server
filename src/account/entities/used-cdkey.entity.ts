import { Entity, Column, PrimaryGeneratedColumn, CreateDateColumn } from 'typeorm';

@Entity()
export class UsedCdkey {
  @PrimaryGeneratedColumn()
  id: number;

  @Column()
  cdkey: string;

  @CreateDateColumn()
  usedAt: Date;
}