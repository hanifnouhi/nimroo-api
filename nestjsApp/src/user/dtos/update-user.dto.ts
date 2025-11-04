import { OmitType, PartialType } from '@nestjs/mapped-types';
import { UserDto } from './user.dto';
import { Exclude, Expose } from 'class-transformer';
import { UserGoal } from '../user.enums';

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
}