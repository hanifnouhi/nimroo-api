import { IsString } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';

export class ImageResultDto {
  @ApiProperty({
    description: 'image address for viewing image',
    example: 'http://test.com/image/default.jpg',
  })
  @IsString()
  imageUrl: string;

  @ApiProperty({
    description: 'image address for download',
    example: 'http://test.com/image/?download:default.jpg',
  })
  @IsString()
  downloadUrl: string;
}
