import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { Document, Types } from 'mongoose';
import { GameType } from '../../common/types/game.types';
import { DailyMission } from './daily-mission.schema';

export type UserMissionProgressDocument = UserMissionProgress & Document;

@Schema({ timestamps: true })
export class UserMissionProgress {
  _id: Types.ObjectId;

  @Prop({ type: Types.ObjectId, ref: 'User', required: true })
  userId: Types.ObjectId;

  @Prop({ type: Types.ObjectId, ref: DailyMission.name, required: true })
  missionId: Types.ObjectId | DailyMission;

  @Prop({ required: true })
  progress: number;

  @Prop({ type: [Number], default: [] })
  matchProgresses: number[]; // For tracking progress in individual matches

  @Prop({ required: true })
  date: Date;

  @Prop({ required: true, enum: GameType })
  gameId: string;

  @Prop({ default: false })
  isCompleted: boolean;

  @Prop({ default: false })
  rewardClaimed: boolean;
}

export const UserMissionProgressSchema = SchemaFactory.createForClass(UserMissionProgress);

// Create compound index for unique mission progress per user per day
UserMissionProgressSchema.index(
  { userId: 1, missionId: 1, date: 1 },
  { unique: true }
); 