import { IsString, IsOptional } from 'class-validator';

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
}

export class QueryAccountDto {
  @IsOptional()
  @IsString()
  account?: string;

  @IsOptional()
  @IsString()
  password?: string;
}