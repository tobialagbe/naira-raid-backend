import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { Document } from 'mongoose';
import { GameType } from '../../common/types/game.types';

export type LeaderboardDocument = Leaderboard & Document;

@Schema({ timestamps: true })
export class Leaderboard {
  @Prop({ required: true })
  seasonNumber: number;

  @Prop({ required: true })
  seasonStart: Date;

  @Prop({ required: true })
  seasonEnd: Date;

  @Prop({ required: true, enum: GameType })
  gameId: string;

  @Prop({ default: true })
  isActive: boolean;
}

export const LeaderboardSchema = SchemaFactory.createForClass(Leaderboard); 