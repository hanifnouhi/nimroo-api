import { Transform } from "class-transformer";
import { IsBoolean, IsNotEmpty, IsOptional, IsString, MaxLength, MinLength } from "class-validator";
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

/**
 * DTO for translation request
 */
export class TranslateTextDto {
    @ApiProperty({
        description: 'Text to translate',
        example: 'bonjour'
    })
    @IsString()
    @IsNotEmpty()
    @MinLength(2)
    @MaxLength(30)
    text: string;

    @ApiPropertyOptional({
        description: 'Target language code, defaults to "en"',
        example: 'fa'
    })
    @IsOptional()
    @Transform(({ value }) => value ?? 'en')
    @IsString()
    @MinLength(2)
    @MaxLength(3)
    targetLang?: string;

    @ApiPropertyOptional({
        description: 'From language code, defaults to "en"',
        example: 'fr'
    })
    @IsOptional()
    @Transform(({ value }) => value ?? 'en')
    @IsString()
    @MinLength(2)
    @MaxLength(3)
    fromLang?: string;

    @ApiPropertyOptional({
        description: 'Should check spell or no, defaults is true',
        example: 'false'
    })
    @IsOptional()
    @Transform(({ value }) =>  value ?? true)
    @IsBoolean()
    spellCheck?: boolean
}