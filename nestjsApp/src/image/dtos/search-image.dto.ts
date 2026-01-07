import { IsNotEmpty, IsString, MaxLength, MinLength } from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

export class SearchImageDto {
  @ApiProperty({
    description: 'Text for search image',
    example: 'Apple',
  })
  @IsString()
  @IsNotEmpty()
  @MaxLength(30)
  @MinLength(2)
  text: string;

  @ApiPropertyOptional({
    description: 'Source language of the text',
    example: 'fr',
  })
  @IsString()
  @MinLength(2)
  @MaxLength(3)
  sourceLang: string;
}
