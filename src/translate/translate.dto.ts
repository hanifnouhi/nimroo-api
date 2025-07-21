import { Transform } from "class-transformer";
import { IsNotEmpty, IsOptional, IsString } from "class-validator";
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
    text: string;

    @ApiPropertyOptional({
        description: 'Target language code, defaults to "en"',
        example: 'fa'
    })
    @IsOptional()
    @Transform(({ value }) => value ?? 'en')
    @IsString()
    targetLang: string;
}