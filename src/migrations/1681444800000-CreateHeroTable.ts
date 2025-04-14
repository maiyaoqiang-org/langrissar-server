import { MigrationInterface, QueryRunner } from "typeorm";

export class CreateHeroTable1681444800000 implements MigrationInterface {
    public async up(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`
            CREATE TABLE IF NOT EXISTS hero (
                id int NOT NULL AUTO_INCREMENT,
                name varchar(255) NOT NULL,
                level int NOT NULL,
                isActive boolean DEFAULT true,
                PRIMARY KEY (id)
            )
        `);
    }

    public async down(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`DROP TABLE IF EXISTS hero`);
    }
}