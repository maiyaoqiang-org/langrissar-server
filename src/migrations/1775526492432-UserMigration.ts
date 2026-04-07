import { MigrationInterface, QueryRunner } from "typeorm";

export class UserMigration1775526492432 implements MigrationInterface {
    name = 'UserMigration1775526492432'

    public async up(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`ALTER TABLE \`cron_job_log\` DROP FOREIGN KEY \`FK_ca82f5dc3d70ef6a7e14e4bfbec\``);
        await queryRunner.query(`CREATE TABLE \`custom_content\` (\`id\` int NOT NULL AUTO_INCREMENT, \`key\` varchar(255) NULL, \`title\` varchar(255) NOT NULL, \`content\` text NOT NULL, \`contentType\` varchar(50) NOT NULL DEFAULT 'text', \`description\` varchar(500) NULL, \`createdAt\` timestamp(6) NOT NULL DEFAULT CURRENT_TIMESTAMP(6), \`updatedAt\` timestamp(6) NOT NULL DEFAULT CURRENT_TIMESTAMP(6) ON UPDATE CURRENT_TIMESTAMP(6), \`deletedAt\` timestamp(6) NULL, UNIQUE INDEX \`IDX_b1005928e834417e8b7518e89d\` (\`key\`), PRIMARY KEY (\`id\`)) ENGINE=InnoDB`);
        await queryRunner.query(`ALTER TABLE \`cron_job_log\` ADD CONSTRAINT \`FK_ca82f5dc3d70ef6a7e14e4bfbec\` FOREIGN KEY (\`cronJobId\`) REFERENCES \`cron_job\`(\`id\`) ON DELETE CASCADE ON UPDATE NO ACTION`);
    }

    public async down(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`ALTER TABLE \`cron_job_log\` DROP FOREIGN KEY \`FK_ca82f5dc3d70ef6a7e14e4bfbec\``);
        await queryRunner.query(`DROP INDEX \`IDX_b1005928e834417e8b7518e89d\` ON \`custom_content\``);
        await queryRunner.query(`DROP TABLE \`custom_content\``);
        await queryRunner.query(`ALTER TABLE \`cron_job_log\` ADD CONSTRAINT \`FK_ca82f5dc3d70ef6a7e14e4bfbec\` FOREIGN KEY (\`cronJobId\`) REFERENCES \`cron_job\`(\`id\`) ON DELETE NO ACTION ON UPDATE NO ACTION`);
    }

}
