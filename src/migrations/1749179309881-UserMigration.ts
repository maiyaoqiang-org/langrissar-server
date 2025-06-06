import { MigrationInterface, QueryRunner } from "typeorm";

export class UserMigration1749179309881 implements MigrationInterface {
    name = 'UserMigration1749179309881'

    public async up(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`ALTER TABLE \`account\` ADD \`userInfo\` text NULL COMMENT '用户信息JSON字符串'`);
    }

    public async down(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`ALTER TABLE \`account\` DROP COLUMN \`userInfo\``);
    }

}
