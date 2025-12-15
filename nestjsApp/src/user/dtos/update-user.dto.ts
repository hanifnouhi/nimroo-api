import { OmitType, PartialType } from '@nestjs/mapped-types';
import { UserDto } from './user.dto';
import { Exclude, Expose } from 'class-transformer';
import { UserGoal, UserProvider } from '../user.enums';

@Exclude()
export class UpdateUserDto extends PartialType(OmitType(UserDto, [
    'createdAt', 
    'email', 
    'id', 
    'role', 
    'status', 
    'isVerified', 
    'lastLogin', 
    'membership',
    'updatedAt',
    'isTrialUsed',
    'isMembershipActive',
    'gracePeriodEndsAt',
    'membershipHistory',
    'membershipExpiresAt',
    'updatedAt'
    ])
) {
    @Expose()
    declare name?: string | undefined;

    @Expose()
    declare phone?: string | undefined;

    @Expose()
    declare avatar?: string | undefined;

    @Expose()
    declare dateOfBirth?: string | undefined;

    @Expose()
    declare language?: string | undefined;

    @Expose()
    declare notificationEnabled?: boolean | undefined;

    @Expose()
    declare gender?: string | undefined;

    @Expose()
    declare goal?: UserGoal | undefined;

    @Expose()
    declare sourceLanguage?: string | undefined;

    @Expose()
    declare targetLanguage?: string[] | undefined;

    @Expose()
    declare interests?: string[] | undefined;

    @Expose()
    declare verificationEmailSentAt?: string | undefined;

    @Expose()
    declare passwordResetEmailSentAt?: string | undefined;

    @Expose()
    declare picture?: string | undefined;

    @Expose()
    declare provider?: UserProvider | undefined;

    @Expose()
    declare providerId?: string | undefined;

    @Expose()
    declare oauthProviders?: {
        [key in UserProvider]?: {
            id: string;
            picture?: string;
        };
    };
}