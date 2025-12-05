import { Controller, Get, Post, Body, Param, UseGuards, Request, BadRequestException, Query } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiResponse, ApiBearerAuth } from '@nestjs/swagger';
import { UserService } from './user.service';
import { CreateUserDto, LoginDto, CreateInvitationCodeDto } from './dto/create-user.dto';
import { QueryInvitationCodeDto } from './dto/query-invitation-code.dto';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { RolesGuard } from '../auth/roles.guard';
import { Roles } from '../auth/roles.decorator';
import { QueryUserDto } from './dto/query-user.dto';
import { UpdateUserDto } from './dto/update-user.dto';
import { AdminOnly } from '../auth/admin-only.decorator';
import { UpdatePasswordDto } from './dto/update-password.dto';
import { ChangePasswordDto } from './dto/change-password.dto';
import { AdminCreateUserDto } from './dto/admin-create-user.dto';

@ApiTags('用户')
@Controller('user')
export class UserController {
  constructor(private readonly userService: UserService) {}

  @Post('register')
  @ApiOperation({ summary: '用户注册' })
  @ApiResponse({ status: 201, description: '注册成功' })
  @ApiResponse({ status: 400, description: '注册失败' })
  register(@Body() createUserDto: CreateUserDto) {
    return this.userService.register(createUserDto);
  }

  @Post('login')
  @ApiOperation({ summary: '用户登录' })
  @ApiResponse({ status: 200, description: '登录成功' })
  @ApiResponse({ status: 401, description: '登录失败' })
  login(@Body() loginDto: LoginDto) {
    return this.userService.login(loginDto);
  }

  @Get('captcha')
  @ApiOperation({ summary: '获取验证码' })
  @ApiResponse({ status: 200, description: '获取验证码成功' })
  getCaptcha() {
    return this.userService.generateCaptcha();
  }

  @Post('invitation-code')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles('admin')
  @ApiBearerAuth()
  @ApiOperation({ summary: '创建邀请码' })
  @ApiResponse({ status: 201, description: '创建成功' })
  @ApiResponse({ status: 401, description: '未授权' })
  createInvitationCode(
    @Request() req,
    @Body() createInvitationCodeDto: CreateInvitationCodeDto,
  ) {
    return this.userService.createInvitationCodes(req.user.sub, createInvitationCodeDto);
  }

  @Post('invitation-code/query')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles('admin')
  @ApiBearerAuth()
  @ApiOperation({ summary: '分页查询邀请码' })
  @ApiResponse({ status: 200, description: '查询成功' })
  @ApiResponse({ status: 401, description: '未授权' })
  queryInvitationCodes(
    @Request() req,
    @Body() queryDto: QueryInvitationCodeDto,
  ) {
    return this.userService.queryInvitationCodes(req.user.sub, queryDto);
  }

  @Post('query')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles('admin')
  @ApiBearerAuth()
  @ApiOperation({ summary: '分页查询用户' })
  @ApiResponse({ status: 200, description: '查询成功' })
  @ApiResponse({ status: 401, description: '未授权' })
  queryUsers(
    @Request() req,
    @Body() queryDto: QueryUserDto,
  ) {
    
    return this.userService.queryUsers(req.user.sub, queryDto);
  }

  @Post('update')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles('admin')
  @ApiBearerAuth()
  @ApiOperation({ summary: '更新用户信息' })
  @ApiResponse({ status: 200, description: '更新成功' })
  @ApiResponse({ status: 400, description: '更新失败' })
  updateUser(
    @Request() req,
    @Body() updateUserDto: UpdateUserDto,
  ) {
    return this.userService.updateUser(req.user.sub, updateUserDto);
  }

  @Post('update-password')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles('admin')
  @ApiBearerAuth()
  @ApiOperation({ summary: '更新用户密码' })
  @ApiResponse({ status: 200, description: '更新成功' })
  @ApiResponse({ status: 400, description: '更新失败' })
  updatePassword(
    @Request() req,
    @Body() updatePasswordDto: UpdatePasswordDto,
  ) {
    return this.userService.updatePassword(updatePasswordDto.id, updatePasswordDto.password);
  }

  @Post('change-password')
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @ApiOperation({ summary: '用户修改自己的密码' })
  @ApiResponse({ status: 200, description: '修改成功' })
  @ApiResponse({ status: 400, description: '修改失败' })
  changePassword(
    @Request() req,
    @Body() changePasswordDto: ChangePasswordDto,
  ) {
    return this.userService.changePassword(req.user.sub, changePasswordDto);
  }

  @Post('create')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles('admin')
  @ApiBearerAuth()
  @ApiOperation({ summary: '管理员创建用户' })
  @ApiResponse({ status: 201, description: '创建成功' })
  @ApiResponse({ status: 400, description: '创建失败' })
  @ApiResponse({ status: 401, description: '未授权' })
  createUser(
    @Request() req,
    @Body() createUserDto: AdminCreateUserDto,
  ) {
    return this.userService.createUser(req.user.sub, createUserDto);
  }
}