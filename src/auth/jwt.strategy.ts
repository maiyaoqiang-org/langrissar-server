import { Injectable, UnauthorizedException } from "@nestjs/common";
import { PassportStrategy } from "@nestjs/passport";
import { ExtractJwt, Strategy } from "passport-jwt";
import { InjectRepository } from "@nestjs/typeorm";
import { Repository } from "typeorm";
import { User } from "../user/entities/user.entity";

@Injectable()
export class JwtStrategy extends PassportStrategy(Strategy) {
  constructor(
    @InjectRepository(User)
    private userRepository: Repository<User>,
  ) {
    super({
      jwtFromRequest: ExtractJwt.fromAuthHeaderAsBearerToken(),
      ignoreExpiration: false,
      secretOrKey: process.env.JWT_SECRET || "langrissar-secret-key",
    });
  }

  async validate(payload: any) {
    // 检查用户是否存在且活跃
    const user = await this.userRepository.findOne({
      where: { id: payload.sub },
    });

    if (!user) {
      throw new UnauthorizedException('用户不存在');
    }

    if (!user.isActive) {
      throw new UnauthorizedException('用户已被禁用');
    }

    // 检查token版本是否匹配
    if (payload.tokenVersion !== user.tokenVersion) {
      throw new UnauthorizedException('token已失效，请重新登录');
    }

    return {
      id: user.id,
      sub: user.id,
      phone: user.phone,
      role: user.role,
      tokenVersion: user.tokenVersion,
    };
  }
}
