import { MigrationInterface, QueryRunner } from "typeorm";

export class CreateUserAndInvitationCodeTables1744683159589 implements MigrationInterface {
    name = 'CreateUserAndInvitationCodeTables1744683159589'

    public async up(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`CREATE TABLE \`user\` (\`id\` int NOT NULL AUTO_INCREMENT, \`phone\` varchar(255) NOT NULL, \`password\` varchar(255) NOT NULL, \`role\` varchar(255) NOT NULL DEFAULT 'user', \`isActive\` tinyint NOT NULL DEFAULT 1, \`createdAt\` datetime(6) NOT NULL DEFAULT CURRENT_TIMESTAMP(6), \`updatedAt\` datetime(6) NOT NULL DEFAULT CURRENT_TIMESTAMP(6) ON UPDATE CURRENT_TIMESTAMP(6), UNIQUE INDEX \`IDX_8e1f623798118e629b46a9e629\` (\`phone\`), PRIMARY KEY (\`id\`)) ENGINE=InnoDB`);
        await queryRunner.query(`CREATE TABLE \`invitation_code\` (\`id\` int NOT NULL AUTO_INCREMENT, \`code\` varchar(255) NOT NULL, \`isUsed\` tinyint NOT NULL DEFAULT 0, \`createdById\` int NULL, \`usedById\` int NULL, \`createdAt\` datetime(6) NOT NULL DEFAULT CURRENT_TIMESTAMP(6), \`usedAt\` datetime NULL, UNIQUE INDEX \`IDX_ced87ceaa07fe39e008d258409\` (\`code\`), PRIMARY KEY (\`id\`)) ENGINE=InnoDB`);
        await queryRunner.query(`ALTER TABLE \`hero\` CHANGE \`isActive\` \`isActive\` tinyint NOT NULL DEFAULT 1`);
        await queryRunner.query(`ALTER TABLE \`hero\` CHANGE \`rarity\` \`rarity\` int NOT NULL DEFAULT '3'`);
        await queryRunner.query(`ALTER TABLE \`invitation_code\` ADD CONSTRAINT \`FK_26dc31da3e378f47783dc848c30\` FOREIGN KEY (\`createdById\`) REFERENCES \`user\`(\`id\`) ON DELETE NO ACTION ON UPDATE NO ACTION`);
        await queryRunner.query(`ALTER TABLE \`invitation_code\` ADD CONSTRAINT \`FK_92ddc6e660f0268a614041e4059\` FOREIGN KEY (\`usedById\`) REFERENCES \`user\`(\`id\`) ON DELETE NO ACTION ON UPDATE NO ACTION`);
    }

    public async down(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`ALTER TABLE \`invitation_code\` DROP FOREIGN KEY \`FK_92ddc6e660f0268a614041e4059\``);
        await queryRunner.query(`ALTER TABLE \`invitation_code\` DROP FOREIGN KEY \`FK_26dc31da3e378f47783dc848c30\``);
        await queryRunner.query(`ALTER TABLE \`hero\` CHANGE \`rarity\` \`rarity\` int NOT NULL COMMENT '英雄稀有度，范围1-6，默认3星' DEFAULT '3'`);
        await queryRunner.query(`ALTER TABLE \`hero\` CHANGE \`isActive\` \`isActive\` tinyint(1) NULL DEFAULT '1'`);
        await queryRunner.query(`DROP INDEX \`IDX_ced87ceaa07fe39e008d258409\` ON \`invitation_code\``);
        await queryRunner.query(`DROP TABLE \`invitation_code\``);
        await queryRunner.query(`DROP INDEX \`IDX_8e1f623798118e629b46a9e629\` ON \`user\``);
        await queryRunner.query(`DROP TABLE \`user\``);
    }

}
