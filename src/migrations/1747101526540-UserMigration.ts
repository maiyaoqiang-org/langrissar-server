import { MigrationInterface, QueryRunner } from "typeorm";

export class UserMigration1747101526540 implements MigrationInterface {
    name = 'UserMigration1747101526540'

    public async up(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`ALTER TABLE \`account\` ADD \`createdAt\` timestamp(6) NOT NULL DEFAULT CURRENT_TIMESTAMP(6)`);
        await queryRunner.query(`ALTER TABLE \`account\` ADD \`updatedAt\` timestamp(6) NOT NULL DEFAULT CURRENT_TIMESTAMP(6) ON UPDATE CURRENT_TIMESTAMP(6)`);
        await queryRunner.query(`ALTER TABLE \`used_cdkey\` DROP COLUMN \`usedAt\``);
        await queryRunner.query(`ALTER TABLE \`used_cdkey\` ADD \`usedAt\` datetime(6) NOT NULL DEFAULT CURRENT_TIMESTAMP(6)`);
    }

    public async down(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`ALTER TABLE \`used_cdkey\` DROP COLUMN \`usedAt\``);
        await queryRunner.query(`ALTER TABLE \`used_cdkey\` ADD \`usedAt\` timestamp(0) NOT NULL DEFAULT CURRENT_TIMESTAMP`);
        await queryRunner.query(`ALTER TABLE \`account\` DROP COLUMN \`updatedAt\``);
        await queryRunner.query(`ALTER TABLE \`account\` DROP COLUMN \`createdAt\``);
    }

}
