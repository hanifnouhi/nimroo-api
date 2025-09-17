import { PartialType } from '@nestjs/mapped-types';
import { CreateUserDto } from './create-user.dto';
import { ApiProperty } from '@nestjs/swagger';
import { IsString, MaxLength } from 'class-validator';

export class UpdateUserDto extends PartialType(CreateUserDto) {
    @ApiProperty({
        description: 'Refresh token for user authentication',
        example: 'qsfd135qs4df354qs3df1q3s2df1q5df'
    })
    @IsString()
    @MaxLength(500)
    refreshToken?: string;
}