import { MigrationInterface, QueryRunner, Table } from 'typeorm';

export class UserMigration1749455962931 implements MigrationInterface {
  name = 'UserMigration1749455962931'

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.createTable(
      new Table({
        name: 'zlvip',
        columns: [
          {
            name: 'id',
            type: 'int',
            isPrimary: true,
            isGenerated: true,
            generationStrategy: 'increment',
          },
          {
            name: 'name',
            type: 'varchar',
            length: '255',
          },
          {
            name: 'userInfo',
            type: 'json',
          },
          {
            name: 'createdAt',
            type: 'timestamp',
            default: 'CURRENT_TIMESTAMP',
          },
          {
            name: 'updatedAt',
            type: 'timestamp',
            default: 'CURRENT_TIMESTAMP',
            onUpdate: 'CURRENT_TIMESTAMP',
          },
        ],
      }),
      true,
    );

    // 添加account表的zlVipId外键
    await queryRunner.query(`
      ALTER TABLE account 
      ADD COLUMN zlVipId INT NULL,
      ADD CONSTRAINT FK_account_zlvip FOREIGN KEY (zlVipId) REFERENCES zlvip(id)
    `);

    // 迁移现有数据，从account表的username填充name字段
    await queryRunner.query(`
      INSERT INTO zlvip (name, userInfo)
      SELECT username, userInfo FROM account WHERE userInfo IS NOT NULL
    `);

    await queryRunner.query(`
      UPDATE account a
      JOIN zlvip z ON a.userInfo = z.userInfo
      SET a.zlVipId = z.id
      WHERE a.userInfo IS NOT NULL
    `);

    // 删除account表的userInfo列
    await queryRunner.query(`
      ALTER TABLE account DROP COLUMN userInfo
    `);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    // 恢复account表的userInfo列
    await queryRunner.query(`
      ALTER TABLE account 
      ADD COLUMN userInfo JSON NULL
    `);

    // 恢复数据
    await queryRunner.query(`
      UPDATE account a
      JOIN zlvip z ON a.zlVipId = z.id
      SET a.userInfo = z.userInfo
      WHERE a.zlVipId IS NOT NULL
    `);

    // 删除外键和列
    await queryRunner.query(`
      ALTER TABLE account 
      DROP FOREIGN KEY FK_account_zlvip,
      DROP COLUMN zlVipId
    `);

    await queryRunner.dropTable('zlvip');
  }
}