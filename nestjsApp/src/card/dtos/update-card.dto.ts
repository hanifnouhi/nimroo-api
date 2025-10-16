import { PartialType, OmitType } from '@nestjs/mapped-types';
import { CreateCardDto } from './create-card.dto';
import { IsMongoId, IsNotEmpty } from 'class-validator';

export class UpdateCardDto extends PartialType(OmitType(CreateCardDto, ['user'] as const)) {
  @IsMongoId()
  @IsNotEmpty()
  id: string;
}