import { Injectable, Logger } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Account } from './entities/account.entity';
import { UsedCdkey } from './entities/used-cdkey.entity';
import { FeishuService } from '../common/services/feishu.service';
import { ScraperService } from '../scraper/scraper.service';
import { Cron } from '@nestjs/schedule';
import axios from 'axios';
import * as querystring from 'querystring';

export interface ResultItem {  // 添加 export 关键字
  username: string;
  success: boolean;
  response?: any;
  error?: string;
}

@Injectable()
export class AccountService {
  private readonly logger = new Logger(AccountService.name);
  private usedCdkeys: Set<string> = new Set();

  constructor(
    @InjectRepository(Account)
    private accountRepository: Repository<Account>,
    @InjectRepository(UsedCdkey)
    private usedCdkeyRepository: Repository<UsedCdkey>,
    private feishuService: FeishuService,
    private scraperService: ScraperService
  ) {
    // 服务启动时从数据库加载已使用的CDKey
    this.loadUsedCdkeys();
  }

  // 从数据库加载已使用的CDKey
  private async loadUsedCdkeys() {
    try {
      const usedCdkeys = await this.usedCdkeyRepository.find();
      usedCdkeys.forEach(item => this.usedCdkeys.add(item.cdkey));
      this.logger.log(`已从数据库加载 ${usedCdkeys.length} 个已使用的CDKey`);
    } catch (error) {
      this.logger.error('加载已使用CDKey失败', error);
    }
  }

  async findAll(): Promise<Account[]> {
    return this.accountRepository.find();
  }

  // 添加定时任务装饰器，每天凌晨1点执行
  @Cron('0 0 1 * * *')
  async getPredayReward(): Promise<ResultItem[]> {
    try {
      const accounts = await this.findAll();
      const results: ResultItem[] = [];

      for (const account of accounts) {
        const params = {
          key: 'mz_ex_obcenter',
          id: '81',
          userid: account.userid,
          roleid: account.roleid,
          ext1: account.serverid,
        };

        try {
          const url = `https://activity.zlongame.com/activity/cmn/exchange/exchange.do?${querystring.stringify(params)}`;
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
      const successCount = results.filter(r => r.response?.data?.success).length;
      const failCount = results.length - successCount;
      
      const message = `每日福利领取结果：\n` +
        `总计：${results.length}个账号\n` +
        `成功：${successCount}个\n` +
        `失败：${failCount}个\n\n` +
        `详细信息：\n` +
        results.map(r => {
          const status = r.response?.data?.success ? '成功' : '失败';
          const code = r.response?.data?.code || '未知';
          return `${r.username}: ${status} (code: ${code})`;
        }).join('\n');

      // 发送飞书通知
      await this.feishuService.sendMessage(message);

      return results;
    } catch (error) {
      this.logger.error('领取每日福利失败', error);
      throw error;
    }
  }

  // 添加雪莉福利领取方法
  @Cron('0 0 2 * * 2')  // 每周二凌晨2点执行
  async getWeeklyReward(): Promise<ResultItem[]> {
    try {
      const accounts = await this.findAll();
      const results: ResultItem[] = [];

      for (const account of accounts) {
        const params = {
          key: 'mz_wx_reward',
          roleid: account.roleid,
          ext1: account.serverid,
        };

        try {
          const url = `https://activity.zlongame.com/activity/cmn/lot/wheel.do?${querystring.stringify(params)}`;
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
      const successCount = results.filter(r => r.response?.data?.success).length;
      const failCount = results.length - successCount;
      
      const message = `每周二雪莉福利领取结果：\n` +
        `总计：${results.length}个账号\n` +
        `成功：${successCount}个\n` +
        `失败：${failCount}个\n\n` +
        `详细信息：\n` +
        results.map(r => {
          const status = r.response?.data?.success ? '成功' : '失败';
          const code = r.response?.data?.code || '未知';
          const rewardName = r.response?.data?.info?.name || '未知奖励';
          return `${r.username}: ${status} (code: ${code}, 奖励: ${rewardName})`;
        }).join('\n');

      // 发送飞书通知
      await this.feishuService.sendMessage(message);

      return results;
    } catch (error) {
      this.logger.error('领取雪莉福利失败', error);
      throw error;
    }
  }

  // 添加每月8号福利领取方法
  @Cron('0 0 9 8 * *')  // 每月8号早上9点执行
  async getMonthlyReward(): Promise<ResultItem[]> {
    try {
      const accounts = await this.findAll();
      const results: ResultItem[] = [];

      for (const account of accounts) {
        const params = {
          key: 'mz_ex_obcenter',
          id: '97',
          userid: account.userid,
          roleid: account.roleid,
          ext1: account.serverid,
        };

        try {
          const url = `https://activity.zlongame.com/activity/cmn/exchange/exchange.do?${querystring.stringify(params)}`;
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
      const successCount = results.filter(r => r.response?.data?.success).length;
      const failCount = results.length - successCount;
      
      const message = `每月8号福利领取结果：\n` +
        `总计：${results.length}个账号\n` +
        `成功：${successCount}个\n` +
        `失败：${failCount}个\n\n` +
        `详细信息：\n` +
        results.map(r => {
          const status = r.response?.data?.success ? '成功' : '失败';
          const code = r.response?.data?.code || '未知';
          return `${r.username}: ${status} (code: ${code})`;
        }).join('\n');

      // 发送飞书通知
      await this.feishuService.sendMessage(message);

      return results;
    } catch (error) {
      this.logger.error('领取每月福利失败', error);
      throw error;
    }
  }

  async getCdkeyReward(cdkey: string): Promise<ResultItem[]> {
    try {
      const accounts = await this.findAll();
      const results: ResultItem[] = [];

      for (const account of accounts) {
        const params = {
          appkey: '1486458782785',
          card_channel: '0123456789',
          type: '2',
          _: '1710731751697',
          card_user: account.roleid,
          card_role: account.roleid,
          card_server: account.serverid,
          card_code: cdkey
        };

        try {
          const url = `https://activity.zlongame.com/activity/cmn/card/csmweb.do?${querystring.stringify(params)}`;
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
      const successCount = results.filter(r => r.response?.data?.success).length;
      const failCount = results.length - successCount;
      
      const message = `CDKey(${cdkey})领取结果：\n` +
        `总计：${results.length}个账号\n` +
        `成功：${successCount}个\n` +
        `失败：${failCount}个\n\n` +
        `详细信息：\n` +
        results.map(r => {
          const status = r.response?.data?.success ? '成功' : '失败';
          const code = r.response?.data?.code || '未知';
          return `${r.username}: ${status} (code: ${code})`;
        }).join('\n');

      // 发送飞书通知
      await this.feishuService.sendMessage(message);

      return results;
    } catch (error) {
      this.logger.error('领取CDKey失败', error);
      throw error;
    }
  }

  @Cron('0 0 9 * * *') // 每天早上9点执行
  async autoGetAndUseCdkey(): Promise<string[]> {
    try {
      // 直接调用 scraperService
      const scraperResult = await this.scraperService.scrape({
        url: 'https://wiki.biligame.com/langrisser/Giftcode',
        selector: '.cdkey-table .bikited-copy'
      });

      // 处理返回结果，过滤掉 null 值并转换类型
      const cdkeys = scraperResult.content.filter((item): item is string => item !== null);
      const results: string[] = [];
      const skippedCdkeys: string[] = [];

      // 遍历所有 CDKey
      for (const cdkey of cdkeys) {
        // 检查是否已经使用过
        if (this.usedCdkeys.has(cdkey)) {
          skippedCdkeys.push(cdkey);
          this.logger.log(`CDKey ${cdkey} 已经使用过，跳过`);
          continue;
        }

        try {
          // 尝试领取 CDKey
          await this.getCdkeyReward(cdkey);
          
          // 保存到数据库并添加到缓存
          await this.usedCdkeyRepository.save({ cdkey });
          this.usedCdkeys.add(cdkey);
          results.push(cdkey);
        } catch (error) {
          this.logger.error(`处理CDKey ${cdkey} 失败`, error);
        }
      }

      // 发送汇总消息（无论是否有新的CDKey都发送）
      const message = `自动CDKey领取汇总：\n` +
        `检测到CDKey总数：${cdkeys.length}个\n` +
        `新领取：${results.length}个\n` +
        `已使用：${skippedCdkeys.length}个\n\n` +
        (results.length > 0 ? `新领取的CDKey：\n${results.join('\n')}\n\n` : '') +
        (skippedCdkeys.length > 0 ? `已使用的CDKey：\n${skippedCdkeys.join('\n')}` : '');

      await this.feishuService.sendMessage(message);

      return results;

    } catch (error) {
      this.logger.error('自动获取CDKey失败', error);
      await this.feishuService.sendMessage(`自动获取CDKey失败：${error.message}`);
      throw error;
    }
  }
}