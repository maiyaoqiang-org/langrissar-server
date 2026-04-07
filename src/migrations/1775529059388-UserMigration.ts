import { MigrationInterface, QueryRunner } from "typeorm";

export class UserMigration1775529059388 implements MigrationInterface {
    name = 'UserMigration1775529059388'

    public async up(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`ALTER TABLE \`custom_content\` ADD \`isActive\` tinyint NOT NULL DEFAULT 1`);
    }

    public async down(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`ALTER TABLE \`custom_content\` DROP COLUMN \`isActive\``);
    }

}
