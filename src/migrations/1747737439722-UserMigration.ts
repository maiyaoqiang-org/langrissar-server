import { MigrationInterface, QueryRunner } from "typeorm";

export class UserMigration1747737439722 implements MigrationInterface {
    name = 'UserMigration1747737439722'

    public async up(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`CREATE TABLE \`chat_record\` (\`id\` int NOT NULL AUTO_INCREMENT, \`openaiConfigId\` int NULL, \`userId\` int NULL, \`requestContent\` text NOT NULL, \`responseContent\` text NULL, \`status\` varchar(255) NOT NULL DEFAULT 'pending', \`errorMessage\` text NULL, \`createdAt\` timestamp(6) NOT NULL DEFAULT CURRENT_TIMESTAMP(6), \`updatedAt\` timestamp(6) NOT NULL DEFAULT CURRENT_TIMESTAMP(6) ON UPDATE CURRENT_TIMESTAMP(6), PRIMARY KEY (\`id\`)) ENGINE=InnoDB`);
        await queryRunner.query(`ALTER TABLE \`chat_record\` ADD CONSTRAINT \`FK_3a0fbce4240d7c188cf48e3e6ab\` FOREIGN KEY (\`openaiConfigId\`) REFERENCES \`openai\`(\`id\`) ON DELETE NO ACTION ON UPDATE NO ACTION`);
        await queryRunner.query(`ALTER TABLE \`chat_record\` ADD CONSTRAINT \`FK_b36fed798182dfaa34da353f61f\` FOREIGN KEY (\`userId\`) REFERENCES \`user\`(\`id\`) ON DELETE NO ACTION ON UPDATE NO ACTION`);
    }

    public async down(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`ALTER TABLE \`chat_record\` DROP FOREIGN KEY \`FK_b36fed798182dfaa34da353f61f\``);
        await queryRunner.query(`ALTER TABLE \`chat_record\` DROP FOREIGN KEY \`FK_3a0fbce4240d7c188cf48e3e6ab\``);
        await queryRunner.query(`DROP TABLE \`chat_record\``);
    }

}
