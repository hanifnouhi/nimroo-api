import { ApiProperty } from '@nestjs/swagger';
import { IsMongoId, IsNotEmpty, IsString } from 'class-validator';
import { CardDto } from './card.dto';

export class CreateCardDto extends CardDto {
  @ApiProperty({ example: '123456abcdef' })
  @IsString()
  @IsNotEmpty()
  @IsMongoId()
  user: string;
}
