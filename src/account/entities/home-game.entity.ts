import { Transform } from 'class-transformer';
import { Entity, Column, PrimaryGeneratedColumn } from 'typeorm';

@Entity('home_game')
export class HomeGame {
    @PrimaryGeneratedColumn()
    id: number;

    @Column({ type: 'varchar', length: 32 })
    appId: string;

    @Column({ type: 'bigint' })
    @Transform(({ value }) => Number(value), { toPlainOnly: true })
    appKey: number;

    @Column({ type: 'varchar', length: 64 })
    name: string;

    @Column({ type: 'text', nullable: true })
    itemIcons: string;

    @Column({ type: 'varchar', length: 255 })
    mainIcon: string;

    @Column({ type: 'varchar', length: 255 })
    description: string;

    @Column({ type: 'text', nullable: true })
    extInfo: string;
}