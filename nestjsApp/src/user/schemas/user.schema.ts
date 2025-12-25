import { Schema, Prop, SchemaFactory } from '@nestjs/mongoose';
import mongoose, { BooleanExpression, Document, Types } from 'mongoose';
import { Schema as MongooseSchema } from 'mongoose';
import { UserGoal, UserRole, UserStatus, UserProvider, MembershipPlan } from '../user.enums';

export const MembershipHistoryEntrySchema = new MongooseSchema({
  membership: { type: String, enum: MembershipPlan },
  startedAt: { type: Date, required: true },
  endedAt: { type: Date },
  wasTrial: { type: Boolean, default: false },
  autoRenewed: { type: Boolean, default: false },
});


@Schema({ 
  timestamps: true
})
export class User {
  @Prop()
  name?: string;

  @Prop({ lowercase: true, unique: true, required: true })
  email: string;

  @Prop()
  refreshToken?: string;

  @Prop({ select:false, required: false })
  password: string;

  @Prop()
  phone: string

  @Prop({ enum: UserRole, default: UserRole.User })
  role: UserRole;

  @Prop()
  avatar: string;

  @Prop()
  dateOfBirth: Date;

  @Prop()
  lastLogin: Date;

  @Prop()
  language: string;

  @Prop({ default: false })
  notificationEnabled: boolean;

  @Prop({ default: false })
  isVerified: boolean;

  @Prop({ enum: UserStatus, default: UserStatus.Active})
  status: UserStatus;

  @Prop()
  gender: string;

  @Prop({ enum: UserGoal, default: UserGoal.Language })
  goal: UserGoal;

  @Prop()
  sourceLanguage: string;

  @Prop({ default: [] })
  targetLanguage: string[];

  @Prop({ default: [] })
  interests: string[];

  @Prop({ type: String, enum: MembershipPlan, default: MembershipPlan.FREE })
  membership: MembershipPlan;

  @Prop({ type: Map, of: Number, default: {} })
  dailyUsage: Map<string, number>;

  @Prop({ default: Date.now })
  lastResetDate: Date;

  @Prop({
    default: () => {
      const now = new Date();
      return new Date(now.setMonth(now.getMonth() + 1));
    },
  })
  membershipExpiresAt: Date;

  @Prop({ default: false })
  isTrialUsed: boolean;

  @Prop({ type: Date })
  gracePeriodEndsAt: Date;

  @Prop({ default: false })
  renewalReminderSent: boolean;

  @Prop({ type: [MembershipHistoryEntrySchema], default: [] })
  membershipHistory: Types.DocumentArray<any>;

  @Prop({ type: Date })
  verificationEmailSentAt?: Date;

  @Prop({ type: Date })
  passwordResetEmailSentAt?: Date;

  @Prop()
  picture?: string;

  @Prop({ enum: UserProvider, default: UserProvider.Local })
  provider: UserProvider;

  @Prop()
  providerId?: string;

  @Prop({
    type: Map,
    of: {
      id: { type: String},
      picture: { type: String}
    },
    default: {}
  })
  oauthProviders?: {
    [key in UserProvider]?: {
      id: string;
      picture?: string;
    }
  };

  isMembershipActive: boolean;
}

export type UserDocument = User & Document;

export const UserSchema = SchemaFactory.createForClass(User);

UserSchema.pre('save', function (next) {
  if (this.isNew && this.membership === MembershipPlan.FREE) {
    const tenYearsLater = new Date();
    tenYearsLater.setFullYear(tenYearsLater.getFullYear() + 10);
    this.membershipExpiresAt = tenYearsLater;
  }
  next();
});

UserSchema.index({ status: 1, membership: 1, lastLogin: -1 });

UserSchema.virtual('id').get(function () {
  return this._id.toHexString();
});

UserSchema.virtual('age').get(function() {
  if (!this.dateOfBirth) return null;
  const diff = Date.now() - this.dateOfBirth.getTime();
  return Math.floor(diff / (1000 * 60 * 60 * 24 * 365.25));
});

UserSchema.virtual('isMembershipActive').get(function() {
  const isMembershipDisabled = process.env.DISABLE_MEMBERSHIP_SYSTEM === 'true';
  if (isMembershipDisabled) {
    return true;
  }
  return this.membershipExpiresAt ? this.membershipExpiresAt > new Date() : false;
});

const serializationOptions = {
  virtuals: true,
  versionKey: false,
  transform: (_, ret: Record<string, any>) => {
    if ('_id' in ret) {
      delete ret._id;
    }
    if ('password' in ret) {
      delete ret.password;
    }
  }
};

UserSchema.set('toJSON', serializationOptions);
UserSchema.set('toObject', serializationOptions);