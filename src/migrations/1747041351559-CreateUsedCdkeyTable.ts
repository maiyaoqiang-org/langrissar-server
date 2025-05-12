import { MigrationInterface, QueryRunner, Table } from "typeorm";

export class CreateUsedCdkeyTable1747041351559 implements MigrationInterface {
    public async up(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.createTable(
            new Table({
                name: "used_cdkey",
                columns: [
                    {
                        name: "id",
                        type: "int",
                        isPrimary: true,
                        isGenerated: true,
                        generationStrategy: "increment"
                    },
                    {
                        name: "cdkey",
                        type: "varchar",
                        length: "255",
                        isNullable: false
                    },
                    {
                        name: "usedAt",
                        type: "timestamp",
                        default: "CURRENT_TIMESTAMP"
                    }
                ]
            }),
            true
        );
    }

    public async down(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.dropTable("used_cdkey");
    }
}