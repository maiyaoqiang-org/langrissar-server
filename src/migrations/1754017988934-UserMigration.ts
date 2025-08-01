import { MigrationInterface, QueryRunner } from "typeorm";

export class UserMigration1754017988934 implements MigrationInterface {
    name = 'UserMigration1754017988934'

    public async up(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`ALTER TABLE \`account\` ADD \`status\` tinyint NOT NULL COMMENT '账号状态 1启用 0禁用' DEFAULT '1'`);
    }

    public async down(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`ALTER TABLE \`account\` DROP COLUMN \`status\``);
    }

}
