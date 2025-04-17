import { Injectable, BadRequestException, UnauthorizedException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Not, Repository } from 'typeorm';
import { JwtService } from '@nestjs/jwt';
import * as bcrypt from 'bcrypt';
import * as svgCaptcha from 'svg-captcha';
import { User } from './entities/user.entity';
import { InvitationCode } from './entities/invitation-code.entity';
import { CreateUserDto, LoginDto, CreateInvitationCodeDto } from './dto/create-user.dto';
import { QueryInvitationCodeDto } from './dto/query-invitation-code.dto';
import { QueryUserDto } from './dto/query-user.dto';
import { UpdateUserDto } from './dto/update-user.dto';
import { ChangePasswordDto } from './dto/change-password.dto';
import { AdminCreateUserDto } from './dto/admin-create-user.dto';

@Injectable()
export class UserService {
  private captchaStore: Map<string, { text: string, expireAt: Date, phone?: string }> = new Map();

  constructor(
    @InjectRepository(User)
    private userRepository: Repository<User>,
    @InjectRepository(InvitationCode)
    private invitationCodeRepository: Repository<InvitationCode>,
    private jwtService: JwtService
  ) {}

  async register(createUserDto: CreateUserDto) {
    // 验证验证码
    const captchaData = this.captchaStore.get(createUserDto.captchaId);
    
    if (!captchaData || captchaData.text !== createUserDto.captcha.toUpperCase() || captchaData.expireAt < new Date()) {
      throw new BadRequestException('验证码无效或已过期');
    }

    // 验证邀请码
    const invitationCode = await this.invitationCodeRepository.findOne({
      where: { code: createUserDto.invitationCode, isUsed: false }
    });
    if (!invitationCode) {
      throw new BadRequestException('邀请码无效或已被使用');
    }

    // 检查手机号是否已注册
    const existingUser = await this.userRepository.findOne({
      where: { phone: createUserDto.phone }
    });
    if (existingUser) {
      throw new BadRequestException('该手机号已注册');
    }

    // 创建新用户
    const newUser = this.userRepository.create({
      phone: createUserDto.phone,
      password: await bcrypt.hash(createUserDto.password, 10),
      username: createUserDto.username,
      role: 'user',
      isActive: true
    });
    const savedUser = await this.userRepository.save(newUser);

    // 更新邀请码状态
    invitationCode.isUsed = true;
    invitationCode.usedById = newUser.id;
    await this.invitationCodeRepository.save(invitationCode);

    // 清除验证码
    this.captchaStore.delete(createUserDto.captchaId);

    // 返回用户信息和token
    return this.generateTokenResponse(savedUser);
  }

  async createUser(adminId: number, createUserDto: AdminCreateUserDto) {
    // 创建新用户
    const newUser = this.userRepository.create({
      phone: createUserDto.phone,
      password: await bcrypt.hash(createUserDto.password, 10),
      username: createUserDto.username,
      role: createUserDto.role || 'user',
      isActive: true
    });
    
    const savedUser = await this.userRepository.save(newUser);
    
    return savedUser;
  }

  async login(loginDto: LoginDto) {
    const user = await this.userRepository.findOne({
      where: { phone: loginDto.phone }
    });

    if (!user) {
      throw new UnauthorizedException('用户不存在');
    }

    if (!user.isActive) {
      throw new UnauthorizedException('用户已被禁用');
    }

    // 验证密码
    const isPasswordValid = await bcrypt.compare(loginDto.password, user.password);
    if (!isPasswordValid) {
      throw new UnauthorizedException('密码错误');
    }

    // 验证验证码
    const captchaData = this.captchaStore.get(loginDto.captchaId);
    if (!captchaData || captchaData.text !== loginDto.captcha.toUpperCase() || captchaData.expireAt < new Date()) {
      throw new UnauthorizedException('验证码无效或已过期');
    }
    // 清除验证码
    this.captchaStore.delete(loginDto.captchaId);

    return this.generateTokenResponse(user);
  }

  async generateCaptcha() {
    // 生成验证码
    const captcha = svgCaptcha.create({
      size: 4,
      ignoreChars: '0o1ilI',  // 排除更多容易混淆的字符
      color: true,
      noise: 1,  // 减少干扰线
      fontSize: 90,  // 增大字体
      width: 150,   // 调整图片尺寸
      height: 50
    });

    // 生成唯一ID
    const captchaId = Math.random().toString(36).substring(2, 15) + Math.random().toString(36).substring(2, 15);

    // 存储验证码（转换为大写），5分钟有效
    const expireAt = new Date();
    expireAt.setMinutes(expireAt.getMinutes() + 5);
    this.captchaStore.set(captchaId, { text: captcha.text.toUpperCase(), expireAt });

    return {
      captchaId,
      svg: captcha.data,
      expireAt
    };
  }

  async createInvitationCodes(userId: number, dto: CreateInvitationCodeDto) {
    const user = await this.userRepository.findOne({
      where: { id: userId }
    });

    if (!user || user.role !== 'admin') {
      throw new UnauthorizedException('只有管理员可以创建邀请码');
    }

    const codes: InvitationCode[] = [];
    for (let i = 0; i < dto.count; i++) {
      const code = this.generateRandomCode();
      const invitationCode = this.invitationCodeRepository.create({
        code,
        createdById: userId
      });
      codes.push(await this.invitationCodeRepository.save(invitationCode));
    }

    return codes;
  }

  private generateRandomCode(): string {
    const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789';
    let code = '';
    for (let i = 0; i < 6; i++) {
      code += chars.charAt(Math.floor(Math.random() * chars.length));
    }
    return code;
  }

  async queryInvitationCodes(userId: number, queryDto: QueryInvitationCodeDto) {
    const user = await this.userRepository.findOne({
      where: { id: userId }
    });

    if (!user || user.role !== 'admin') {
      throw new UnauthorizedException('只有管理员可以查询邀请码');
    }

    const query = this.invitationCodeRepository.createQueryBuilder('invitationCode')
      .leftJoinAndSelect('invitationCode.usedBy', 'usedBy')
      .leftJoinAndSelect('invitationCode.createdBy', 'createdBy')
      .orderBy('invitationCode.createdAt', 'DESC');

    if (queryDto.isUsed) {
      query.andWhere('invitationCode.isUsed = :isUsed', { isUsed: queryDto.isUsed });
    }

    if (queryDto.createdById) {
      query.andWhere('invitationCode.createdById = :createdById', { createdById: queryDto.createdById });
    }

    if (queryDto.startDate) {
      const startDate = new Date(queryDto.startDate);
      startDate.setHours(0, 0, 0, 0);
      query.andWhere('invitationCode.createdAt >= :startDate', { startDate });
    }

    if (queryDto.endDate) {
      const endDate = new Date(queryDto.endDate);
      endDate.setHours(23, 59, 59, 999);
      query.andWhere('invitationCode.createdAt <= :endDate', { endDate });
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
      page: page,
      pageSize: pageSize,
      totalPages: Math.ceil(total / queryDto.pageSize)
    };
  }

  async queryUsers(userId: number, queryDto: QueryUserDto) {
    const user = await this.userRepository.findOne({
      where: { id: userId }
    });

    const query = this.userRepository.createQueryBuilder('user')
      .orderBy('user.createdAt', 'DESC');

    if (queryDto.role) {
      query.andWhere('user.role = :role', { role: queryDto.role });
    }

    if (queryDto.isActive !== undefined) {
      query.andWhere('user.isActive = :isActive', { isActive: queryDto.isActive });
    }

    if (queryDto.phone) {
      query.andWhere('user.phone LIKE :phone', { phone: `%${queryDto.phone}%` });
    }

    const page = Number(queryDto.page) || 1;
    const pageSize = Number(queryDto.pageSize) || 10;
    const [items, total] = await query
      .skip((page - 1) * pageSize)
      .take(pageSize)
      .getManyAndCount();

    return {
      items: items.map(item => item.toJSON()),
      total,
      page: page,
      pageSize: pageSize,
      totalPages: Math.ceil(total / pageSize)
    };
  }

  async updateUser(userId: number, updateUserDto: UpdateUserDto) {
    const user = await this.userRepository.findOne({
      where: { id: userId }
    });

    if (!user) {
      throw new BadRequestException('用户不存在');
    }

    // 如果要更新手机号，且与当前用户的手机号不同，才检查唯一性
    if (updateUserDto.phone && updateUserDto.phone !== user.phone) {
      const existingUser = await this.userRepository.findOne({
        where: { phone: updateUserDto.phone, id: Not(userId) }
      });
      if (existingUser) {
        throw new BadRequestException('该手机号已被其他用户使用');
      }
    }

    const { id, ...updateData } = updateUserDto;

    await this.userRepository.update(userId, updateData);
    return this.userRepository.findOne({ where: { id: userId } });


  }

  async updatePassword(userId: number, password: string) {
    const user = await this.userRepository.findOne({
      where: { id: userId }
    });

    if (!user) {
      throw new BadRequestException('用户不存在');
    }

    // 对密码进行哈希加密
    const hashedPassword = await bcrypt.hash(password, 10);
    await this.userRepository.update(userId, { password: hashedPassword });

    return { message: '密码更新成功' };
  }

  async changePassword(userId: number, changePasswordDto: ChangePasswordDto) {
      const user = await this.userRepository.findOne({
        where: { id: userId }
      });
  
      if (!user) {
        throw new BadRequestException('用户不存在');
      }
  
      // 验证旧密码
      const isPasswordValid = await bcrypt.compare(changePasswordDto.oldPassword, user.password);
      if (!isPasswordValid) {
        throw new BadRequestException('旧密码错误');
      }
  
      // 更新新密码
      const hashedPassword = await bcrypt.hash(changePasswordDto.newPassword, 10);
      await this.userRepository.update(userId, { password: hashedPassword });
  
      return { message: '密码修改成功' };
    }

  private generateTokenResponse(user: User) {
    const payload = { sub: user.id, ...user.toJSON() };
    const token = this.jwtService.sign(payload);
    const tokenInfo = this.jwtService.decode(token) as { exp: number };
    
    return {
      ...payload,
      access_token: token,
      expireIn: tokenInfo.exp
    };
  }
}