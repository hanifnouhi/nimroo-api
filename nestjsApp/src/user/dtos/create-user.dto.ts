import { IsString, IsEmail, IsStrongPassword, IsNotEmpty, MinLength, MaxLength, IsOptional, ValidateIf, IsEnum, IsBoolean } from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { UserProvider } from '../user.enums';
import { Transform } from 'class-transformer';

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
    @ValidateIf(o => o.provider === UserProvider.Local)
    @IsNotEmpty()
    @IsStrongPassword()
    @MinLength(8)
    @MaxLength(16)
    password?: string;

    @ApiPropertyOptional({
        description: 'User name',
        example: 'nimroo'
    })
    @IsOptional()
    @IsString()
    @MinLength(2)
    @MaxLength(30)
    name?: string;

    @ApiPropertyOptional({
        description: 'Provider ID is required only if provider is not local',
        example: '1234567890',
    })
    @ValidateIf(o => o.provider !== UserProvider.Local)
    @IsString()
    providerId?: string;
    
    @ApiPropertyOptional({
        description: 'User account provider, may be local or google or other social medias',
        example: 'google',
        default: 'local',
    })
    @Transform(({ value }) => value ?? UserProvider.Local)
    @IsOptional()
    @IsEnum(UserProvider)
    provider?: UserProvider;
    
    @ApiPropertyOptional({
        description: 'Linked OAuth providers with IDs and optional pictures',
        example: {
          google: { id: '1234567890', picture: 'https://example.com/photo.jpg' },
          linkedin: { id: 'abcdef', picture: 'https://example.com/photo2.jpg' },
        },
    })
    @IsOptional()
    oauthProviders?: {
        [key in UserProvider]?: {
            id: string;
            picture?: string;
        };
    };

    @ApiProperty({
        description: 'Is user verified?',
        example: true,
        default: false
    })
    @IsOptional()
    @IsBoolean()
    @Transform(({ obj }) => {
        if (obj.provider && obj.provider !== UserProvider.Local) {
            return true;
        }
        return obj.isVerified ?? false;
    })
    isVerified?: boolean = false;
}