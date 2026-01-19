import { ApiProperty } from '@nestjs/swagger';
import {
  IsNotEmpty,
  IsStrongPassword,
  MaxLength,
  MinLength,
} from 'class-validator';

export class ChangePasswordDto {
  @ApiProperty({
    description: 'User password',
    example: 'n#fdsf89@g09',
  })
  @IsStrongPassword()
  @IsNotEmpty()
  @MinLength(8)
  @MaxLength(16)
  password: string;
}
