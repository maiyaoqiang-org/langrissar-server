import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, Like } from 'typeorm';
import { UsedCdkey } from './entities/used-cdkey.entity';

@Injectable()
export class UsedCdkeyService {
  constructor(
    @InjectRepository(UsedCdkey)
    private readonly usedCdkeyRepository: Repository<UsedCdkey>,
  ) {}

  // 创建新的使用记录
  async create(cdkey: string): Promise<UsedCdkey> {
    const usedCdkey = this.usedCdkeyRepository.create({ cdkey });
    return await this.usedCdkeyRepository.save(usedCdkey);
  }

  // 获取使用记录（带分页，可选CDKEY过滤）
  async findAll(page: number = 1, limit: number = 10, cdkey?: string): Promise<{
    data: UsedCdkey[];
    total: number;
    page: number;
    limit: number;
  }> {
    const whereCondition = cdkey ? { cdkey: Like(`%${cdkey}%`) } : {};
    
    const [data, total] = await this.usedCdkeyRepository.findAndCount({
      where: whereCondition,
      order: { usedAt: 'DESC' },
      skip: (page - 1) * limit,
      take: limit,
    });
    
    return {
      data,
      total,
      page,
      limit,
    };
  }

  // 根据ID获取单条记录
  async findOne(id: number): Promise<UsedCdkey> {
    const usedCdkey = await this.usedCdkeyRepository.findOne({ where: { id } });
    if (!usedCdkey) {
      throw new NotFoundException(`使用记录 #${id} 未找到`);
    }
    return usedCdkey;
  }

  // 更新记录
  async update(id: number, cdkey: string): Promise<UsedCdkey> {
    const usedCdkey = await this.findOne(id);
    usedCdkey.cdkey = cdkey;
    return await this.usedCdkeyRepository.save(usedCdkey);
  }

  // 删除记录
  async remove(id: number): Promise<void> {
    const result = await this.usedCdkeyRepository.delete(id);
    if (result.affected === 0) {
      throw new NotFoundException(`使用记录 #${id} 未找到`);
    }
  }

  // 检查CDKEY是否已使用
  async isUsed(cdkey: string): Promise<boolean> {
    const count = await this.usedCdkeyRepository.count({
      where: { cdkey }
    });
    return count > 0;
  }
}