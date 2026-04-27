import { MigrationInterface, QueryRunner } from "typeorm";

export class UserMigration1777279718834 implements MigrationInterface {
    name = 'UserMigration1777279718834'

    public async up(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`CREATE TABLE \`issue_feedback\` (\`id\` varchar(36) NOT NULL, \`nickname\` varchar(50) NOT NULL, \`question\` text NOT NULL, \`imageUrls\` text NULL, \`videoUrls\` text NULL, \`status\` varchar(20) NOT NULL DEFAULT 'pending', \`adminRemark\` varchar(500) NULL, \`createdAt\` timestamp(6) NOT NULL DEFAULT CURRENT_TIMESTAMP(6), \`updatedAt\` timestamp(6) NOT NULL DEFAULT CURRENT_TIMESTAMP(6) ON UPDATE CURRENT_TIMESTAMP(6), \`deletedAt\` timestamp(6) NULL, PRIMARY KEY (\`id\`)) ENGINE=InnoDB`);
    }

    public async down(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`DROP TABLE \`issue_feedback\``);
    }

}
