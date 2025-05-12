import { MigrationInterface, QueryRunner, Table } from 'typeorm';

export class CreateAccounts1683881234567 implements MigrationInterface {
  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.createTable(
      new Table({
        name: 'account',
        columns: [
          {
            name: 'id',
            type: 'int',
            isPrimary: true,
            isGenerated: true,
            generationStrategy: 'increment',
          },
          {
            name: 'username',
            type: 'varchar',
            length: '255',
          },
          {
            name: 'userid',
            type: 'varchar',
            length: '255',
          },
          {
            name: 'roleid',
            type: 'varchar',
            length: '255',
          },
          {
            name: 'serverid',
            type: 'varchar',
            length: '255',
          },
        ],
      }),
      true,
    );

    // 插入初始数据
    await queryRunner.query(`
      INSERT INTO account (username, userid, roleid, serverid) VALUES
      ('大号', '27201001100110010360967', '3381548060580781184', '6006'),
      ('小号2', '27201001100110174318106', '3414213342615050474', '6064'),
      ('深藏功与名', '27201001100110024891560', '3409142646694758912', '6055'),
      ('阿哥', '27201001100110010756560', '3383799936165368702', '6010')
    `);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.dropTable('account');
  }
}