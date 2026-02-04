import { Controller, Get, Post, Put, Delete, Query, Param, Body, UseGuards } from '@nestjs/common';
import { AccountService } from './account.service';
import { ApiTags, ApiOperation, ApiResponse, ApiBearerAuth } from '@nestjs/swagger';
import { ResultItem } from './account.service';  // 添加这行导入语句
import { CreateAccountDto, UpdateAccountDto } from './dto/account.dto'; // 假设你有这些 DTO
import { Roles } from 'src/auth/roles.decorator';
import { QueryAccountDto } from './dto/query-account.dto';
import { CycleType } from './zlvip.service';
import { QueryZlVipDto } from './dto/query-zlvip.dto';
import { ZlVipUserService } from './zlvipuser.service';
import { HomeGameService } from './home-game.service';
import { HomeGame } from './entities/home-game.entity';
import { JwtAuthGuard } from '@/auth/jwt-auth.guard';
import { RolesGuard } from '@/auth/roles.guard';

@ApiTags('账号管理')
@Controller('account')
@UseGuards(JwtAuthGuard, RolesGuard)
@Roles('admin')
export class AccountController {
  constructor(
    private readonly accountService: AccountService,
    private readonly zlVipUserService: ZlVipUserService,
    private readonly homeGameService: HomeGameService,
  ) { }

  @Post('get-preday-reward')
  @ApiOperation({ summary: '领取每日福利（POST）' })
  async postPredayReward(
    @Body('accountIds') accountIds?: number[]
  ): Promise<ResultItem[]> {
    return this.accountService.getPredayReward(accountIds);
  }

  @Post('get-weekly-reward')
  @ApiOperation({ summary: '领取每周二雪莉福利（POST）' })
  async postWeeklyReward(
    @Body('accountIds') accountIds?: number[]
  ): Promise<ResultItem[]> {
    return this.accountService.getWeeklyReward(accountIds);
  }

  @Post('get-monthly-reward')
  @ApiOperation({ summary: '领取每月8号福利（POST）' })
  async postMonthlyReward(
    @Body('accountIds') accountIds?: number[]
  ): Promise<ResultItem[]> {
    return this.accountService.getMonthlyReward(accountIds);
  }

  @Post('get-cdkey-reward')
  @ApiOperation({ summary: '领取CDKey奖励（POST）' })
  async postCdkeyReward(
    @Body() body: { cdkey: string; accountIds?: number[] }
  ): Promise<ResultItem[]> {
    return this.accountService.getCdkeyReward(body.cdkey, body.accountIds);
  }

  @Post('auto-cdkey-reward')
  @ApiOperation({ summary: '自动领取CDKey奖励（POST）' })
  async postAutoGetAndUseCdkey(
    @Body('accountIds') accountIds?: number[]
  ) {
    return this.accountService.autoGetAndUseCdkey(accountIds);
  }

  @Get('clear-cdkey-cache')
  @ApiOperation({ summary: '清除所有CDKey缓存' })
  @ApiResponse({ status: 200, description: '清除成功' })
  @ApiResponse({ status: 400, description: '清除失败' })
  async clearUsedCdkeys() {
    return this.accountService.clearUsedCdkeys();
  }

  @Post('auto-vip-weekly-reward')
  @ApiOperation({ summary: '自动领取VIP每周奖励（POST）' })
  async postAutoVIPWeeklyReward(
    @Body('accountIds') accountIds?: number[]
  ) {
    return this.accountService.autoGetVipReward(CycleType.Weekly, accountIds);
  }

  @Post('auto-vip-monthly-reward')
  @ApiOperation({ summary: '自动领取VIP每月奖励（POST）' })
  async postAutoVIPMonthlyReward(
    @Body('accountIds') accountIds?: number[]
  ) {
    return this.accountService.autoGetVipReward(CycleType.Monthly, accountIds);
  }

  @Post('auto-vip-sign-reward')
  @ApiOperation({ summary: '自动领取VIP签到奖励（POST）' })
  async postAutoVIPSignReward(
    @Body('accountIds') accountIds?: number[]
  ) {
    return this.accountService.autoGetVipSignReward(accountIds);
  }

  @Get('get-role-info')
  @ApiOperation({ summary: '获取角色信息' })
  @ApiResponse({ status: 200, description: '获取成功' })
  @ApiResponse({ status: 400, description: '获取失败' })
  async getRoleInfo(@Query('roleid') roleid: string) {
    return this.accountService.getRoleInfo(roleid);
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

  @Post('zlvip')
  @Roles('admin')
  @ApiBearerAuth()
  @ApiOperation({ summary: '创建zlvip账号' })
  async createZlVip(@Body() data: { name: string; userInfo: any }) {
    return this.zlVipUserService.createZlVip(data);
  }

  @Put('zlvip/:id')
  @Roles('admin')
  @ApiBearerAuth()
  @ApiOperation({ summary: '更新zlvip账号' })
  async updateZlVip(@Param('id') id: number, @Body() data: { name?: string; userInfo?: any }) {
    return this.zlVipUserService.updateZlVip(id, data);
  }

  @Delete('zlvip/:id')
  @Roles('admin')
  @ApiBearerAuth()
  @ApiOperation({ summary: '删除zlvip账号' })
  async deleteZlVip(@Param('id') id: number) {
    return this.zlVipUserService.deleteZlVip(id);
  }

  @Post('zlvip/query')
  @Roles('admin')
  @ApiBearerAuth()
  @ApiOperation({ summary: '分页查询zlvip账号' })
  async queryZlVips(@Body() queryDto: QueryZlVipDto) {
    return this.zlVipUserService.queryZlVips(queryDto);
  }


  @Get('getVipHomeGameList')
  @Roles('admin')
  @ApiBearerAuth()
  @ApiOperation({ summary: '获取VIP游戏列表' })
  async getVipHomeGameList(@Query('id') id: number) {
    return this.accountService.getHomeGameList(id);
  }

  @Get('queryRoleList')
  @Roles('admin')
  @ApiBearerAuth()
  @ApiOperation({ summary: '获取VIP游戏账号列表' })
  async queryRoleList(@Query('id') id: number, @Query('appKey') appKey: number) {
    return this.accountService.queryRoleList(id, appKey);
  }


  @Get('home-game-list')
  @ApiOperation({ summary: '获取首页游戏列表' })
  @ApiResponse({ status: 200, description: '获取成功' })
  @ApiResponse({ status: 400, description: '获取失败' })
  @ApiBearerAuth()
  async findAll(): Promise<HomeGame[]> {
    return this.homeGameService.findAll();
  }

  @Put(':id/status')
  @Roles('admin')
  @ApiBearerAuth()
  @ApiOperation({ summary: '修改账号状态' })
  async setAccountStatus(@Param('id') id: number, @Body('status') status: number) {
    return this.accountService.setAccountStatus(id, status);
  }

  @Get('getAllCDkey')
  @ApiOperation({ summary: '获取所有cdkey' })
  async getAllCdkey() {
    return this.accountService.autoGetAllCdKey();
  }

  @Get('get-cdkey-reward-for-account')
  @ApiOperation({ summary: '为指定账号领取CDKey奖励' })
  @ApiResponse({ status: 200, description: '领取成功' })
  @ApiResponse({ status: 400, description: '领取失败' })
  async getCdkeyRewardForAccount(
    @Query('cdkey') cdkey: string,
    @Query('accountId') accountId: number
  ): Promise<ResultItem> {
    return this.accountService.getCdkeyRewardForAccount(cdkey, accountId);
  }
}
