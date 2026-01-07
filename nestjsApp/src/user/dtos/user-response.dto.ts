import { Exclude, Expose, Transform } from 'class-transformer';
import { UserDto } from './user.dto';
import { OmitType } from '@nestjs/mapped-types';
import { IsEnum, IsMongoId, IsOptional } from 'class-validator';
import { Types } from 'mongoose';
import {
  MembershipPlan,
  UserGoal,
  UserProvider,
  UserRole,
} from '../user.enums';
import { MembershipHistoryEntryDto } from './membership-history-entry.dto';

@Exclude()
export class UserResponseDto extends OmitType(UserDto, ['status']) {
  @Expose()
  @Transform(({ value }) => value?.toString())
  @IsMongoId()
  declare id: string;

  @Expose()
  declare name: string;

  @Expose()
  declare email: string;

  @Expose()
  declare phone: string | undefined;

  @Expose()
  declare avatar?: string | undefined;

  @Expose()
  declare dateOfBirth?: string | undefined;

  @Expose()
  declare createdAt: string;

  @Expose()
  declare updatedAt?: string | undefined;

  @Expose()
  declare lastLogin?: string | undefined;

  @Expose()
  declare language?: string | undefined;

  @Expose()
  declare notificationEnabled: boolean;

  @Expose()
  declare gender?: string | undefined;

  @Expose()
  declare sourceLanguage: string;

  @Expose()
  declare goal: UserGoal | undefined;

  @Expose()
  declare targetLanguage?: string[] | undefined;

  @Expose()
  declare interests: string[];

  @Expose()
  declare dailyUsage: Map<string, number>;

  @Expose()
  declare membership: MembershipPlan;

  @Expose()
  declare membershipExpiresAt: string;

  @Expose()
  declare isMembershipActive: boolean;

  @Expose()
  declare gracePeriodEndsAt?: string | undefined;

  @Expose()
  declare membershipHistory: Types.DocumentArray<MembershipHistoryEntryDto[]>;

  @Expose()
  declare picture?: string | undefined;

  @Expose()
  declare provider: UserProvider;

  @Expose()
  declare providerId?: string | undefined;

  @Expose()
  declare oauthProviders?: {
    [key in UserProvider]?: {
      id: string;
      picture?: string;
    };
  };

  @Expose()
  declare role: UserRole;
}
