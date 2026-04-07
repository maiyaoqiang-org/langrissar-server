import { PartialType } from '@nestjs/mapped-types';
import { CreateCustomContentDto } from './create-custom-content.dto';

export class UpdateCustomContentDto extends PartialType(CreateCustomContentDto) {}
