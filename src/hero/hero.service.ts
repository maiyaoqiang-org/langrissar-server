import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Hero } from './entities/hero.entity';
import { CreateHeroDto } from './dto/create-hero.dto';
import { UpdateHeroDto } from './dto/update-hero.dto';

@Injectable()
export class HeroService {
  constructor(
    @InjectRepository(Hero)
    private heroRepository: Repository<Hero>,
  ) {}

  create(createHeroDto: CreateHeroDto) {
    const hero = this.heroRepository.create(createHeroDto);
    return this.heroRepository.save(hero);
  }

  findAll() {
    return this.heroRepository.find();
  }

  findOne(id: number) {
    return this.heroRepository.findOneBy({ id });
  }

  async update(id: number, updateHeroDto: UpdateHeroDto) {
    await this.heroRepository.update(id, updateHeroDto);
    return this.findOne(id);
  }

  async remove(id: number) {
    await this.heroRepository.delete(id);
    return { id };
  }
}