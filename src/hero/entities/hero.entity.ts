import { Entity, Column, PrimaryGeneratedColumn } from 'typeorm';
import { ApiProperty } from '@nestjs/swagger';

@Entity()
export class Hero {
  @ApiProperty({ description: '英雄ID' })
  @PrimaryGeneratedColumn()
  id: number;

  @ApiProperty({ description: '英雄名称' })
  @Column()
  name: string;

  @ApiProperty({ description: '英雄等级' })
  @Column()
  level: number;

  @ApiProperty({ description: '是否激活', default: true })
  @Column({ default: true })
  isActive: boolean;

  @Column({ default: 3 })
  @ApiProperty({ 
    description: '英雄稀有度',
    minimum: 1,
    maximum: 6,
    default: 3,
    example: 3
  })
  rarity: number;
}