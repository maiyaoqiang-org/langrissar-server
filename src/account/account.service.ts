import { Injectable } from "@nestjs/common";
import { InjectRepository } from "@nestjs/typeorm";
import { Repository } from "typeorm";
import { Account } from "./entities/account.entity";
import { UsedCdkey } from "./entities/used-cdkey.entity";
import { FeishuService } from "../common/services/feishu.service";
import { ScraperService } from "../scraper/scraper.service";
import axios from "axios";
import * as querystring from "querystring";
import { CreateAccountDto, UpdateAccountDto } from "./dto/account.dto";
import { QueryAccountDto } from "./dto/query-account.dto";
import { CronJob } from 'cron';
import { LoggerService } from '../common/services/logger.service';

export interface ResultItem {
  username: string;
  success: boolean;
  response?: any;
  error?: string;
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
    private scraperService: ScraperService
  ) {
    this.loadUsedCdkeys();
    this.initCronJobs();
  }

  private initCronJobs() {
    const timezone = 'Asia/Shanghai';

    if (process.env.NODE_ENV !== "development") {
      // 每天早上9点和晚上22点执行获取CDKey
      new CronJob('0 0 9,22 * * *', () => {
        this.autoGetAndUseCdkey();
      }, null, true, timezone);

      // 每天凌晨0点01分执行获取每日福利
      new CronJob('1 0 0 * * *', () => {
        this.getPredayReward();
      }, null, true, timezone);

      // 每周二凌晨0点01分执行获取雪莉福利
      new CronJob('2 0 0 * * 2', () => {
        this.getWeeklyReward();
      }, null, true, timezone);

      // 每月8-14号凌晨0点05分执行获取每月福利
      new CronJob('5 0 0 8-14 * *', () => {
        this.getMonthlyReward();
      }, null, true, timezone);
    }
  }

  // 从数据库加载已使用的CDKey
  private async loadUsedCdkeys() {
    try {
      const usedCdkeys = await this.usedCdkeyRepository.find();
      usedCdkeys.forEach((item) => this.usedCdkeys.add(item.cdkey));
      this.logger.info(`已从数据库加载 ${usedCdkeys.length} 个已使用的CDKey`);
    } catch (error) {
      this.logger.error("加载已使用CDKey失败", error);
    }
  }

  async findAll(): Promise<Account[]> {
    return this.accountRepository.find();
  }

  async getPredayReward(): Promise<ResultItem[]> {
    try {
      const accounts = await this.findAll();
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

      // 发送飞书通知
      await this.feishuService.sendMessage(message);

      return results;
    } catch (error) {
      this.logger.error("领取每日福利失败", error);
      throw error;
    }
  }

  async getWeeklyReward(): Promise<ResultItem[]> {
    try {
      const accounts = await this.findAll();
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

      // 发送飞书通知
      await this.feishuService.sendMessage(message);

      return results;
    } catch (error) {
      this.logger.error("领取雪莉福利失败", error);
      throw error;
    }
  }

  async getMonthlyReward(): Promise<ResultItem[]> {
    try {
      const accounts = await this.findAll();
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

      // 发送飞书通知
      await this.feishuService.sendMessage(message);

      return results;
    } catch (error) {
      this.logger.error("领取每月福利失败", error);
      throw error;
    }
  }

  async getCdkeyReward(cdkey: string): Promise<ResultItem[]> {
    try {
      const accounts = await this.findAll();
      const results: ResultItem[] = [];

      // 先检查是否已经使用过这个 CDKey
      if (this.usedCdkeys.has(cdkey)) {
        this.logger.info(`CDKey ${cdkey} 已经使用过，跳过`);
        return results;
      }

      for (const account of accounts) {
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
          results.push({
            username: account.username,
            success: true,
            response: response.data,
          });
          this.logger.info(response.data)
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
        `CDKey(${cdkey})领取结果：\n` +
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

      // 发送飞书通知
      await this.feishuService.sendMessage(message);

      // 如果有成功的领取，则保存 CDKey 到缓存和数据库
      if (successCount > 0) {
        await this.usedCdkeyRepository.save({ cdkey });
        this.usedCdkeys.add(cdkey);
      }

      return results;
    } catch (error) {
      this.logger.error("领取CDKey失败", error);
      throw error;
    }
  }
  
  async autoGetAndUseCdkey(): Promise<string[]> {
    try {
      // 直接调用 scraperService
      const scraperResult = await this.scraperService.scrape({
        url: "https://wiki.biligame.com/langrisser/Giftcode",
        selector: ".cdkey-table .bikited-copy",
      });

      // 处理返回结果，过滤掉 null 值并转换类型
      const cdkeys = scraperResult.content.filter(
        (item): item is string => item !== null
      );
      const results: string[] = [];
      const skippedCdkeys: string[] = [];

      // 遍历所有 CDKey
      for (const cdkey of cdkeys) {
        // 检查是否已经使用过
        if (this.usedCdkeys.has(cdkey)) {
          skippedCdkeys.push(cdkey);
          this.logger.info(`CDKey ${cdkey} 已经使用过，跳过`);
          continue;
        }

        try {
          // 尝试领取 CDKey
          await this.getCdkeyReward(cdkey);
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
      throw error;
    }
  }

  async clearUsedCdkeys(): Promise<{ success: boolean; count: number }> {
    try {
      // 清空数据库中的记录
      const result = await this.usedCdkeyRepository.clear();

      // 清空内存缓存
      const cacheSize = this.usedCdkeys.size;
      this.usedCdkeys.clear();

      // 发送飞书通知
      const message = `清除CDKey缓存成功：\n已清除 ${cacheSize} 个缓存记录`;
      await this.feishuService.sendMessage(message);

      return {
        success: true,
        count: cacheSize,
      };
    } catch (error) {
      this.logger.error("清除CDKey缓存失败", error);
      throw error;
    }
  }

  async createAccount(createAccountDto: CreateAccountDto): Promise<Account> {
    const account = this.accountRepository.create(createAccountDto);
    return this.accountRepository.save(account);
  }

  async updateAccount(
    id: number,
    updateAccountDto: UpdateAccountDto
  ): Promise<Account> {
    await this.accountRepository.update(id, updateAccountDto);
    const updatedAccount = await this.accountRepository.findOne({
      where: { id },
    });

    if (!updatedAccount) {
      throw new Error(`Account with id ${id} not found`);
    }

    return updatedAccount;
  }

  async deleteAccount(id: number): Promise<void> {
    await this.accountRepository.delete(id);
  }

  async findAllPaginated(
    queryDto: QueryAccountDto
  ): Promise<{
    items: Account[];
    total: number;
    page: number;
    pageSize: number;
    totalPages: number;
  }> {
    const query = this.accountRepository
      .createQueryBuilder("account")
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
}
