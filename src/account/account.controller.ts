import { Controller, Get, Query } from '@nestjs/common';
import { AccountService } from './account.service';
import { ApiTags, ApiOperation, ApiResponse } from '@nestjs/swagger';
import { ResultItem } from './account.service';  // 添加这行导入语句

@ApiTags('账号管理')
@Controller('account')
export class AccountController {
  constructor(private readonly accountService: AccountService) {}

  @Get()
  @ApiOperation({ summary: '获取所有账号' })
  @ApiResponse({ status: 200, description: '获取成功' })
  @ApiResponse({ status: 400, description: '获取失败' })
  findAll() {
    return this.accountService.findAll();
  }

  @Get('get-preday-reward')
  @ApiOperation({ summary: '领取每日福利' })
  @ApiResponse({ status: 200, description: '领取成功' })
  @ApiResponse({ status: 400, description: '领取失败' })
  async getPredayReward(): Promise<ResultItem[]> {  // 添加返回类型
    return this.accountService.getPredayReward();
  }

  @Get('get-weekly-reward')
  @ApiOperation({ summary: '领取每周二雪莉福利' })
  @ApiResponse({ status: 200, description: '领取成功' })
  @ApiResponse({ status: 400, description: '领取失败' })
  async getWeeklyReward() :Promise<ResultItem[]>{
    return this.accountService.getWeeklyReward();
  }

  @Get('get-monthly-reward')
  @ApiOperation({ summary: '领取每月8号福利' })
  @ApiResponse({ status: 200, description: '领取成功' })
  @ApiResponse({ status: 400, description: '领取失败' })
  async getMonthlyReward(): Promise<ResultItem[]> {
    return this.accountService.getMonthlyReward();
  }

  @Get('get-cdkey-reward')
  @ApiOperation({ summary: '领取CDKey奖励' })
  @ApiResponse({ status: 200, description: '领取成功' })
  @ApiResponse({ status: 400, description: '领取失败' })
  async getCdkeyReward(@Query('cdkey') cdkey: string): Promise<ResultItem[]> {
    return this.accountService.getCdkeyReward(cdkey);
  }

  @Get('auto-cdkey-reward')
  async autoGetAndUseCdkey() {
    return this.accountService.autoGetAndUseCdkey();
  }
}