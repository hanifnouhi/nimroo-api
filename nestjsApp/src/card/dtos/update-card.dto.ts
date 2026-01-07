import { PartialType, OmitType } from '@nestjs/swagger';
import { CreateCardDto } from './create-card.dto';

export class UpdateCardDto extends PartialType(
  OmitType(CreateCardDto, ['user'] as const),
) {}
