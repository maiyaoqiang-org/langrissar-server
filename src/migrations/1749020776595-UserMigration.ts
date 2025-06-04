import { MigrationInterface, QueryRunner } from "typeorm";

export class UserMigration1749020776595 implements MigrationInterface {
    name = 'UserMigration1749020776595'

    public async up(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`ALTER TABLE \`account\` ADD \`account\` varchar(255) NOT NULL`);
        await queryRunner.query(`ALTER TABLE \`account\` ADD \`password\` varchar(255) NOT NULL`);
    }

    public async down(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`ALTER TABLE \`account\` DROP COLUMN \`password\``);
        await queryRunner.query(`ALTER TABLE \`account\` DROP COLUMN \`account\``);
    }

}
