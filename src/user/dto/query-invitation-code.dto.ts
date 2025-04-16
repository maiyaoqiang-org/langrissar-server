import { ApiProperty } from '@nestjs/swagger';

export class QueryInvitationCodeDto {
  @ApiProperty({
    description: '页码',
    example: 1,
    default: 1,
    required: false
  })
  page: number = 1;

  @ApiProperty({
    description: '每页数量',
    example: 10,
    default: 10,
    required: false
  })
  pageSize: number = 10;

  @ApiProperty({
    description: '是否已使用',
    example: true,
    required: false
  })
  isUsed?: boolean;

  @ApiProperty({
    description: '开始时间',
    example: '2024-01-01',
    required: false
  })
  startDate?: string;

  @ApiProperty({
    description: '结束时间',
    example: '2024-12-31',
    required: false
  })
  endDate?: string;

  @ApiProperty({
    description: '创建者ID',
    example: 1,
    required: false
  })
  createdById?: number;
}