import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { UserModule } from '../user/user.module';
import { CustomContentModule } from '../custom-content/custom-content.module';
import { FeishuStorageModule } from '../feishu-storage/feishu-storage.module';
import { IssueFeedback } from './entities/issue-feedback.entity';
import { IssueAdminController } from './issue-admin.controller';
import { IssueController } from './issue.controller';
import { IssueService } from './issue.service';

@Module({
  imports: [TypeOrmModule.forFeature([IssueFeedback]), UserModule, CustomContentModule, FeishuStorageModule],
  controllers: [IssueController, IssueAdminController],
  providers: [IssueService],
})
export class IssueModule {}
