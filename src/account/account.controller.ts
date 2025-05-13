import { Controller, Get, Post, Put, Delete, Query, Param, Body } from '@nestjs/common';
import { AccountService } from './account.service';
import { ApiTags, ApiOperation, ApiResponse, ApiBearerAuth } from '@nestjs/swagger';
import { ResultItem } from './account.service';  // 添加这行导入语句
import { CreateAccountDto, UpdateAccountDto } from './dto/account.dto'; // 假设你有这些 DTO
import { Roles } from 'src/auth/roles.decorator';
import { QueryAccountDto } from './dto/query-account.dto';

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

  @Get('clear-cdkey-cache')
  @ApiOperation({ summary: '清除所有CDKey缓存' })
  @ApiResponse({ status: 200, description: '清除成功' })
  @ApiResponse({ status: 400, description: '清除失败' })
  async clearUsedCdkeys() {
    return this.accountService.clearUsedCdkeys();
  }

  @Post()
  @Roles('admin')
  @ApiBearerAuth()
  @ApiOperation({ summary: '创建账号' })
  @ApiResponse({ status: 201, description: '创建成功' })
  @ApiResponse({ status: 400, description: '创建失败' })
  async createAccount(@Body() createAccountDto: CreateAccountDto) {
    return this.accountService.createAccount(createAccountDto);
  }

  @Put(':id')
  @Roles('admin')
  @ApiBearerAuth()
  @ApiOperation({ summary: '更新账号' })
  @ApiResponse({ status: 200, description: '更新成功' })
  @ApiResponse({ status: 400, description: '更新失败' })
  async updateAccount(@Param('id') id: number, @Body() updateAccountDto: UpdateAccountDto) {
    return this.accountService.updateAccount(id, updateAccountDto);
  }

  @Delete(':id')
  @Roles('admin')
  @ApiBearerAuth()
  @ApiOperation({ summary: '删除账号' })
  @ApiResponse({ status: 200, description: '删除成功' })
  @ApiResponse({ status: 400, description: '删除失败' })
  async deleteAccount(@Param('id') id: number) {
    return this.accountService.deleteAccount(id);
  }

  @Post('query')
  @Roles('admin')
  @ApiBearerAuth()
  @ApiOperation({ summary: '分页查询账号' })
  @ApiResponse({ status: 200, description: '查询成功' })
  @ApiResponse({ status: 400, description: '查询失败' })
  async findAllPaginated(@Body() queryDto: QueryAccountDto) {
    return this.accountService.findAllPaginated(queryDto);
  }
}