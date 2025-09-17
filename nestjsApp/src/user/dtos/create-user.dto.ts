import { IsString, IsEmail, IsStrongPassword, IsNotEmpty, MinLength, MaxLength, IsOptional } from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

export class CreateUserDto {
    @ApiProperty({
        description: 'User email that used as username',
        example: 'nimroo@nimroo.com'
    })
    @IsEmail()
    @IsNotEmpty()
    @MinLength(10)
    @MaxLength(50)
    email: string;

    @ApiProperty({
        description: 'User password',
        example: 'n#fdsf89@g09'
    })
    @IsStrongPassword()
    @IsNotEmpty()
    @MinLength(8)
    @MaxLength(16)
    password: string;

    @ApiPropertyOptional({
        description: 'User name',
        example: 'nimroo'
    })
    @IsOptional()
    @IsString()
    @MaxLength(30)
    name?: string;
}