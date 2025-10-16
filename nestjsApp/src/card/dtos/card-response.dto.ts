import { Transform } from 'class-transformer';
import { CardDto } from './card.dto';
import { IsMongoId } from 'class-validator';

export class CardResponseDto extends CardDto {
    @Transform(({ value }) => value.toString())
    @IsMongoId()
    id: string;

    @Transform(({ value }) => value.toString())
    @IsMongoId()
    user: string;
}