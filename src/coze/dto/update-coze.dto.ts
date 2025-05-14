import { PartialType } from '@nestjs/swagger';
import { CreateCozeDto } from './create-coze.dto';

export class UpdateCozeDto extends PartialType(CreateCozeDto) {}