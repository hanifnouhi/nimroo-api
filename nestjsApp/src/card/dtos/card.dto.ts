import { ApiProperty } from "@nestjs/swagger";
import { ArrayMaxSize, ArrayMinSize, IsArray, IsNotEmpty, IsOptional, IsString, MaxLength, MinLength } from "class-validator";

export class CardDto {
    @ApiProperty({
        description: 'The front of the flash card',
        example: 'bonjour'
    })
    @IsNotEmpty()
    @MinLength(2)
    @MaxLength(50)
    @IsString()
    title: string;

    @ApiProperty({
        description: 'The image url of flash card',
        example: 'http://nimroo.com/images/bojour.jpeg'
    })
    @IsString()
    @IsOptional()
    @MaxLength(200)
    image?: string;

    @ApiProperty({
        description: 'The back of the flash card',
        example: 'hello'
    })
    @IsString()
    @IsNotEmpty()
    @MinLength(2)
    @MaxLength(50)
    meaning: string;

    @ApiProperty({
        description: 'It works like a category for a bunch of flash cards',
        example: 'conversation'
    })
    @IsArray()
    @ArrayMinSize(1)
    @IsString({ each: true })
    tags: string[];

    @ApiProperty({
        description: 'Examples of how utilize the title',
        example: ['bonjour madame Paris!', 'bojour ma belle!']
    })
    @IsArray()
    @IsOptional()
    @ArrayMaxSize(5)
    @IsString({ each: true })
    examples?: string[];

    @ApiProperty({
        description: 'Synonyms of the title',
        example: ['salut', 'coucou']
    })
    @IsArray()
    @IsOptional()
    @ArrayMaxSize(5)
    @IsString({ each: true })
    synonyms?: string[];

    @ApiProperty({
        description: 'Examples of how utilize the title',
        example: 'bonjour madame Paris!'
    })
    @IsString()
    @IsOptional()
    @MaxLength(2000)
    description?: string;

    @ApiProperty({
        description: 'Opposites of the title',
        example: ['aurevoir', 'ciao']
    })
    @IsArray()
    @IsOptional()
    @ArrayMaxSize(5)
    @IsString({ each: true })
    opposites?: string[];

    @ApiProperty({
        description: 'Category of the flash card tags, each tag can belongs to a category',
        example: ['conversations']
    })
    @IsString()
    @IsOptional()
    @MinLength(2)
    @MaxLength(20)
    category?: string;
}