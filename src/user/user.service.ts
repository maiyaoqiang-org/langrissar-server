import { Injectable, BadRequestException, UnauthorizedException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { JwtService } from '@nestjs/jwt';
import * as bcrypt from 'bcrypt';
import * as svgCaptcha from 'svg-captcha';
import { User } from './entities/user.entity';
import { InvitationCode } from './entities/invitation-code.entity';
import { CreateUserDto, LoginDto, CreateInvitationCodeDto } from './dto/create-user.dto';

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
    const hashedPassword = await bcrypt.hash(createUserDto.password, 10);
    const user = this.userRepository.create({
      phone: createUserDto.phone,
      password: hashedPassword,
      role: 'user'
    });

    const savedUser = await this.userRepository.save(user);

    // 标记邀请码为已使用
    invitationCode.isUsed = true;
    invitationCode.usedById = savedUser.id;
    invitationCode.usedAt = new Date();
    await this.invitationCodeRepository.save(invitationCode);

    // 清除验证码
    this.captchaStore.delete(createUserDto.captchaId);

    // 返回用户信息和token
    return this.generateTokenResponse(savedUser);
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

  private generateTokenResponse(user: User) {
    const payload = { sub: user.id, phone: user.phone, role: user.role };
    const token = this.jwtService.sign(payload);
    const tokenInfo = this.jwtService.decode(token) as { exp: number };
    
    return {
      id: user.id,
      phone: user.phone,
      role: user.role,
      access_token: token,
      expireIn: tokenInfo.exp
    };
  }
}