import { MigrationInterface, QueryRunner } from "typeorm";

export class UserMigration1749525638646 implements MigrationInterface {
    name = 'UserMigration1749525638646'

    public async up(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`ALTER TABLE \`account\` ADD \`appKey\` varchar(255) NULL`);
    }

    public async down(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`ALTER TABLE \`account\` DROP COLUMN \`appKey\``);
    }

}
