import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { Document, Types } from 'mongoose';
import { GameType } from '../../common/types/game.types';

export enum MissionType {
  TOTAL_KILLS = 'total_kills',
  SINGLE_MATCH_KILLS = 'single_match_kills',
  KILLS_IN_MATCHES = 'kills_in_matches'
}

export type DailyMissionDocument = DailyMission & Document;

@Schema({ timestamps: true })
export class DailyMission {
  _id: Types.ObjectId;

  @Prop({ required: true })
  name: string;

  @Prop({ required: true })
  description: string;

  @Prop({ required: true, enum: GameType })
  gameId: string;

  @Prop({ required: true, enum: MissionType })
  type: MissionType;

  @Prop({ required: true })
  target: number;

  @Prop({ required: function(this: DailyMission) {
    return this.type === MissionType.KILLS_IN_MATCHES;
  } })
  matchesRequired?: number;

  @Prop({ required: true })
  rewardPoints: number;

  @Prop({ default: true })
  isActive: boolean;
}

export const DailyMissionSchema = SchemaFactory.createForClass(DailyMission); 