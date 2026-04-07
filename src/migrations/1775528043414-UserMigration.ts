import { MigrationInterface, QueryRunner } from "typeorm";

export class UserMigration1775528043414 implements MigrationInterface {
    name = 'UserMigration1775528043414'

    public async up(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`ALTER TABLE \`custom_content\` CHANGE \`id\` \`id\` int NOT NULL`);
        await queryRunner.query(`ALTER TABLE \`custom_content\` DROP PRIMARY KEY`);
        await queryRunner.query(`ALTER TABLE \`custom_content\` DROP COLUMN \`id\``);
        await queryRunner.query(`ALTER TABLE \`custom_content\` ADD \`id\` varchar(36) NOT NULL PRIMARY KEY`);
    }

    public async down(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`ALTER TABLE \`custom_content\` DROP COLUMN \`id\``);
        await queryRunner.query(`ALTER TABLE \`custom_content\` ADD \`id\` int NOT NULL AUTO_INCREMENT`);
        await queryRunner.query(`ALTER TABLE \`custom_content\` ADD PRIMARY KEY (\`id\`)`);
        await queryRunner.query(`ALTER TABLE \`custom_content\` CHANGE \`id\` \`id\` int NOT NULL AUTO_INCREMENT`);
    }

}
