import { MigrationInterface, QueryRunner } from "typeorm";

export class UserMigration1749463038102 implements MigrationInterface {
    name = 'UserMigration1749463038102'

    public async up(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`ALTER TABLE \`account\` DROP FOREIGN KEY \`FK_account_zlvip\``);
        await queryRunner.query(`ALTER TABLE \`zlvip\` CHANGE \`name\` \`name\` varchar(255) NOT NULL COMMENT '用户名'`);
        await queryRunner.query(`ALTER TABLE \`zlvip\` CHANGE \`userInfo\` \`userInfo\` json NOT NULL COMMENT '用户信息JSON对象'`);
        await queryRunner.query(`ALTER TABLE \`zlvip\` CHANGE \`createdAt\` \`createdAt\` timestamp(6) NOT NULL DEFAULT CURRENT_TIMESTAMP(6)`);
        await queryRunner.query(`ALTER TABLE \`zlvip\` CHANGE \`updatedAt\` \`updatedAt\` timestamp(6) NOT NULL DEFAULT CURRENT_TIMESTAMP(6) ON UPDATE CURRENT_TIMESTAMP(6)`);
        await queryRunner.query(`ALTER TABLE \`account\` ADD CONSTRAINT \`FK_6dd9e0534ced7e1d117932a74f0\` FOREIGN KEY (\`zlVipId\`) REFERENCES \`zlvip\`(\`id\`) ON DELETE NO ACTION ON UPDATE NO ACTION`);
    }

    public async down(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`ALTER TABLE \`account\` DROP FOREIGN KEY \`FK_6dd9e0534ced7e1d117932a74f0\``);
        await queryRunner.query(`ALTER TABLE \`zlvip\` CHANGE \`updatedAt\` \`updatedAt\` timestamp(0) NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP`);
        await queryRunner.query(`ALTER TABLE \`zlvip\` CHANGE \`createdAt\` \`createdAt\` timestamp(0) NOT NULL DEFAULT CURRENT_TIMESTAMP`);
        await queryRunner.query(`ALTER TABLE \`zlvip\` CHANGE \`userInfo\` \`userInfo\` json NOT NULL`);
        await queryRunner.query(`ALTER TABLE \`zlvip\` CHANGE \`name\` \`name\` varchar(255) NOT NULL`);
        await queryRunner.query(`ALTER TABLE \`account\` ADD CONSTRAINT \`FK_account_zlvip\` FOREIGN KEY (\`zlVipId\`) REFERENCES \`zlvip\`(\`id\`) ON DELETE NO ACTION ON UPDATE NO ACTION`);
    }

}
