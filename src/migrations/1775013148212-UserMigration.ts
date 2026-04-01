import { MigrationInterface, QueryRunner } from "typeorm";

export class UserMigration1775013148212 implements MigrationInterface {
    name = 'UserMigration1775013148212'

    public async up(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`CREATE TABLE \`cron_job\` (\`id\` int NOT NULL AUTO_INCREMENT, \`name\` varchar(255) NOT NULL COMMENT '任务名称', \`description\` text NULL COMMENT '任务描述', \`cronExpression\` varchar(255) NOT NULL COMMENT 'cron表达式', \`cronDescription\` varchar(500) NULL COMMENT 'cron表达式中文描述', \`taskType\` enum ('url', 'curl') NOT NULL COMMENT '任务类型', \`targetUrl\` varchar(1000) NULL COMMENT '目标URL（taskType=url时使用）', \`httpMethod\` varchar(10) NULL COMMENT '请求方法（GET/POST等）' DEFAULT 'GET', \`headers\` text NULL COMMENT '请求头（JSON格式）', \`body\` text NULL COMMENT '请求体', \`curlCommand\` text NULL COMMENT 'curl命令（taskType=curl时使用）', \`status\` enum ('1', '0') NOT NULL COMMENT '任务状态 1启用 0禁用' DEFAULT '1', \`timeout\` int NOT NULL COMMENT '超时时间（毫秒）' DEFAULT '30000', \`retryCount\` int NOT NULL COMMENT '失败重试次数' DEFAULT '0', \`lastRunTime\` timestamp NULL COMMENT '上次执行时间', \`nextRunTime\` timestamp NULL COMMENT '下次执行时间', \`runCount\` int NOT NULL COMMENT '执行次数' DEFAULT '0', \`successCount\` int NOT NULL COMMENT '成功次数' DEFAULT '0', \`failCount\` int NOT NULL COMMENT '失败次数' DEFAULT '0', \`createdAt\` timestamp(6) NOT NULL DEFAULT CURRENT_TIMESTAMP(6), \`updatedAt\` timestamp(6) NOT NULL DEFAULT CURRENT_TIMESTAMP(6) ON UPDATE CURRENT_TIMESTAMP(6), PRIMARY KEY (\`id\`)) ENGINE=InnoDB`);
        await queryRunner.query(`CREATE TABLE \`cron_job_log\` (\`id\` int NOT NULL AUTO_INCREMENT, \`cronJobId\` int NOT NULL COMMENT '关联的定时任务ID', \`status\` enum ('success', 'failed', 'running') NOT NULL COMMENT '执行状态', \`startTime\` timestamp NOT NULL COMMENT '开始时间', \`endTime\` timestamp NULL COMMENT '结束时间', \`duration\` int NULL COMMENT '执行耗时（毫秒）', \`statusCode\` int NULL COMMENT 'HTTP状态码', \`response\` text NULL COMMENT '响应结果', \`errorMessage\` text NULL COMMENT '错误信息', \`retryTimes\` int NOT NULL COMMENT '重试次数' DEFAULT '0', \`createdAt\` timestamp(6) NOT NULL DEFAULT CURRENT_TIMESTAMP(6), PRIMARY KEY (\`id\`)) ENGINE=InnoDB`);
        await queryRunner.query(`ALTER TABLE \`cron_job_log\` ADD CONSTRAINT \`FK_ca82f5dc3d70ef6a7e14e4bfbec\` FOREIGN KEY (\`cronJobId\`) REFERENCES \`cron_job\`(\`id\`) ON DELETE NO ACTION ON UPDATE NO ACTION`);
    }

    public async down(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`ALTER TABLE \`cron_job_log\` DROP FOREIGN KEY \`FK_ca82f5dc3d70ef6a7e14e4bfbec\``);
        await queryRunner.query(`DROP TABLE \`cron_job_log\``);
        await queryRunner.query(`DROP TABLE \`cron_job\``);
    }

}
