import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { Document, Schema as MongooseSchema } from 'mongoose';
import { User } from '../../user/schemas/user.schema';
import { Leaderboard } from './leaderboard.schema';
import { GameType } from '../../common/types/game.types';

export type LeaderboardEntryDocument = LeaderboardEntry & Document;

@Schema({ timestamps: true })
export class LeaderboardEntry {
  @Prop({ type: MongooseSchema.Types.ObjectId, ref: 'User', required: true })
  userId: User;

  @Prop({ type: MongooseSchema.Types.ObjectId, ref: 'Leaderboard', required: true })
  leaderboardId: Leaderboard;

  @Prop({ required: true })
  score: number;

  @Prop({ default: 0 })
  extraPoints: number;

  @Prop({ required: true })
  seasonNumber: number;

  @Prop({ required: true, enum: GameType })
  gameId: string;

  @Prop({ type: Object })
  gameStats: {
    totalKills?: number;
    cashCollected?: number;
  };
}

export const LeaderboardEntrySchema = SchemaFactory.createForClass(LeaderboardEntry);

// Create compound index for unique entries per user per leaderboard
LeaderboardEntrySchema.index({ userId: 1, leaderboardId: 1 }, { unique: true }); 