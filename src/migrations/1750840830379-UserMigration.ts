import { MigrationInterface, QueryRunner } from "typeorm";

export class UserMigration1750840830379 implements MigrationInterface {
    name = 'UserMigration1750840830379'

    public async up(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`ALTER TABLE \`chat_record\` ADD \`duration\` int NULL COMMENT '总用时（毫秒）'`);
        await queryRunner.query(`ALTER TABLE \`chat_record\` ADD \`timeoutNotified\` tinyint NOT NULL COMMENT '是否主动发送超时消息' DEFAULT 0`);
    }

    public async down(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`ALTER TABLE \`chat_record\` DROP COLUMN \`timeoutNotified\``);
        await queryRunner.query(`ALTER TABLE \`chat_record\` DROP COLUMN \`duration\``);
    }

}
