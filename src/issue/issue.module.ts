import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { UserModule } from '../user/user.module';
import { IssueFeedback } from './entities/issue-feedback.entity';
import { IssueAdminController } from './issue-admin.controller';
import { IssueController } from './issue.controller';
import { IssueService } from './issue.service';

@Module({
  imports: [TypeOrmModule.forFeature([IssueFeedback]), UserModule],
  controllers: [IssueController, IssueAdminController],
  providers: [IssueService],
})
export class IssueModule {}

