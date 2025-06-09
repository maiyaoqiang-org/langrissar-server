import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { AccountController } from './account.controller';
import { AccountService } from './account.service';
import { Account } from './entities/account.entity';
import { UsedCdkey } from './entities/used-cdkey.entity';
import { FeishuService } from 'src/common/services/feishu.service';
import { ScraperModule } from 'src/scraper/scraper.module';
import { ZlVipUserService } from './zlvipuser.service';
import { ZlVip } from './entities/zlvip.entity';

@Module({
  imports: [
    TypeOrmModule.forFeature([Account,UsedCdkey,ZlVip]),
    ScraperModule,
  ],
  controllers: [AccountController],
  providers: [AccountService, FeishuService, ZlVipUserService],
})
export class AccountModule {}
