import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { JwtModule } from '@nestjs/jwt';
import { UserModule } from '../user/user.module';
import { CustomContentModule } from '../custom-content/custom-content.module';
import { FeishuStorageModule } from '../feishu-storage/feishu-storage.module';
import { IssueFeedback } from './entities/issue-feedback.entity';
import { IssueAdminController } from './issue-admin.controller';
import { IssueController } from './issue.controller';
import { IssueService } from './issue.service';

@Module({
  imports: [
    TypeOrmModule.forFeature([IssueFeedback]),
    UserModule,
    CustomContentModule,
    FeishuStorageModule,
    JwtModule.register({
      secret: process.env.JWT_SECRET || 'langrissar-secret-key',
      signOptions: { expiresIn: '10m' },
    }),
  ],
  controllers: [IssueController, IssueAdminController],
  providers: [IssueService],
})
export class IssueModule {}
