import { MigrationInterface, QueryRunner } from "typeorm";

export class UserMigration1775536127325 implements MigrationInterface {
    name = 'UserMigration1775536127325'

    public async up(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`ALTER TABLE \`custom_content\` ADD \`isPublic\` tinyint NOT NULL DEFAULT 0`);
    }

    public async down(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`ALTER TABLE \`custom_content\` DROP COLUMN \`isPublic\``);
    }

}
