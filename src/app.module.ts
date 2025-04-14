import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { AppController } from './app.controller';
import { AppService } from './app.service';
import { HeroModule } from './hero/hero.module';
import { Hero } from './hero/entities/hero.entity';

@Module({
  imports: [
    ConfigModule.forRoot(),
    TypeOrmModule.forRoot({
      type: 'mysql',
      host: process.env.DB_HOST || 'db', // Changed default to 'db' for Docker
      port: parseInt(process.env.DB_PORT || '3306'),
      username: process.env.DB_USERNAME || 'root',
      password: process.env.DB_PASSWORD || '123456',
      database: process.env.DB_DATABASE || 'langrissar',
      entities: [Hero],
      synchronize: process.env.NODE_ENV !== 'production',
      autoLoadEntities: true,
      retryAttempts: 5,
      retryDelay: 3000,
    }),
    HeroModule,
  ],
  controllers: [AppController],
  providers: [AppService],
})
export class AppModule {}
