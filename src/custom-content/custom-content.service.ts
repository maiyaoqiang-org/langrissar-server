import { Injectable, BadRequestException, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { v4 as uuidv4 } from 'uuid';
import { CustomContent } from './entities/custom-content.entity';
import { CreateCustomContentDto } from './dto/create-custom-content.dto';
import { UpdateCustomContentDto } from './dto/update-custom-content.dto';
import { QueryCustomContentDto } from './dto/query-custom-content.dto';

@Injectable()
export class CustomContentService {
  constructor(
    @InjectRepository(CustomContent)
    private customContentRepository: Repository<CustomContent>,
  ) {}

  /** 创建自定义内容 */
  async create(createDto: CreateCustomContentDto) {
    if (createDto.key) {
      const existing = await this.customContentRepository.findOne({
        where: { key: createDto.key },
        withDeleted: true,
      });
      if (existing) {
        throw new BadRequestException(`标识键 "${createDto.key}" 已存在`);
      }
    }
    const entity = this.customContentRepository.create({
      ...createDto,
      id: uuidv4(),
    });
    return this.customContentRepository.save(entity);
  }

  /** 分页查询自定义内容列表 */
  async findAll(queryDto: QueryCustomContentDto) {
    const { page = 1, pageSize = 10, key, title, contentType, isActive } = queryDto;
    const queryBuilder = this.customContentRepository.createQueryBuilder('cc')
      .orderBy('cc.createdAt', 'DESC');

    if (key) {
      queryBuilder.andWhere('cc.key LIKE :key', { key: `%${key}%` });
    }
    if (title) {
      queryBuilder.andWhere('cc.title LIKE :title', { title: `%${title}%` });
    }
    if (contentType) {
      queryBuilder.andWhere('cc.contentType = :contentType', { contentType });
    }
    if (isActive !== undefined) {
      queryBuilder.andWhere('cc.isActive = :isActive', { isActive });
    }

    const skip = (page - 1) * pageSize;
    queryBuilder.skip(skip).take(pageSize);

    const [list, total] = await queryBuilder.getManyAndCount();
    return { list, total, page, pageSize };
  }

  /** 根据ID查询单条内容 */
  async findOne(id: string) {
    const entity = await this.customContentRepository.findOne({ where: { id } });
    if (!entity) {
      throw new NotFoundException(`该自定义内容不存在`);
    }
    return entity;
  }

  /** 根据ID查询启用的、且可外部访问的内容（公开接口使用） */
  async findOneActive(id: string) {
    const entity = await this.customContentRepository.findOne({ where: { id, isActive: true, isPublic: true } });
    if (!entity) {
      throw new NotFoundException(`该自定义内容不存在、已停用或不可外部访问`);
    }
    return entity;
  }

  /** 根据key查询单条内容 */
  async findOneByKey(key: string) {
    const entity = await this.customContentRepository.findOne({ where: { key } });
    if (!entity) {
      throw new NotFoundException(`标识键为 "${key}" 的自定义内容不存在`);
    }
    return entity;
  }

  /** 根据key查询启用的、且可外部访问的内容（公开接口使用） */
  async findOneActiveByKey(key: string) {
    const entity = await this.customContentRepository.findOne({ where: { key, isActive: true, isPublic: true } });
    if (!entity) {
      throw new NotFoundException(`标识键为 "${key}" 的自定义内容不存在、已停用或不可外部访问`);
    }
    return entity;
  }

  /** 更新自定义内容 */
  async update(id: string, updateDto: UpdateCustomContentDto) {
    const entity = await this.findOne(id);

    if (updateDto.key && updateDto.key !== entity.key) {
      const existing = await this.customContentRepository.findOne({
        where: { key: updateDto.key },
        withDeleted: true,
      });
      if (existing) {
        throw new BadRequestException(`标识键 "${updateDto.key}" 已存在`);
      }
    }

    Object.assign(entity, updateDto);
    return this.customContentRepository.save(entity);
  }

  /** 删除自定义内容 */
  async remove(id: string) {
    const entity = await this.findOne(id);
    await this.customContentRepository.softRemove(entity);
    return { id };
  }

  /** 切换启用/停用状态 */
  async toggle(id: string) {
    const entity = await this.findOne(id);
    entity.isActive = !entity.isActive;
    return this.customContentRepository.save(entity);
  }

  /** 切换外部访问状态 */
  async togglePublic(id: string) {
    const entity = await this.findOne(id);
    entity.isPublic = !entity.isPublic;
    return this.customContentRepository.save(entity);
  }

  /** 搜索自定义内容（精简列表，用于变量选择） */
  async search(keyword: string) {
    const queryBuilder = this.customContentRepository.createQueryBuilder('cc')
      .select(['cc.id', 'cc.key', 'cc.title', 'cc.content'])
      .where('cc.isActive = :isActive', { isActive: true })
      .orderBy('cc.createdAt', 'DESC')
      .limit(20);

    if (keyword) {
      queryBuilder.andWhere('(cc.key LIKE :keyword OR cc.title LIKE :keyword)', { keyword: `%${keyword}%` });
    }

    return queryBuilder.getMany();
  }
}
