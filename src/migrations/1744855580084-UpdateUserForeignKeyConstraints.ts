import { MigrationInterface, QueryRunner } from "typeorm";

export class UpdateUserForeignKeyConstraints1744855580084 implements MigrationInterface {

    public async up(queryRunner: QueryRunner): Promise<void> {
        // 先删除现有的外键约束
        await queryRunner.query(`ALTER TABLE \`invitation_code\` DROP FOREIGN KEY \`FK_26dc31da3e378f47783dc848c30\``);
        await queryRunner.query(`ALTER TABLE \`invitation_code\` DROP FOREIGN KEY \`FK_92ddc6e660f0268a614041e4059\``);
    
        // 添加新的外键约束
        await queryRunner.query(`ALTER TABLE \`invitation_code\` ADD CONSTRAINT \`FK_26dc31da3e378f47783dc848c30\` FOREIGN KEY (\`createdById\`) REFERENCES \`user\`(\`id\`) ON DELETE SET NULL ON UPDATE CASCADE`);
        await queryRunner.query(`ALTER TABLE \`invitation_code\` ADD CONSTRAINT \`FK_92ddc6e660f0268a614041e4059\` FOREIGN KEY (\`usedById\`) REFERENCES \`user\`(\`id\`) ON DELETE SET NULL ON UPDATE CASCADE`);
    }
    
    public async down(queryRunner: QueryRunner): Promise<void> {
        // 回滚操作
        await queryRunner.query(`ALTER TABLE \`invitation_code\` DROP FOREIGN KEY \`FK_26dc31da3e378f47783dc848c30\``);
        await queryRunner.query(`ALTER TABLE \`invitation_code\` DROP FOREIGN KEY \`FK_92ddc6e660f0268a614041e4059\``);
    
        await queryRunner.query(`ALTER TABLE \`invitation_code\` ADD CONSTRAINT \`FK_26dc31da3e378f47783dc848c30\` FOREIGN KEY (\`createdById\`) REFERENCES \`user\`(\`id\`) ON DELETE NO ACTION ON UPDATE NO ACTION`);
        await queryRunner.query(`ALTER TABLE \`invitation_code\` ADD CONSTRAINT \`FK_92ddc6e660f0268a614041e4059\` FOREIGN KEY (\`usedById\`) REFERENCES \`user\`(\`id\`) ON DELETE NO ACTION ON UPDATE NO ACTION`);
    }

}
