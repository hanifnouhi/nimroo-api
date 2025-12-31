import { ApiProperty, ApiPropertyOptional } from "@nestjs/swagger";
import { Transform } from "class-transformer";
import { IsNotEmpty, IsOptional, IsString, MaxLength, MinLength } from "class-validator";

export class LlmTextDataDto {
    @ApiProperty({
        description: 'The text we want information about',
        example: 'Apple'
    })
    @IsString()
    @IsNotEmpty()
    @MaxLength(50)
    @MinLength(2)
    @Transform(({ value }) => value.toLowerCase().trim())
    text: string;

    @ApiProperty({
        description: 'Target language to which we want infomration',
        example: 'en'
    })
    @IsString()
    @IsNotEmpty()
    @MaxLength(2)
    @Transform(({ value }) => value.toLowerCase().trim())
    targetLang: string;

    @ApiProperty({
        description: 'The lanaguage that user use',
        example: 'en'
    })
    @IsString()
    @IsNotEmpty()
    @MaxLength(2)
    @Transform(({ value }) => value.toLowerCase().trim())
    sourceLang: string;
}