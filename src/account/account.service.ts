import { HttpException, Injectable, BadRequestException } from "@nestjs/common";
import { InjectRepository } from "@nestjs/typeorm";
import { IsNull, Not, Repository } from "typeorm";
import { Account } from "./entities/account.entity";
import { UsedCdkey } from "./entities/used-cdkey.entity";
import { FeishuService } from "../common/services/feishu.service";
import { ScraperService } from "../scraper/scraper.service";
import axios from "axios";
import * as querystring from "querystring";
import { CreateAccountDto, UpdateAccountDto } from "./dto/account.dto";
import { QueryAccountDto } from "./dto/query-account.dto";
import { CronJob } from "cron";
import { LoggerService } from "../common/services/logger.service";
import {
  ZlvipService,
  CycleType,
  CycleTypeDescription,
  UserInfo,
} from "./zlvip.service"; // 新增：引入 ZlvipService
import { inspect } from "util";
import * as crypto from "crypto";
import { ZlVipUserService } from "./zlvipuser.service";
import { ZlVip } from "./entities/zlvip.entity";
import { HomeGame } from "./entities/home-game.entity";
import { LeanCloudService } from "./leancloud.service";

export interface ResultItem {
  username: string;
  success: boolean;
  response?: any;
  error?: string;
  isValid?: boolean;
}

@Injectable()
export class AccountService {
  private readonly logger = LoggerService.getInstance();
  private usedCdkeys: Set<string> = new Set();

  constructor(
    @InjectRepository(Account)
    private accountRepository: Repository<Account>,
    @InjectRepository(UsedCdkey)
    private usedCdkeyRepository: Repository<UsedCdkey>,
    private feishuService: FeishuService,
    private scraperService: ScraperService,
    @InjectRepository(ZlVip)
    private zlVipRepository: Repository<ZlVip>,
    private leanCloudService: LeanCloudService
  ) {
    this.initCronJobs();
  }

  private initCronJobs() {
    const timezone = "Asia/Shanghai";

    // 在测试环境或明确禁用定时任务时跳过初始化
    if (process.env.NODE_ENV === "test" || process.env.DISABLE_CRON_JOBS === "true") {
      console.log('定时任务已禁用，跳过初始化');
      return;
    }

    if (process.env.NODE_ENV !== "development") {
      // 每天早上9点和晚上22点执行获取CDKey
      new CronJob(
        "0 0 9,22 * * *",
        () => {
          this.autoGetAndUseCdkey();
        },
        null,
        true,
        timezone
      );

      // 每天凌晨0点01分执行获取每日福利
      new CronJob(
        "0 1 0 * * *",
        () => {
          this.getPredayReward();
          this.autoGetVipSignReward();
        },
        null,
        true,
        timezone
      );

      // 每周二早上9点执行获取雪莉福利
      new CronJob(
        "0 1 0 * * 2",
        () => {
          this.getWeeklyReward();
        },
        null,
        true,
        timezone
      );

      // 每月8-14号凌晨0点36分执行获取每月福利
      new CronJob(
        "0 1 0 8-14 * *",
        () => {
          this.getMonthlyReward();
        },
        null,
        true,
        timezone
      );

      // 每月1号凌晨0点24分执行领取autoGetVipReward
      new CronJob(
        "0 1 0 1 * *",
        () => {
          this.autoGetVipReward(CycleType.Monthly);
        },
        null,
        true,
        timezone
      );

      // 每周一凌晨0点01分执行autoGetVipReward
      new CronJob(
        "0 1 0 * * 1",
        () => {
          this.autoGetVipReward(CycleType.Weekly);
        },
        null,
        true,
        timezone
      );
    }
  }


  /**
   * 为指定账号领取CDKey的核心逻辑
   * @param cdkey CDKey兑换码
   * @param account 账号信息
   * @returns 领取结果
   */
  private async redeemCdkeyForAccount(
    cdkey: string,
    account: Account
  ): Promise<ResultItem> {
    const params = {
      appkey: "1486458782785",
      card_channel: "0123456789",
      type: "2",
      _: "1710731751697",
      card_user: account.roleid,
      card_role: account.roleid,
      card_server: account.serverid,
      card_code: cdkey,
    };

    try {
      const url = `https://activity.zlongame.com/activity/cmn/card/csmweb.do?${querystring.stringify(
        params
      )}`;
      const response = await axios.get(url);

      return {
        username: account.username,
        success: true,
        response: response.data,
        isValid: Boolean(response?.data?.success)
      };
    } catch (error) {
      return {
        username: account.username,
        success: false,
        error: error.message,
        isValid: false,
      };
    }
  }

  async findAllMz(): Promise<Account[]> {
    return this.accountRepository.find({
      relations: ["zlVip"], // 添加关联查询
      where: [
        { appKey: ZlvipService.mzAppKey, status: 1 },
        { appKey: IsNull(), status: 1 },
      ],
    });
  }

  private async findMzByIds(accountIds: number[]): Promise<Account[]> {
    if (!accountIds.length) return [];
    return this.accountRepository
      .createQueryBuilder("account")
      .leftJoinAndSelect("account.zlVip", "zlVip")
      .where("account.id IN (:...accountIds)", { accountIds })
      .andWhere("account.status = 1")
      .andWhere("(account.appKey = :mzAppKey OR account.appKey IS NULL)", {
        mzAppKey: ZlvipService.mzAppKey,
      })
      .getMany();
  }

  async findAllVip(): Promise<Array<Account & { homeGame?: HomeGame }>> {
    return this.accountRepository
      .createQueryBuilder("account")
      .leftJoinAndSelect("account.zlVip", "zlVip")
      .leftJoinAndMapOne(
        "account.homeGame",
        "home_game",
        "homeGame",
        "homeGame.appKey = account.appKey"
      )
      .where("zlVip.id IS NOT NULL")
      .getMany();
  }

  private async findVipByIds(
    accountIds: number[]
  ): Promise<Array<Account & { homeGame?: HomeGame }>> {
    if (!accountIds.length) return [];
    return this.accountRepository
      .createQueryBuilder("account")
      .leftJoinAndSelect("account.zlVip", "zlVip")
      .leftJoinAndMapOne(
        "account.homeGame",
        "home_game",
        "homeGame",
        "homeGame.appKey = account.appKey"
      )
      .where("account.id IN (:...accountIds)", { accountIds })
      .andWhere("account.status = 1")
      .andWhere("zlVip.id IS NOT NULL")
      .getMany();
  }

  async getPredayReward(accountIds?: number[]): Promise<ResultItem[]> {
    try {
      const accounts =
        accountIds?.length ? await this.findMzByIds(accountIds) : await this.findAllMz();
      const results: ResultItem[] = [];

      for (const account of accounts) {
        const params = {
          key: "mz_ex_obcenter",
          id: "81",
          userid: account.userid,
          roleid: account.roleid,
          ext1: account.serverid,
        };

        try {
          const url = `https://activity.zlongame.com/activity/cmn/exchange/exchange.do?${querystring.stringify(
            params
          )}`;
          const response = await axios.get(url);
          results.push({
            username: account.username,
            success: true,
            response: response.data,
          });
        } catch (error) {
          results.push({
            username: account.username,
            success: false,
            error: error.message,
          });
        }
      }

      // 整理消息内容
      const successCount = results.filter(
        (r) => r.response?.data?.success
      ).length;
      const failCount = results.length - successCount;

      const message =
        `每日福利领取结果：\n` +
        `总计：${results.length}个账号\n` +
        `成功：${successCount}个\n` +
        `失败：${failCount}个\n\n` +
        `详细信息：\n` +
        results
          .map((r) => {
            const status = r.response?.data?.success ? "成功" : "失败";
            const code = r.response?.data?.code || "未知";
            return `${r.username}: ${status} (code: ${code})`;
          })
          .join("\n");

      this.logger.info(
        JSON.stringify({
          message: "每日福利领取结果",
          results,
        })
      );

      // 发送飞书通知
      await this.feishuService.sendMessage(message);

      return results;
    } catch (error) {
      this.logger.error("领取每日福利失败", error);
      throw error;
    }
  }

  async getWeeklyReward(accountIds?: number[]): Promise<ResultItem[]> {
    try {
      const accounts =
        accountIds?.length ? await this.findMzByIds(accountIds) : await this.findAllMz();
      const results: ResultItem[] = [];

      for (const account of accounts) {
        const params = {
          key: "mz_wx_reward",
          roleid: account.roleid,
          ext1: account.serverid,
        };

        try {
          const url = `https://activity.zlongame.com/activity/cmn/lot/wheel.do?${querystring.stringify(
            params
          )}`;
          const response = await axios.get(url, {
            headers: {
              'Host': "activity.zlongame.com",
              'Connection': "keep-alive",
              'Accept': 'application/json, text/javascript, */*; q=0.01',
              'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/126.0.0.0 Safari/537.36 NetType/WIFI MicroMessenger/7.0.20.1781(0x6700143B) WindowsWechat(0x63090c37) XWEB/14315 Flue',
              'Origin': "https://activity.zlongame.com",
              'Sec-Fetch-Site': 'same-site',
              'Sec-Fetch-Mode': 'cors',
              'Sec-Fetch-Dest': 'empty',
              'Referer': 'https://mz.zlongame.com/',
              'Accept-Encoding': 'gzip, deflate, br',
              'Accept-Language': 'zh-CN,zh;q=0.9',
            }
          });
          results.push({
            username: account.username,
            success: true,
            response: response.data,
          });
        } catch (error) {
          results.push({
            username: account.username,
            success: false,
            error: error.message,
          });
        }
      }

      // 整理消息内容
      const successCount = results.filter(
        (r) => r.response?.data?.success
      ).length;
      const failCount = results.length - successCount;

      const message =
        `每周二雪莉福利领取结果：\n` +
        `总计：${results.length}个账号\n` +
        `成功：${successCount}个\n` +
        `失败：${failCount}个\n\n` +
        `详细信息：\n` +
        results
          .map((r) => {
            const status = r.response?.data?.success ? "成功" : "失败";
            const code = r.response?.data?.code || "未知";
            const rewardName = r.response?.data?.info?.name || "未知奖励";
            return `${r.username}: ${status} (code: ${code}, 奖励: ${rewardName})`;
          })
          .join("\n");

      this.logger.info(
        JSON.stringify({
          message: "每周二雪莉福利领取结果",
          results,
        })
      );

      // 发送飞书通知
      await this.feishuService.sendMessage(message);

      return results;
    } catch (error) {
      this.logger.error("领取雪莉福利失败", error);
      throw error;
    }
  }

  async getMonthlyReward(accountIds?: number[]): Promise<ResultItem[]> {
    try {
      const accounts =
        accountIds?.length ? await this.findMzByIds(accountIds) : await this.findAllMz();
      const results: ResultItem[] = [];

      for (const account of accounts) {
        const params = {
          key: "mz_ex_obcenter",
          id: "97",
          userid: account.userid,
          roleid: account.roleid,
          ext1: account.serverid,
        };

        try {
          const url = `https://activity.zlongame.com/activity/cmn/exchange/exchange.do?${querystring.stringify(
            params
          )}`;
          const response = await axios.get(url);
          results.push({
            username: account.username,
            success: true,
            response: response.data,
          });
        } catch (error) {
          results.push({
            username: account.username,
            success: false,
            error: error.message,
          });
        }
      }

      // 整理消息内容
      const successCount = results.filter(
        (r) => r.response?.data?.success
      ).length;
      const failCount = results.length - successCount;

      const message =
        `每月8号福利领取结果：\n` +
        `总计：${results.length}个账号\n` +
        `成功：${successCount}个\n` +
        `失败：${failCount}个\n\n` +
        `详细信息：\n` +
        results
          .map((r) => {
            const status = r.response?.data?.success ? "成功" : "失败";
            const code = r.response?.data?.code || "未知";
            return `${r.username}: ${status} (code: ${code})`;
          })
          .join("\n");

      this.logger.info(
        JSON.stringify({
          message: "每月8号福利领取结果",
          results,
        })
      );

      // 发送飞书通知
      await this.feishuService.sendMessage(message);

      return results;
    } catch (error) {
      this.logger.error("领取每月福利失败", error);
      throw error;
    }
  }

  /**
   * 为指定账号领取CDKey奖励（不检查usedCdkeys）
   * @param cdkey CDKey兑换码
   * @param accountId 账号ID
   * @returns 领取结果
   */
  async getCdkeyRewardForAccount(
    cdkey: string,
    accountId: number
  ): Promise<ResultItem> {
    try {
      // 根据accountId查询指定账号
      const account = await this.accountRepository.findOne({
        where: { id: accountId },
      });

      if (!account) {
        throw new BadRequestException(`未找到ID为 ${accountId} 的账号`);
      }

      // 直接调用核心领取逻辑，不检查usedCdkeys
      const result = await this.redeemCdkeyForAccount(cdkey, account);

      this.logger.info(
        JSON.stringify({
          message: `为账号 ${account.username} 领取CDKey(${cdkey})结果`,
          result,
        })
      );

      return result;
    } catch (error) {
      this.logger.error(`为账号领取CDKey失败`, error);
      throw error;
    }
  }

  async getCdkeyReward(
    cdkey: string,
    accountIds?: number[]
  ): Promise<ResultItem[]> {
    try {
      const accounts =
        accountIds?.length ? await this.findMzByIds(accountIds) : await this.findAllMz();
      const results: ResultItem[] = [];

      // 改为直接查询数据库检查CDKey是否已使用
      const existingCdkey = await this.usedCdkeyRepository.findOne({
        where: { cdkey }
      });

      if (existingCdkey) {
        this.logger.info(`CDKey ${cdkey} 已经使用过，跳过`);
        return results;
      }

      // 使用抽离的核心逻辑为所有账号领取
      for (const account of accounts) {
        const result = await this.redeemCdkeyForAccount(cdkey, account);
        results.push(result);
      }

      // 整理消息内容（保持不变）
      const successCount = results.filter(
        (r) => r.response?.data?.mailTitle
      ).length;
      const failCount = results.length - successCount;

      const message =
        `CDKey(${cdkey})领取结果：\n` +
        `总计：${results.length}个账号\n` +
        `成功：${successCount}个\n` +
        `失败：${failCount}个\n\n` +
        `详细信息：\n` +
        results
          .map((r) => {
            const mailTitle = r.response?.data?.mailTitle ? "成功" : "失败";
            const giftGoodsMap = r.response?.data?.giftGoodsMap || {};
            const status = r.response?.status;
            return `${r.username
              }: 【status:${status}】 ${mailTitle} ${JSON.stringify(
                giftGoodsMap
              )}`;
          })
          .join("\n");

      this.logger.info(
        JSON.stringify({
          message: `CDKey(${cdkey})领取结果`,
          results,
        })
      );

      // 发送飞书通知
      await this.feishuService.sendMessage(message);

      // 如果有成功的领取，则保存 CDKey 到缓存和数据库
      await this.usedCdkeyRepository.save({ cdkey });
      this.usedCdkeys.add(cdkey);

      return results;
    } catch (error) {
      this.logger.error("领取CDKey失败", error);
      throw error;
    }
  }

  private async getCdkeysFromScraper(): Promise<string[]> {
    try {
      const scraperResult = await this.scraperService.scrape({
        url: "https://wiki.biligame.com/langrisser/Giftcode",
        selector: ".cdkey-table .bikited-copy",
      });
      return scraperResult.content.filter(
        (item): item is string => item !== null
      );
    } catch (error) {
      this.logger.error("爬虫获取CDKey失败", error);
      throw error;
    }
  }
  private async getCdkeysFromLeanCloud(): Promise<string[]> {
    try {
      return await this.leanCloudService.getValidGiftCodes();
    } catch (error) {
      this.logger.error("LeanCloud获取CDKey失败", error);
      throw error;
    }
  }

  // 单独写个获取cdkey逻辑
  async autoGetAllCdKey(): Promise<string[]> {
    let cdkeys: string[] = [];
    try {
      cdkeys = await this.getCdkeysFromScraper();
    } catch (scraperError) {
      await this.feishuService.sendMessage(
        `scraper自动获取CDKey失败：${scraperError.message}`
      );
      try {
        cdkeys = await this.getCdkeysFromLeanCloud();
      } catch (leanCloudError) {
        this.logger.error("CDKey获取全部失败", leanCloudError);
        throw new Error("CDKey获取失败");
      }
    }
    // 去重
    cdkeys = [...new Set(cdkeys)];
    return cdkeys;
  }

  // 领取cdkey梦战专属
  async autoGetAndUseCdkey(accountIds?: number[]): Promise<string[]> {
    try {
      const cdkeys: string[] = await this.autoGetAllCdKey();

      const results: string[] = [];
      const skippedCdkeys: string[] = [];

      // 遍历所有 CDKey
      for (const cdkey of cdkeys) {
        // 改为直接查询数据库检查CDKey是否已使用
        const existingCdkey = await this.usedCdkeyRepository.findOne({
          where: { cdkey }
        });

        if (existingCdkey) {
          skippedCdkeys.push(cdkey);
          this.logger.info(`CDKey ${cdkey} 已经使用过，跳过`);
          continue;
        }

        try {
          // 尝试领取 CDKey
          await this.getCdkeyReward(cdkey, accountIds);
          results.push(cdkey);
        } catch (error) {
          this.logger.error(`处理CDKey ${cdkey} 失败`, error);
        }
      }

      // 发送汇总消息（无论是否有新的CDKey都发送）
      const message =
        `自动CDKey领取汇总：\n` +
        `检测到CDKey总数：${cdkeys.length}个\n` +
        `新领取：${results.length}个\n` +
        `已使用：${skippedCdkeys.length}个\n\n` +
        (results.length > 0
          ? `新领取的CDKey：\n${results.join("\n")}\n\n`
          : "") +
        (skippedCdkeys.length > 0
          ? `已使用的CDKey：\n${skippedCdkeys.join("\n")}`
          : "");

      await this.feishuService.sendMessage(message);

      return results;
    } catch (error) {
      this.logger.error("自动获取CDKey失败", error);
      await this.feishuService.sendMessage(
        `自动获取CDKey失败：${error.message}`
      );
      return [];
    }
  }

  async getVipReward(cycleType: CycleType, account: Account) {
    const vip = new ZlvipService();
    await vip.init(account?.zlVip?.userInfo as UserInfo, account.appKey);
    const res = await vip.autoProjectGift(
      cycleType,
      account.roleid,
      account.serverid
    );
    return res;
  }

  async autoGetVipReward(cycleType: CycleType, accountIds?: number[]) {
    const label = `VIP${CycleTypeDescription[cycleType]}奖励`;
    try {
      const accounts =
        accountIds?.length ? await this.findVipByIds(accountIds) : await this.findAllVip();
      const getVipAccounts = accounts.filter(
        (account) => account.zlVip?.userInfo
      );

      // 用 Promise.allSettled 替换 Promise.all
      const results: any[] = [];
      for (const account of getVipAccounts) {
        try {
          const res = await this.getVipReward(cycleType, account);
          results.push({
            username: account.username,
            game: account.homeGame?.name,
            response: res,
            status: "fulfilled", // 模拟 Promise.allSettled 的 fulfilled 状态
          });
        } catch (error) {
          results.push({
            username: account.username,
            game: account.homeGame?.name,
            reason: error.message, // 模拟 Promise.allSettled 的 rejected 状态
            status: "rejected",
            error: error.message,
          });
        }
      }

      // 生成飞书通知消息
      let message = `自动获取${label}结果：\n`;
      results.forEach((result) => {
        message += `${result.username}-${result.game}\n`;
        if ("error" in result) {
          message += `  错误结果: ${result.error}\n`;
        } else if (Array.isArray(result.response)) {
          if (result.response.length) {
            result.response.forEach((reward) => {
              message += `  礼包名称: ${reward.name}\n`;
              message += `  礼包描述: ${reward.description}\n`;
              message += `  获取结果: ${reward.getResult?.msg}\n`;
              message += `  错误码: ${reward.getResult?.code}\n`;
            });
          } else {
            message += `  获取结果: 无可领取礼包`;
          }
        }
        message += "\n\n";
      });

      this.logger.info(inspect(results, { depth: 4 }));

      // 发送飞书通知
      await this.feishuService.sendMessage(message);

      return message;
    } catch (error) {
      this.logger.error(label + error);
      await this.feishuService.sendMessage(
        `自动获取${label}失败：${error.message}`
      );
      throw error;
    }
  }

  async autoGetVipSignReward(accountIds?: number[]) {
    try {
      let zlVips: ZlVip[] = [];
      if (accountIds?.length) {
        const accounts = await this.accountRepository
          .createQueryBuilder("account")
          .leftJoinAndSelect("account.zlVip", "zlVip")
          .where("account.id IN (:...accountIds)", { accountIds })
          .andWhere("account.status = 1")
          .getMany();
        const selectedVipIds = new Set(
          accounts
            .map((a) => a.zlVip?.id)
            .filter(Boolean)
        );
        if (!selectedVipIds.size) {
          return `紫龙大会员自动签到结果：\n无可签到账号\n`;
        }
        zlVips = await this.zlVipRepository.find({
          where: {
            userInfo: Not(IsNull()),
          },
        });
        zlVips = zlVips.filter((z) => selectedVipIds.has(z.id));
      } else {
        zlVips = await this.zlVipRepository.find({
          where: {
            userInfo: Not(IsNull()),
          },
        });
      }

      const results = await Promise.allSettled(
        zlVips.map(async (zlVip) => {
          const vip = new ZlvipService();
          await vip.init(zlVip?.userInfo as UserInfo, null);
          const res = await vip.signIn();

          return {
            username: zlVip?.name,
            response: res,
          };
        })
      );

      // 统一格式化结果
      const formattedResults = results.map((result) => {
        if (result.status === "fulfilled") {
          return result.value;
        } else {
          return {
            username: "", // 你可以补充zlVip信息
            response: null,
            error: result.reason?.message || String(result.reason),
          };
        }
      });

      this.logger.info(inspect(formattedResults, { depth: 4 }));

      // 生成飞书通知消息
      let message = `紫龙大会员自动签到结果：\n`;
      formattedResults.forEach((result) => {
        message += `用户名: ${result.username}\n`;
        if ("error" in result) {
          message += `  获取结果: ${result.error}\n`;
          message += `  错误码: \n`;
        } else {
          message += `  获取结果: ${result.response?.msg}\n`;
          message += `  错误码: ${result.response?.code}\n`;
        }
        message += "\n";
      });

      // 发送飞书通知
      await this.feishuService.sendMessage(message);

      return message;
    } catch (error) {
      this.logger.error(error);
      await this.feishuService.sendMessage(
        `紫龙大会员自动签到失败：${error.message}`
      );
      throw error;
    }
  }

  async clearUsedCdkeys(): Promise<{ success: boolean; count: number }> {
    try {
      // 获取数据库中的记录数量用于日志
      const count = await this.usedCdkeyRepository.count();
      // 清空数据库中的记录
      const result = await this.usedCdkeyRepository.clear();

      // 发送飞书通知
      const message = `清除CDKey缓存成功：\n已清除 ${count} 个记录`;
      await this.feishuService.sendMessage(message);

      return {
        success: true,
        count: count,
      };
    } catch (error) {
      this.logger.error("清除CDKey缓存失败", error);
      throw error;
    }
  }

  async createAccount(createAccountDto: CreateAccountDto): Promise<Account> {
    // 检查是否存在相同appKey和zlVipId的记录
    if (createAccountDto.appKey && createAccountDto.zlVipId) {
      const existingAccount = await this.accountRepository.findOne({
        where: {
          appKey: createAccountDto.appKey,
          zlVip: { id: createAccountDto.zlVipId },
        },
      });

      if (existingAccount) {
        throw new Error("已存在相同appKey和zlVipId的账号记录");
      }
    }

    const account = this.accountRepository.create(createAccountDto);
    // 添加zlVip关联处理
    if (createAccountDto.zlVipId) {
      account.zlVip = await this.zlVipRepository.findOne({
        where: { id: createAccountDto.zlVipId },
      });
    }
    return this.accountRepository.save(account);
  }

  async updateAccount(
    id: number,
    updateAccountDto: UpdateAccountDto
  ): Promise<Account> {
    const account = await this.accountRepository.findOne({
      where: { id },
    });

    if (!account) {
      throw new Error(`Account with id ${id} not found`);
    }

    // 检查是否存在相同appKey和zlVipId的记录
    if (updateAccountDto.appKey && updateAccountDto.zlVipId) {
      const existingAccount = await this.accountRepository.findOne({
        where: {
          appKey: updateAccountDto.appKey,
          zlVip: { id: updateAccountDto.zlVipId },
        },
      });

      if (existingAccount && existingAccount.id !== id) {
        throw new Error("已存在相同appKey和zlVipId的账号记录");
      }
    }

    // 仅当传值时才更新password
    if (updateAccountDto.password) {
      account.password = updateAccountDto.password;
    }

    // 仅当传值时才更新account
    if (updateAccountDto.account) {
      account.account = updateAccountDto.account;
    }

    // 更新其他属性（排除已单独处理的password和account）
    const { ...otherProps } = updateAccountDto;
    Object.assign(account, otherProps);

    // 添加zlVip关联处理
    if (updateAccountDto.zlVipId) {
      account.zlVip = await this.zlVipRepository.findOne({
        where: { id: updateAccountDto.zlVipId },
      });
    } else {
      account.zlVip = null;
    }

    if (!updateAccountDto.appKey) {
      account.appKey = null;
    }

    return this.accountRepository.save(account);
  }

  async deleteAccount(id: number): Promise<void> {
    await this.accountRepository.delete(id);
  }

  async findAllPaginated(queryDto: QueryAccountDto): Promise<{
    items: Account[];
    total: number;
    page: number;
    pageSize: number;
    totalPages: number;
  }> {
    const query = this.accountRepository
      .createQueryBuilder("account")
      .leftJoinAndSelect("account.zlVip", "zlVip") // 新增：关联查询zlvip
      .orderBy("account.createdAt", "DESC");

    if (queryDto.username) {
      query.andWhere("account.username LIKE :username", {
        username: `%${queryDto.username}%`,
      });
    }

    if (queryDto.userid) {
      query.andWhere("account.userid = :userid", { userid: queryDto.userid });
    }

    if (queryDto.roleid) {
      query.andWhere("account.roleid = :roleid", { roleid: queryDto.roleid });
    }

    if (queryDto.account) {
      query.andWhere("account.account = :account", {
        account: queryDto.account,
      });
    }

    if (queryDto.serverid) {
      query.andWhere("account.serverid = :serverid", {
        serverid: queryDto.serverid,
      });
    }

    const page = Number(queryDto.page) || 1;
    const pageSize = Number(queryDto.pageSize) || 10;
    const [items, total] = await query
      .skip((page - 1) * pageSize)
      .take(pageSize)
      .getManyAndCount();

    return {
      items,
      total,
      page,
      pageSize,
      totalPages: Math.ceil(total / pageSize),
    };
  }

  async getRoleInfo(roleid: string) {
    try {
      // 计算sign值
      const sign = crypto
        .createHash("md5")
        .update(`9e5b6610aa8614abb26e0617f09c3d2e${roleid}`)
        .digest("hex");

      console.log(sign);
      console.log(roleid);

      const url = `https://activity.zlongame.com/activity/cmn/gmt/getroleinfop.do?roleid=${roleid}&game_id=6&sign=${sign}`;
      const response = await axios.get(url);

      return response.data?.roleInfoList;
    } catch (error) {
      this.logger.error("获取角色信息失败", error);
      throw error;
    }
  }

  async getHomeGameList(id: number) {
    const zlVip = await this.zlVipRepository.findOne({ where: { id } });
    const vip = new ZlvipService();
    await vip.init(zlVip?.userInfo as UserInfo, null);
    const res = await vip.homeGameList();
    return res;
  }

  async queryRoleList(id: number, appKey: number) {
    const zlVip = await this.zlVipRepository.findOne({ where: { id } });
    const userInfo = zlVip?.userInfo as UserInfo;
    const cAppKey = Number(appKey || ZlvipService.mzAppKey);
    const vip = new ZlvipService();
    vip.setUserInfo(userInfo, cAppKey);
    if (!vip.currentUser) {
      return [];
    }
    await vip.init(userInfo, cAppKey);
    const res = await vip.queryRoleList();
    return res;
  }

  async setAccountStatus(id: number, status: number) {
    const account = await this.accountRepository.findOneBy({ id });
    if (!account) throw new BadRequestException("账号不存在");
    account.status = status;
    await this.accountRepository.save(account);
    return account;
  }
}
