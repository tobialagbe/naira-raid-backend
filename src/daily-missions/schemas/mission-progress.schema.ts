import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { Document, Schema as MongooseSchema } from 'mongoose';
import { User } from '../../user/schemas/user.schema';
import { MissionDefinition } from './mission-definition.schema';

export type MissionProgressDocument = MissionProgress & Document;

export enum MissionStatus {
  IN_PROGRESS = 'in_progress',
  COMPLETED = 'completed',
  CLAIMED = 'claimed'
}

@Schema({ timestamps: true })
export class MissionProgress {
  @Prop({ type: MongooseSchema.Types.ObjectId, ref: 'User', required: true })
  userId: User;

  @Prop({ type: MongooseSchema.Types.ObjectId, ref: 'MissionDefinition', required: true })
  missionId: MissionDefinition;

  @Prop({ required: true })
  date: Date; // The date this mission was assigned

  @Prop({ required: true, default: 0 })
  currentProgress: number;

  @Prop({ type: Object, required: false })
  matchProgress?: {
    matchId: string;
    progress: number;
  }[];

  @Prop({ type: Object, required: false })
  colorProgress?: {
    [colorId: string]: number;
  };

  @Prop({ required: true, enum: MissionStatus, default: MissionStatus.IN_PROGRESS })
  status: string;

  @Prop({ type: Boolean, default: false })
  specialPrizeClaimed: boolean;

  @Prop({ type: Date })
  completedAt?: Date;

  @Prop({ type: Date })
  claimedAt?: Date;
}

export const MissionProgressSchema = SchemaFactory.createForClass(MissionProgress); 