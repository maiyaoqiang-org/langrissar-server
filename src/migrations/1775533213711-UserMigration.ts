import { MigrationInterface, QueryRunner } from "typeorm";

export class UserMigration1775533213711 implements MigrationInterface {
    name = 'UserMigration1775533213711'

    public async up(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`ALTER TABLE \`cron_job\` ADD \`variables\` text NULL COMMENT '自定义变量配置（JSON格式）'`);
    }

    public async down(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`ALTER TABLE \`cron_job\` DROP COLUMN \`variables\``);
    }

}
