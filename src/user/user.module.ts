import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { JwtModule } from '@nestjs/jwt';
import { UserService } from './user.service';
import { UserController } from './user.controller';
import { User } from './entities/user.entity';
import { InvitationCode } from './entities/invitation-code.entity';

@Module({
  imports: [
    TypeOrmModule.forFeature([User, InvitationCode]),
    JwtModule.register({
      secret: process.env.JWT_SECRET || 'langrissar-secret-key',
      signOptions: { expiresIn: '24h' },
    }),
  ],
  controllers: [UserController],
  providers: [UserService],
  exports: [UserService],
})
export class UserModule {}