import { MigrationInterface, QueryRunner } from "typeorm";

export class UserMigration1747735466335 implements MigrationInterface {
    name = 'UserMigration1747735466335'

    public async up(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`CREATE TABLE \`openai\` (\`id\` int NOT NULL AUTO_INCREMENT, \`apiKey\` varchar(255) NOT NULL, \`baseURL\` varchar(255) NULL, \`model\` varchar(255) NOT NULL, \`isActive\` tinyint NOT NULL DEFAULT 1, \`createdAt\` timestamp(6) NOT NULL DEFAULT CURRENT_TIMESTAMP(6), \`updatedAt\` timestamp(6) NOT NULL DEFAULT CURRENT_TIMESTAMP(6) ON UPDATE CURRENT_TIMESTAMP(6), \`deletedAt\` timestamp(6) NULL, PRIMARY KEY (\`id\`)) ENGINE=InnoDB`);
    }

    public async down(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`DROP TABLE \`openai\``);
    }

}
