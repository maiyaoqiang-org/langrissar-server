import { MigrationInterface, QueryRunner } from "typeorm";

export class UserMigration1749182348708 implements MigrationInterface {
    name = 'UserMigration1749182348708'

    public async up(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`ALTER TABLE \`account\` DROP COLUMN \`userInfo\``);
        await queryRunner.query(`ALTER TABLE \`account\` ADD \`userInfo\` json NULL COMMENT '用户信息JSON对象'`);
    }

    public async down(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`ALTER TABLE \`account\` DROP COLUMN \`userInfo\``);
        await queryRunner.query(`ALTER TABLE \`account\` ADD \`userInfo\` text NULL COMMENT '用户信息JSON字符串'`);
    }

}
