import { MigrationInterface, QueryRunner } from "typeorm";

export class UserMigration1744805799222 implements MigrationInterface {
    name = 'UserMigration1744805799222'

    public async up(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`ALTER TABLE \`user\` ADD \`username\` varchar(255) NOT NULL`);
    }

    public async down(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`ALTER TABLE \`user\` DROP COLUMN \`username\``);
    }

}
