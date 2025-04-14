import { DataSource } from 'typeorm';
import { Hero } from '../hero/entities/hero.entity';

export default new DataSource({
  type: 'mysql',
  host: process.env.DB_HOST || 'localhost',
  port: parseInt(process.env.DB_PORT || '3306'),
  username: process.env.DB_USERNAME || 'root',
  password: process.env.DB_PASSWORD || '123456',
  database: process.env.DB_DATABASE || 'langrissar',
  entities: [Hero],
  migrations: ['dist/migrations/*.js'],
  synchronize: false,
});