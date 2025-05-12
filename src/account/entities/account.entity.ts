import { Entity, Column, PrimaryGeneratedColumn } from 'typeorm';

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
}