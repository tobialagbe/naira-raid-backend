import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { Document, Types } from 'mongoose';
import { GameType } from '../../common/types/game.types';

export type PlayerProgressDocument = PlayerProgress & Document;

@Schema({ timestamps: true })
export class RankHistory {
  @Prop({ required: true })
  rank: string;

  @Prop({ required: true })
  achievedAt: Date;
}

@Schema({ timestamps: true })
export class Unlocks {
  @Prop({ type: [{ type: Types.ObjectId }], default: [] })
  items: Types.ObjectId[];

  @Prop({ type: [{ type: Types.ObjectId }], default: [] })
  achievements: Types.ObjectId[];

  @Prop({ type: [{ type: Types.ObjectId }], default: [] })
  powerUps: Types.ObjectId[];
}

@Schema({ timestamps: true })
export class PlayerProgress {
  _id: Types.ObjectId;

  @Prop({ type: Types.ObjectId, ref: 'User', required: true })
  userId: Types.ObjectId;

  @Prop({ required: true, enum: GameType })
  gameId: string;

  @Prop({ required: true, min: 1 })
  level: number;

  @Prop({ required: true, min: 0 })
  experience: number;

  @Prop({ required: true })
  experienceToNextLevel: number;

  @Prop({
    type: {
      current: { type: String, required: true },
      history: { type: [RankHistory], default: [] },
    },
    required: true,
  })
  rank: {
    current: string;
    history: RankHistory[];
  };

  @Prop({ type: Unlocks, default: {} })
  unlocks: Unlocks;
}

export const PlayerProgressSchema = SchemaFactory.createForClass(PlayerProgress);

// Create compound index for unique progress per user per game
PlayerProgressSchema.index({ userId: 1, gameId: 1 }, { unique: true }); 