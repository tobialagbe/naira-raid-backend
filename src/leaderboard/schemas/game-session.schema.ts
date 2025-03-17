import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { Document, Schema as MongooseSchema } from 'mongoose';
import { User } from '../../user/schemas/user.schema';
import { GameType } from '../../common/types/game.types';

export type GameSessionDocument = GameSession & Document;

@Schema({ timestamps: true })
export class GameSession {
  @Prop({ type: MongooseSchema.Types.ObjectId, ref: 'User', required: true })
  userId: User;

  @Prop({ required: true, enum: GameType })
  gameId: string;

  @Prop({ required: true })
  score: number;

  @Prop({ type: Object, required: true })
  gameStats: {
    totalKills: number;
    cashCollected: number;
  };

  @Prop({ default: true })
  isCompleted: boolean;
}

export const GameSessionSchema = SchemaFactory.createForClass(GameSession); 