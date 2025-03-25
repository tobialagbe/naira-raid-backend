import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { Document, Schema as MongooseSchema } from 'mongoose';

export type MissionDefinitionDocument = MissionDefinition & Document;

export enum MissionType {
  DAILY_CUMULATIVE = 'daily_cumulative',
  SINGLE_MATCH = 'single_match',
  COLOR_SPECIFIC_DAILY = 'color_specific_daily',
  COLOR_SPECIFIC_MATCH = 'color_specific_match'
}

export enum MissionRequirementType {
  KILLS = 'kills',
  COLOR_KILLS = 'color_kills',
  SCORE = 'score',
  CASH_COLLECTED = 'cash_collected'
}

@Schema({ timestamps: true, collection: 'missiondefinitions' })
export class MissionDefinition {
  @Prop({ required: true })
  title: string;

  @Prop({ required: true })
  description: string;

  @Prop({ required: true, enum: MissionType })
  type: string;

  @Prop({ required: true, enum: MissionRequirementType })
  requirementType: string;

  @Prop({ required: true })
  requirementValue: number;

  @Prop({ type: Object, required: false })
  colorRequirement?: {
    colorId: string;
    colorName: string;
  };

  @Prop({ required: true })
  points: number;

  @Prop({ type: Object, required: false })
  specialPrize?: {
    description: string;
    limitedToFirst: number; // Number of players who can claim this prize, 0 means unlimited
    remaining: number; // How many prizes are left
  };

  @Prop({ default: true })
  isActive: boolean;
}

export const MissionDefinitionSchema = SchemaFactory.createForClass(MissionDefinition); 