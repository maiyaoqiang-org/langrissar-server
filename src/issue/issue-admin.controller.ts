import { Body, Controller, Delete, Get, Param, Post, Put, UseGuards } from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiResponse, ApiTags } from '@nestjs/swagger';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { RolesGuard } from '../auth/roles.guard';
import { Roles } from '../auth/roles.decorator';
import { IssueService } from './issue.service';
import { QueryIssueFeedbackDto } from './dto/query-issue-feedback.dto';
import { UpdateIssueFeedbackDto } from './dto/update-issue-feedback.dto';

@ApiTags('问题反馈-管理端')
@Controller('issue/admin')
@UseGuards(JwtAuthGuard, RolesGuard)
@Roles('admin')
@ApiBearerAuth()
export class IssueAdminController {
  /** 注入服务 */
  constructor(private readonly issueService: IssueService) {}

  @Post('query')
  @ApiOperation({ summary: '分页查询问题反馈' })
  @ApiResponse({ status: 200, description: '查询成功' })
  /** 分页查询 */
  query(@Body() dto: QueryIssueFeedbackDto) {
    return this.issueService.adminQuery(dto);
  }

  @Get(':id')
  @ApiOperation({ summary: '获取问题反馈详情' })
  /** 获取详情 */
  detail(@Param('id') id: string) {
    return this.issueService.adminDetail(id);
  }

  @Put(':id')
  @ApiOperation({ summary: '更新问题反馈' })
  /** 更新记录 */
  update(@Param('id') id: string, @Body() dto: UpdateIssueFeedbackDto) {
    return this.issueService.adminUpdate(id, dto);
  }

  @Delete(':id')
  @ApiOperation({ summary: '删除问题反馈并清理资源' })
  /** 删除记录并删除资源文件 */
  remove(@Param('id') id: string) {
    return this.issueService.adminRemove(id);
  }
}
