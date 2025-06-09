import { IsString, IsOptional, IsJSON } from 'class-validator';
import { Transform } from 'class-transformer';
import { UserInfo } from '../zlvip.service';

export class CreateAccountDto {
  @IsString()
  username: string;

  @IsString()
  userid: string;

  @IsString()
  roleid: string;

  @IsString()
  serverid: string;

  @IsOptional()
  @IsString()
  account?: string;

  @IsOptional()
  @IsString()
  password?: string;

  // @IsOptional()
  // @IsJSON({ message: 'userInfo必须是有效的JSON字符串' })
  // userInfo?: string; // 改为对象类型
  @IsOptional()
  zlVipId?: number;
}

export class UpdateAccountDto {
  @IsOptional()
  @IsString()
  username?: string;

  @IsOptional()
  @IsString()
  userid?: string;

  @IsOptional()
  @IsString()
  roleid?: string;

  @IsOptional()
  @IsString()
  serverid?: string;

  @IsOptional()
  @IsString()
  account?: string;

  @IsOptional()
  @IsString()
  password?: string;

  // @IsOptional()
  // @IsJSON({ message: 'userInfo必须是有效的JSON字符串' })
  // userInfo: string; // 改为对象类型

  @IsOptional()
  zlVipId?: number;
}

export class QueryAccountDto {
  @IsOptional()
  @IsString()
  account?: string;

  @IsOptional()
  @IsString()
  password?: string;
}