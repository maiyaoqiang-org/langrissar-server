import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { ZlVip } from './entities/zlvip.entity.js';
import { Repository } from 'typeorm';
import { QueryZlVipDto } from './dto/query-zlvip.dto.js';



@Injectable()
export class ZlVipUserService {
    constructor(
        @InjectRepository(ZlVip)
        private zlVipRepository: Repository<ZlVip>,
    ) { }

    async createZlVip(data: { name: string; userInfo: any }) {
        const zlVip = this.zlVipRepository.create({
            name: data.name,
            userInfo: data.userInfo
        });
        await this.zlVipRepository.save(zlVip);
        return { success: true, data: zlVip };
    }

    async updateZlVip(id: number, data: { name?: string; userInfo?: any }) {
        const zlVip = await this.zlVipRepository.findOne({ where: { id } });
        if (!zlVip) {
            throw new Error('ZlVip not found');
        }
        
        if (data.name) zlVip.name = data.name;
        if (data.userInfo) zlVip.userInfo = data.userInfo;
        
        await this.zlVipRepository.save(zlVip);
        return { success: true, data: zlVip };
    }

    async deleteZlVip(id: number) {
        const result = await this.zlVipRepository.delete(id);
        return { success: Number(result.affected) > 0, id };
    }

    async queryZlVips(params: QueryZlVipDto) {
        const { name, page = 1, pageSize = 10 } = params;
        const queryBuilder = this.zlVipRepository.createQueryBuilder('zlvip');
        
        if (name) {
            queryBuilder.where('zlvip.name LIKE :name', { name: `%${name}%` });
        }

        const [items, total] = await queryBuilder
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

}
