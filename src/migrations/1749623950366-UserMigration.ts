import { MigrationInterface, QueryRunner } from "typeorm";

export class UserMigration1749623950366 implements MigrationInterface {
    name = 'UserMigration1749623950366'

    public async up(queryRunner: QueryRunner): Promise<void> {
        // 1. 创建 home_game 表
        await queryRunner.query(`
            CREATE TABLE \`home_game\` (
                \`id\` int NOT NULL AUTO_INCREMENT,
                \`appId\` varchar(32) NOT NULL,
                \`appKey\` bigint NOT NULL,
                \`name\` varchar(64) NOT NULL,
                \`itemIcons\` text NULL,
                \`mainIcon\` varchar(255) NOT NULL,
                \`description\` varchar(255) NOT NULL,
                \`extInfo\` text NULL,
                PRIMARY KEY (\`id\`)
            ) ENGINE=InnoDB
        `);

        // 2. 修改 account 表 appKey 字段为 bigint
        await queryRunner.query(`ALTER TABLE \`account\` DROP COLUMN \`appKey\``);
        await queryRunner.query(`ALTER TABLE \`account\` ADD \`appKey\` bigint NULL`);

        // 3. 初始化插入 HomeGameList 数据
        await queryRunner.query(`
            INSERT INTO \`home_game\` (\`appId\`, \`appKey\`, \`name\`, \`itemIcons\`, \`mainIcon\`, \`description\`, \`extInfo\`) VALUES
            ('8007', 1656417299063, '龙魂旅人', '["https://media.zlongame.com/media/pictures/cn/vipCenter/assets/img/reward/1656417299063/week.png","https://media.zlongame.com/media/pictures/cn/vipCenter/assets/img/reward/1656417299063/month.png","https://media.zlongame.com/media/pictures/cn/vipCenter/assets/img/reward/1656417299063/birthday.png"]', 'https://media.zlongame.com/media/pictures/cn/vipCenter/assets/img/appkeyIcon/icon_1656417299063.png', '超解压的喜剧后宫番手游', NULL),
            ('8017', 1693534261653, '仙境传说：新启航', '["https://media.zlongame.com/media/pictures/cn/vipCenter/assets/img/reward/1693534261653/week.png","https://media.zlongame.com/media/pictures/cn/vipCenter/assets/img/reward/1693534261653/month.png","https://media.zlongame.com/media/pictures/cn/vipCenter/assets/img/reward/1693534261653/birthday.png"]', 'https://media.zlongame.com/media/pictures/cn/vipCenter/assets/img/appkeyIcon/icon_1693534261653.png', '唯一无商城RO 自由交易', NULL),
            ('73', 1611630374326, '第七史诗', '["https://media.zlongame.com/media/pictures/cn/vipCenter/assets/img/reward/1611630374326/week.png","https://media.zlongame.com/media/pictures/cn/vipCenter/assets/img/reward/1611630374326/month.png","https://media.zlongame.com/media/pictures/cn/vipCenter/assets/img/reward/1611630374326/birthday.png"]', 'https://media.zlongame.com/media/pictures/cn/vipCenter/assets/img/appkeyIcon/icon_1611630374326.png', '跨越时光的不朽史诗RPG', NULL),
            ('27', 1486458782785, '梦幻模拟战', '["http://media.zlongame.com/media/news/cn/mz/大会员中心礼包icon/传奇11.png","http://media.zlongame.com/media/news/cn/mz/大会员中心礼包icon/传奇.png","http://media.zlongame.com/media/news/cn/mz/大会员中心礼包icon/羁绊百宝箱.png"]', 'https://media.zlongame.com/media/pictures/cn/vipCenter/assets/img/appkeyIcon/icon_1486458782785.png', '高策略日式幻想神作', NULL),
            ('61', 1571725187985, '天地劫：幽城再临', '["https://media.zlongame.com/media/news/cn/tdj//website/2025/VIP Gift (1).png","https://media.zlongame.com/media/news/cn/tdj//website/2025/VIP Gift (2).png","https://media.zlongame.com/media/news/cn/tdj//website/2025/VIP Gift（3）.png"]', 'https://media.zlongame.com/media/pictures/cn/vipCenter/assets/img/appkeyIcon/icon_1571725187985.png', '超绝国风奇幻武侠RPG手游', NULL),
            ('78', 1616148215678, '钢岚', '["https://media.zlongame.com/media/pictures/cn/vipCenter/assets/img/reward/1616148215678/week.png","https://media.zlongame.com/media/pictures/cn/vipCenter/assets/img/reward/1616148215678/month.png","https://media.zlongame.com/media/pictures/cn/vipCenter/assets/img/reward/1616148215678/birthday.png"]', 'https://media.zlongame.com/media/pictures/cn/vipCenter/assets/img/appkeyIcon/icon_1616148215678.png', '愿钢之魂永不熄灭!', NULL),
            ('36', 1504685273578, '龙之国物语', '["https://media.zlongame.com/media/pictures/cn/vipCenter/assets/img/reward/1504685273578/week.png","https://media.zlongame.com/media/pictures/cn/vipCenter/assets/img/reward/1504685273578/month.png","https://media.zlongame.com/media/pictures/cn/vipCenter/assets/img/reward/1504685273578/birthday.png"]', 'https://media.zlongame.com/media/pictures/cn/vipCenter/assets/img/appkeyIcon/icon_1504685273578.png', '遇见美好冒险时光', NULL),
            ('22', 1479970009237, '风之大陆', '["https://media.zlongame.com/media/pictures/cn/vipCenter/assets/img/reward/1479970009237/week.png","https://media.zlongame.com/media/pictures/cn/vipCenter/assets/img/reward/1479970009237/month.png","https://media.zlongame.com/media/pictures/cn/vipCenter/assets/img/reward/1479970009237/birthday.png"]', 'https://media.zlongame.com/media/pictures/cn/vipCenter/assets/img/appkeyIcon/icon_1479970009237.png', '于风而起，并肩前行！', NULL)
        `);
    }

    public async down(queryRunner: QueryRunner): Promise<void> {
        // 回滚 account 字段
        await queryRunner.query(`ALTER TABLE \`account\` DROP COLUMN \`appKey\``);
        await queryRunner.query(`ALTER TABLE \`account\` ADD \`appKey\` varchar(255) NULL`);
        // 删除 home_game 表
        await queryRunner.query(`DROP TABLE \`home_game\``);
    }
}
