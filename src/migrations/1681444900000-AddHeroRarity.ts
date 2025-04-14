import { MigrationInterface, QueryRunner } from "typeorm";

export class AddHeroRarity1681444900000 implements MigrationInterface {
    public async up(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`
            ALTER TABLE hero
            ADD COLUMN rarity int NOT NULL DEFAULT 3
            COMMENT '英雄稀有度，范围1-6，默认3星'
        `);
    }

    public async down(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`
            ALTER TABLE hero
            DROP COLUMN rarity
        `);
    }
}