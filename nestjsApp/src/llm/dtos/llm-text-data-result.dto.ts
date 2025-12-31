import { ApiProperty } from "@nestjs/swagger";
import { ArrayMaxSize, IsArray, IsString } from "class-validator";

export class LlmTextDataResultDto {
    @ApiProperty({
        description: 'A short description of text meaning',
        example: 'Apple is a fruit.'
    })
    @IsString()
    meaning: string;

    @ApiProperty({
        description: 'Working examples of the text in the sentences',
        example: '["I eat an apple each day.", "I buy one kilo apple today", "Apple is my favorite fruit"]'
    })
    @IsArray()
    @IsString({ each: true })
    @ArrayMaxSize(4)
    examples: string[];

    @ApiProperty({
        description: 'Synonyms of the text',
        example: '["Apple juice", "Apple pie"]'
    })
    @IsArray()
    @IsString({ each: true })
    @ArrayMaxSize(4)
    synonyms: string[];

    @ApiProperty({
        description: 'Antonyms of the text',
        example: '[]'
    })
    @IsArray()
    @IsString({ each: true })
    @ArrayMaxSize(4)
    antonyms: string[];
}