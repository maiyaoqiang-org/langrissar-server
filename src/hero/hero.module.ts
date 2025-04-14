import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { HeroService } from './hero.service';
import { HeroController } from './hero.controller';
import { Hero } from './entities/hero.entity';

@Module({
  imports: [TypeOrmModule.forFeature([Hero])],
  controllers: [HeroController],
  providers: [HeroService],
})
export class HeroModule {}