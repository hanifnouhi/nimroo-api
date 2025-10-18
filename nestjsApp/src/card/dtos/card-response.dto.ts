import { Expose, Transform, Type } from 'class-transformer';
import { CardDto } from './card.dto';
import { IsMongoId } from 'class-validator';

export class CardResponseDto extends CardDto {
    @Expose()
    @Transform(({ value }) => value.toString())
    @IsMongoId()
    id: string;

    @Expose()
    @Transform(({ value }) => value.toString())
    @IsMongoId()
    user: string;

    @Expose() declare title: string;
    @Expose() declare image?: string;
    @Expose() declare meaning: string;
    @Expose() @Type(() => String) declare tags: string[];
    @Expose() @Type(() => String) declare examples?: string[];
    @Expose() @Type(() => String) declare synonyms?: string[];
    @Expose() declare description?: string;
    @Expose() @Type(() => String) declare opposites?: string[];
    @Expose() declare category?: string;
}