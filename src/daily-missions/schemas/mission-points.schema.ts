import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { Document, Schema as MongooseSchema } from 'mongoose';
import { User } from '../../user/schemas/user.schema';

export type MissionPointsDocument = MissionPoints & Document;

@Schema({ timestamps: true })
export class MissionPoints {
  @Prop({ type: MongooseSchema.Types.ObjectId, ref: 'User', required: true })
  userId: User;

  @Prop({ required: true })
  gameId: string;

  @Prop({ required: true })
  seasonNumber: number;

  @Prop({ required: true, default: 0 })
  totalPoints: number; // Accumulates points from all completed missions in the season

  @Prop({ type: [{ type: Object }], default: [] })
  pointHistory: {
    missionId: MongooseSchema.Types.ObjectId;
    points: number;
    date: Date;
  }[];
}

export const MissionPointsSchema = SchemaFactory.createForClass(MissionPoints);

// Create a compound index for efficient lookups
MissionPointsSchema.index({ userId: 1, gameId: 1, seasonNumber: 1 }, { unique: true }); 