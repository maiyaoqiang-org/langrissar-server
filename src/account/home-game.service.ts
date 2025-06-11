import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { HomeGame } from './entities/home-game.entity';

@Injectable()
export class HomeGameService {
  constructor(
    @InjectRepository(HomeGame)
    private readonly homeGameRepo: Repository<HomeGame>,
  ) {}

  async findAll(): Promise<HomeGame[]> {
    return this.homeGameRepo.find();
  }
}