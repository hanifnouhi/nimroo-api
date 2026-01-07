import { OmitType, PartialType } from '@nestjs/mapped-types';
import { UserDto } from './user.dto';
import { Exclude, Expose } from 'class-transformer';
import { Types } from 'mongoose';
import { MembershipPlan, UserGoal, UserRole, UserStatus } from '../user.enums';
import { MembershipHistoryEntryDto } from './membership-history-entry.dto';

@Exclude()
export class AdminUpdateUserDto extends PartialType(
  OmitType(UserDto, ['createdAt', 'id', 'email', 'lastLogin', 'updatedAt']),
) {
  @Expose()
  declare name?: string | undefined;

  @Expose()
  declare phone?: string | undefined;

  @Expose()
  declare role?: UserRole | undefined;

  @Expose()
  declare avatar?: string | undefined;

  @Expose()
  declare dateOfBirth?: string | undefined;

  @Expose()
  declare language?: string | undefined;

  @Expose()
  declare notificationEnabled?: boolean | undefined;

  @Expose()
  declare isVerified?: boolean | undefined;

  @Expose()
  declare status?: UserStatus | undefined;

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
  declare dailyUsage?: Map<string, number> | undefined;

  @Expose()
  declare lastResetDate?: string | undefined;

  @Expose()
  declare membership: MembershipPlan;

  @Expose()
  declare membershipExpiresAt?: string | undefined;

  @Expose()
  declare isMembershipActive?: boolean | undefined;

  @Expose()
  declare isTrialUsed?: boolean | undefined;

  @Expose()
  declare gracePeriodEndsAt?: string | undefined;

  @Expose()
  declare renewalReminderSent?: boolean | undefined;

  @Expose()
  declare membershipHistory?:
    | Types.DocumentArray<MembershipHistoryEntryDto[]>
    | undefined;

  @Expose()
  declare verificationEmailSentAt?: string | undefined;

  @Expose()
  declare passwordResetEmailSentAt?: string | undefined;

  @Expose()
  declare picture?: string | undefined;
}
