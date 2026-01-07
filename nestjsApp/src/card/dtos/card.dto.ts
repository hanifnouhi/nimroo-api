import { ApiProperty } from '@nestjs/swagger';
import {
  ArrayMaxSize,
  ArrayMinSize,
  IsArray,
  IsBoolean,
  IsDate,
  IsIn,
  IsNotEmpty,
  IsNumber,
  IsOptional,
  IsString,
  Max,
  MaxLength,
  Min,
  MinLength,
} from 'class-validator';

export class CardDto {
  @ApiProperty({
    description: 'The front of the flash card',
    example: 'bonjour',
  })
  @IsNotEmpty()
  @MinLength(2)
  @MaxLength(50)
  @IsString()
  title: string;

  @ApiProperty({
    description: 'The image url of flash card',
    example: 'http://nimroo.com/images/bojour.jpeg',
  })
  @IsString()
  @IsOptional()
  @MaxLength(200)
  image?: string;

  @ApiProperty({
    description: 'The back of the flash card',
    example: 'hello',
  })
  @IsString()
  @IsNotEmpty()
  @MinLength(2)
  @MaxLength(50)
  meaning: string;

  @ApiProperty({
    description: 'It works like a category for a bunch of flash cards',
    example: 'conversation',
  })
  @IsArray()
  @ArrayMinSize(1)
  @IsString({ each: true })
  tags: string[];

  @ApiProperty({
    description: 'Examples of how utilize the title',
    example: ['bonjour madame Paris!', 'bojour ma belle!'],
  })
  @IsArray()
  @IsOptional()
  @ArrayMaxSize(5)
  @IsString({ each: true })
  examples?: string[];

  @ApiProperty({
    description: 'Synonyms of the title',
    example: ['salut', 'coucou'],
  })
  @IsArray()
  @IsOptional()
  @ArrayMaxSize(5)
  @IsString({ each: true })
  synonyms?: string[];

  @ApiProperty({
    description: 'Examples of how utilize the title',
    example: 'bonjour madame Paris!',
  })
  @IsString()
  @IsOptional()
  @MaxLength(2000)
  description?: string;

  @ApiProperty({
    description: 'Opposites of the title',
    example: ['aurevoir', 'ciao'],
  })
  @IsArray()
  @IsOptional()
  @ArrayMaxSize(5)
  @IsString({ each: true })
  antonyms?: string[];

  @ApiProperty({
    description:
      'Category of the flash card tags, each tag can belongs to a category',
    example: ['conversations'],
  })
  @IsString()
  @IsOptional()
  @MinLength(2)
  @MaxLength(20)
  category?: string;

  @ApiProperty({
    description: 'Order of the flash cards',
    example: 1,
  })
  @IsOptional()
  @IsNumber()
  @Max(30)
  @Min(1)
  order?: number;

  @ApiProperty({
    description: 'Visibility of the card',
    example: true,
    default: true,
  })
  @IsOptional()
  @IsBoolean()
  visible?: boolean;

  @ApiProperty({
    enum: ['easy', 'normal', 'hard'],
    description: 'Difficulty of the card',
    example: 'easy',
    default: 'easy',
  })
  @IsOptional()
  @IsString()
  @IsIn(['easy', 'normal', 'hard'])
  difficulty?: string;

  @ApiProperty({
    description: 'Hint for help user to find the answer',
    example: ['this is a place for rest'],
  })
  @IsString()
  @IsOptional()
  @MinLength(2)
  @MaxLength(300)
  hint?: string;

  @ApiProperty({
    description: 'The date that card was created',
    example: '11/10/2025',
    default: new Date().toISOString(),
  })
  @IsOptional()
  @IsDate()
  createdAt?: Date;

  @ApiProperty({
    description: 'How many times this card was reviewed',
    example: 20,
    default: 1,
  })
  @IsOptional()
  @IsNumber()
  reviewCount?: number;

  @ApiProperty({
    description: 'The last itme that card was reviewd',
    example: '11/10/2025',
  })
  @IsOptional()
  @IsDate()
  lastReviewdAt?: Date;
}
