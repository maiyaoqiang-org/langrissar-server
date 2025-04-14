import { ApiProperty } from '@nestjs/swagger';

export class CreateHeroDto {
  @ApiProperty({ 
    description: '英雄名称',
    example: '兰迪乌斯',
    required: true
  })
  name: string;

  @ApiProperty({ 
    description: '英雄等级，范围1-70',
    example: 60,
    minimum: 1,
    maximum: 70,
    required: true
  })
  level: number;

  @ApiProperty({ 
    description: '是否激活状态',
    default: true,
    example: true,
    required: false
  })
  isActive?: boolean;
}