import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { Document, Types } from 'mongoose';

export type UserDocument = User & Document;

@Schema({ timestamps: true })
export class User {
  _id: Types.ObjectId;

  @Prop({ required: true })
  firstName: string;

  @Prop()
  lastName?: string;

  @Prop({ required: true, unique: true })
  username: string;

  @Prop({ required: true, unique: true })
  email: string;

  @Prop()
  phoneNumber?: string;

  @Prop({ required: true })
  password: string;

  @Prop({ default: false })
  isEmailVerified: boolean;

  @Prop({ unique: true, sparse: true })
  instagram?: string;

  @Prop({ unique: true, sparse: true })
  tiktok?: string;

  @Prop({ default: 0 })
  points: number;

  @Prop({ default: 0 })
  coins: number;
}

export const UserSchema = SchemaFactory.createForClass(User); 