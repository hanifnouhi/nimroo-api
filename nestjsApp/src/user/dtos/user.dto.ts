import { IsString, IsEmail, IsNotEmpty, MinLength, MaxLength, IsOptional, IsDateString, IsBoolean, IsNumber, IsArray, ArrayMaxSize, IsMongoId, Max, Min, Matches, IsEnum, IsUrl } from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import mongoose, { Types } from "mongoose";
import { UserGoal, UserRole, UserStatus } from '../user.enums';
import { MembershipHistoryEntryDto } from './membership-history-entry.dto';

export class UserDto {
    @ApiProperty({
        description: 'Unique user id generated automatically by mongodb',
        example: 'adfa234asdfas4asdf'
    })
    @IsString()
    @IsNotEmpty()
    id: string;

    @ApiPropertyOptional({
        description: 'User name',
        example: 'nimroo'
    })
    @IsString()
    @IsOptional()
    @MaxLength(30)
    name: string;

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
        description: 'Phone number',
        example: '+123456789'
    })
    @IsString()
    @IsOptional()
    @MinLength(10)
    @MaxLength(20)
    @Matches(/^\+[1-9]\d{1,14}$/)
    phone?: string;

    @ApiProperty({
        description: 'User age',
        example: '18'
    })
    @IsNumber()
    age: number;

    @ApiProperty({
        description: 'User access role',
        example: 'user',
        enum: UserRole
    })
    @IsEnum(UserRole)
    @IsNotEmpty()
    role: UserRole;

    @ApiProperty({
        description: `Url address of user's avatar`,
        example: 'http://nimroo.com/image/users/avatar.jpeg'
    })
    @IsOptional()
    @MaxLength(300)
    @IsUrl()
    avatar?: string;

    @ApiProperty({
        description: 'Birth date of user',
        example: '1979-10-11T00:00:00.000Z'
    })
    @IsOptional()
    @IsDateString()
    dateOfBirth?: string;

    @ApiProperty({
        description: 'Date of the creation of user',
        example: '2025-10-22T00:00:00.000Z'
    })
    @IsNotEmpty()
    @IsDateString()
    createdAt: string;

    @ApiProperty({
        description: 'Date of the update of the user data',
        example: '2025-10-22T00:00:00.000Z'
    })
    @IsOptional()
    @IsDateString()
    updatedAt?: string;

    @ApiProperty({
        description: 'Last user login',
        example: '2025-10-22T00:00:00.000Z'
    })
    @IsOptional()
    @IsDateString()
    lastLogin?: string;

    @ApiProperty({
        description: 'The user native language',
        example: 'en'
    })
    @IsOptional()
    @MaxLength(3)
    @IsString()
    language?: string;

    @ApiProperty({
        description: 'User notifications must be enable or not',
        example: true,
        default: false
    })
    @IsBoolean()
    notificationEnabled: boolean;

    @ApiProperty({
        description: 'Is user verified?',
        example: true,
        default: false
    })
    @IsBoolean()
    isVerified: boolean;

    @ApiProperty({
        description: 'Status of the user like active, suspended or deleted',
        example: 'active',
        default: UserStatus.Active,
        enum: UserStatus
    })
    @IsEnum(UserStatus)
    @IsNotEmpty()
    status: UserStatus;

    @ApiProperty({
        description: 'User gender',
        example: 'male'
    })
    @IsOptional()
    @MinLength(4)
    @MaxLength(50)
    @IsString()
    gender?: string;

    @ApiProperty({
        description: 'User learning intent to use flash cards',
        example: 'language',
        enum: UserGoal,
        default: UserGoal.Language
    })
    @IsOptional()
    @IsEnum(UserGoal)
    goal?: UserGoal;

    @ApiProperty({
        description: 'Source language of the flash cards',
        example: 'en'
    })
    @MaxLength(3)
    @IsString()
    sourceLanguage: string;

    @ApiProperty({
        description: 'Target language of the flash cards',
        example: 'fr',
        default: []
    })
    @IsOptional()
    @IsArray()
    @ArrayMaxSize(2)
    @IsString({ each: true })
    targetLanguage?: string[];

    @ApiProperty({
        description: 'User interests that will be use in AI services for more appropriate results',
        example: ['sport', 'cinema', 'biking'],
        default: []
    })
    @IsOptional()
    @IsArray()
    @ArrayMaxSize(5)
    @IsString({ each: true })
    interests: string[];

    @ApiProperty({
        description: 'User membership object id for reference to memberships',
        example: '123asdf54q6e5r43'
    })
    @IsOptional()
    @IsMongoId()
    membership?: mongoose.Types.ObjectId;

    @ApiProperty({
        description: 'Membership expire date',
        example: '2025-10-22T00:00:00.000Z'
    })
    @IsNotEmpty()
    @IsDateString()
    membershipExpiresAt: string;

    @ApiProperty({
        description: 'Is membership active?',
        example: false,
        default: false
    })
    @IsNotEmpty()
    @IsBoolean()
    isMembershipActive: boolean;

    @ApiProperty({
        description: 'Is trial used before?',
        example: false,
        default: false
    })
    @IsBoolean()
    isTrialUsed: boolean;

    @ApiProperty({
        description: 'The time that user could use app after membership expiration',
        example: '2025-10-22T00:00:00.000Z'
    })
    @IsOptional()
    @IsDateString()
    gracePeriodEndsAt?: string;

    @ApiProperty({
        description: 'Is renewal reminder sent to user?',
        example: false,
        default: false
    })
    @IsNotEmpty()
    @IsBoolean()
    renewalReminderSent: boolean;

    @ApiProperty({
        description: 'Membership history of user',
        example: '[{ membership: \'123456asdfa456asdf\', startedAt: \'2025-10-22T00:00:00.000Z\', endedAt: \'2025-10-22T00:00:00.000Z\', wasTrial: false, autoRenewed: false}]',
        default: []
    })
    @IsArray()
    membershipHistory: Types.DocumentArray<MembershipHistoryEntryDto[]>;

    @ApiProperty({
        description: 'Date of the verification email sent to user',
        example: '2025-10-22T00:00:00.000Z'
    })
    @IsOptional()
    @IsDateString()
    verificationEmailSentAt?: string;

    @ApiProperty({
        description: 'Date of the password reset email sent to user',
        example: '2025-10-22T00:00:00.000Z'
    })
    @IsOptional()
    @IsDateString()
    passwordResetEmailSentAt?: string;

}