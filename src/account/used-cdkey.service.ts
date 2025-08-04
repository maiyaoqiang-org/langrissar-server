import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
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

  // 获取所有使用记录
  async findAll(): Promise<UsedCdkey[]> {
    return await this.usedCdkeyRepository.find({
      order: { usedAt: 'DESC' }
    });
  }

  // 根据ID获取单条记录
  async findOne(id: number): Promise<UsedCdkey> {
    const usedCdkey = await this.usedCdkeyRepository.findOne({ where: { id } });
    if (!usedCdkey) {
      throw new NotFoundException(`使用记录 #${id} 未找到`);
    }
    return usedCdkey;
  }

  // 根据CDKEY获取记录
  async findByCdkey(cdkey: string): Promise<UsedCdkey[]> {
    return await this.usedCdkeyRepository.find({
      where: { cdkey },
      order: { usedAt: 'DESC' }
    });
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