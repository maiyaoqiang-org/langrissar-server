import { Injectable, BadRequestException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Brackets, Repository } from 'typeorm';
import { Coze } from './entities/coze.entity';
import { User } from '../user/entities/user.entity';
import { CreateCozeDto } from './dto/create-coze.dto';
import { UpdateCozeDto } from './dto/update-coze.dto';
import { QueryCozeDto } from './dto/query-coze.dto';

@Injectable()
export class CozeService {
  constructor(
    @InjectRepository(Coze)
    private cozeRepository: Repository<Coze>,
    @InjectRepository(User)
    private userRepository: Repository<User>,
  ) {}

  async create(createCozeDto: CreateCozeDto) {
    const coze = this.cozeRepository.create({
      botId: createCozeDto.botId,
      token: createCozeDto.token,
      needAuth: createCozeDto.needAuth || false,
    });

    if (createCozeDto.userIds?.length) {
      const users = await this.userRepository.findByIds(createCozeDto.userIds);
      if (users.length !== createCozeDto.userIds.length) {
        throw new BadRequestException('部分用户ID不存在');
      }
      coze.users = users;
    }

    return this.cozeRepository.save(coze);
  }

  async update(id: number, updateCozeDto: UpdateCozeDto) {
    const coze = await this.cozeRepository.findOne({
      where: { id },
      relations: ['users'],
    });

    if (!coze) {
      throw new BadRequestException('Coze不存在');
    }

    if (updateCozeDto.userIds !== undefined) {
      const users = await this.userRepository.findByIds(updateCozeDto.userIds);
      if (users.length !== updateCozeDto.userIds.length) {
        throw new BadRequestException('部分用户ID不存在');
      }
      coze.users = users;
    }

    Object.assign(coze, updateCozeDto);
    return this.cozeRepository.save(coze);
  }

  async findAll(user:User,queryDto: QueryCozeDto) {
    const query = this.cozeRepository.createQueryBuilder('coze')
      .leftJoinAndSelect('coze.users', 'users')
      .orderBy('coze.createdAt', 'DESC');

    // 添加基本查询条件
    if (queryDto.botId) {
      query.andWhere('coze.botId = :botId', { botId: queryDto.botId });
    }

    if (queryDto.needAuth !== undefined) {
      query.andWhere('coze.needAuth = :needAuth', { needAuth: queryDto.needAuth });
    }

    // 权限控制：
    if (!user.role || user.role !== 'admin') {
      // 非管理员用户：返回无需权限的记录或者当前用户是关联用户的记录
      query.andWhere(new Brackets(qb => {
        qb.where('coze.needAuth = false')  // 无需权限的记录
          .orWhere(
            'EXISTS (SELECT 1 FROM coze_users cu WHERE cu.coze_id = coze.id AND cu.user_id = :userId)',
            { userId: user.id }
          );  // 当前用户是关联用户的记录
      }));
    }
    // 管理员用户：不添加权限限制，可以看到所有记录

    const page = Number(queryDto.page) || 1;
    const pageSize = Number(queryDto.pageSize) || 10;
    const [items, total] = await query
      .skip((page - 1) * pageSize)
      .take(pageSize)
      .getManyAndCount();

    return {
      items,
      total,
      page,
      pageSize,
      totalPages: Math.ceil(total / pageSize),
    };
  }

  async findOne(id: number) {
    return this.cozeRepository.findOne({
      where: { id },
      relations: ['users'],
    });
  }

  async remove(id: number) {
    const coze = await this.findOne(id);
    if (!coze) {
      throw new BadRequestException('Coze不存在');
    }
    return this.cozeRepository.softRemove(coze);
  }
}