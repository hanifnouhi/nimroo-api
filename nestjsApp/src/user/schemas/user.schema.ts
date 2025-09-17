import { Schema, Prop, SchemaFactory } from '@nestjs/mongoose';
import { Document } from 'mongoose';

@Schema()
export class User {
  @Prop()
  name?: string;

  @Prop({ lowercase: true, unique: true, required: true })
  email: string;

  @Prop()
  refreshToken?: string;

  @Prop({ select:false, required: true })
  password: string;
}

export type UserDocument = User & Document;

export const UserSchema = SchemaFactory.createForClass(User);

UserSchema.virtual('id').get(function () {
  return this._id.toHexString();
});

UserSchema.set('toJSON', {
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
});