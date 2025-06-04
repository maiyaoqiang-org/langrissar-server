import { ApiProperty } from '@nestjs/swagger';
import { IsOptional, IsString } from 'class-validator';

export class QueryAccountDto {
  @ApiProperty({ description: '用户名', required: false })
  @IsOptional()
  @IsString()
  username?: string;

  @ApiProperty({ description: '用户ID', required: false })
  @IsOptional()
  @IsString()
  userid?: string;

  @ApiProperty({ description: '角色ID', required: false })
  @IsOptional()
  @IsString()
  roleid?: string;

  @ApiProperty({ description: '服务器ID', required: false })
  @IsOptional()
  @IsString()
  serverid?: string;

  @ApiProperty({ description: '页码', required: false, default: 1 })
  @IsOptional()
  page?: number;

  @ApiProperty({ description: '每页数量', required: false, default: 10 })
  @IsOptional()
  pageSize?: number;

  @ApiProperty({ description: '账号', required: false })
  @IsOptional()
  @IsString()
  account?: string;

}