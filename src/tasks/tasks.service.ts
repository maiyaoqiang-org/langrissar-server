import { Injectable } from '@nestjs/common';
import { Cron, CronExpression } from '@nestjs/schedule';

@Injectable()
export class TasksService {
  // 每天早上 8 点执行
  @Cron('0 5 15 * * *')
  async handleCron() {
    // 在这里调用你想要执行的接口逻辑
    try {
      // 你的业务逻辑
      console.log('定时任务执行成功');
    } catch (error) {
      console.error('定时任务执行失败:', error);
    }
  }
}