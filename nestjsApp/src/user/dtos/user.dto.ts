import { Expose } from "class-transformer";
import { IsString, IsEmail, IsStrongPassword, IsNotEmpty, MinLength, MaxLength, IsOptional } from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

export class UserDto {
    @ApiProperty({
        description: 'Unique user id generated automatically by mongodb',
        example: 'adfa234asdfas4asdf'
    })
    @Expose()
    @IsString()
    @IsNotEmpty()
    id: string;

    @ApiPropertyOptional({
        description: 'User name',
        example: 'nimroo'
    })
    @Expose()
    @IsString()
    @IsOptional()
    @MaxLength(30)
    name: string;

    @ApiProperty({
        description: 'User email that used as username',
        example: 'nimroo@nimroo.com'
    })
    @Expose()
    @IsEmail()
    @IsNotEmpty()
    @MinLength(10)
    @MaxLength(50)
    email: string;

    @ApiProperty({
        description: 'Refresh token for user authentication',
        example: 'qsfd135qs4df354qs3df1q3s2df1q5df'
    })
    @Expose()
    @IsString()
    @MaxLength(500)
    refreshToken: string;


    constructor(id: string, name: string, email: string, refreshToken: string) {
        this.id = id;
        this.name = name;
        this.email = email;
        this.refreshToken = refreshToken;
    }
}