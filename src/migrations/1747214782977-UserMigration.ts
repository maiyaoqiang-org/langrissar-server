import { MigrationInterface, QueryRunner } from "typeorm";

export class UserMigration1747214782977 implements MigrationInterface {
    name = 'UserMigration1747214782977'

    public async up(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`CREATE TABLE \`coze\` (\`id\` int NOT NULL AUTO_INCREMENT, \`botId\` varchar(255) NOT NULL, \`token\` varchar(255) NOT NULL, \`needAuth\` tinyint NOT NULL DEFAULT 0, \`createdAt\` timestamp(6) NOT NULL DEFAULT CURRENT_TIMESTAMP(6), \`updatedAt\` timestamp(6) NOT NULL DEFAULT CURRENT_TIMESTAMP(6) ON UPDATE CURRENT_TIMESTAMP(6), \`deletedAt\` timestamp(6) NULL, PRIMARY KEY (\`id\`)) ENGINE=InnoDB`);
        await queryRunner.query(`CREATE TABLE \`coze_users\` (\`coze_id\` int NOT NULL, \`user_id\` int NOT NULL, INDEX \`IDX_9462b4a351aa5006e5c14d7f1e\` (\`coze_id\`), INDEX \`IDX_c06c7d411ce69de3f0a4cf26f2\` (\`user_id\`), PRIMARY KEY (\`coze_id\`, \`user_id\`)) ENGINE=InnoDB`);
        await queryRunner.query(`ALTER TABLE \`coze_users\` ADD CONSTRAINT \`FK_9462b4a351aa5006e5c14d7f1e1\` FOREIGN KEY (\`coze_id\`) REFERENCES \`coze\`(\`id\`) ON DELETE CASCADE ON UPDATE CASCADE`);
        await queryRunner.query(`ALTER TABLE \`coze_users\` ADD CONSTRAINT \`FK_c06c7d411ce69de3f0a4cf26f25\` FOREIGN KEY (\`user_id\`) REFERENCES \`user\`(\`id\`) ON DELETE CASCADE ON UPDATE CASCADE`);
    }

    public async down(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`ALTER TABLE \`coze_users\` DROP FOREIGN KEY \`FK_c06c7d411ce69de3f0a4cf26f25\``);
        await queryRunner.query(`ALTER TABLE \`coze_users\` DROP FOREIGN KEY \`FK_9462b4a351aa5006e5c14d7f1e1\``);
        await queryRunner.query(`DROP INDEX \`IDX_c06c7d411ce69de3f0a4cf26f2\` ON \`coze_users\``);
        await queryRunner.query(`DROP INDEX \`IDX_9462b4a351aa5006e5c14d7f1e\` ON \`coze_users\``);
        await queryRunner.query(`DROP TABLE \`coze_users\``);
        await queryRunner.query(`DROP TABLE \`coze\``);
    }

}
