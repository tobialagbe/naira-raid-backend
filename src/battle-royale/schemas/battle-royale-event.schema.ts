import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { Document, Types } from 'mongoose';

export type BattleRoyaleEventDocument = BattleRoyaleEvent & Document;

@Schema({ timestamps: true })
export class BattleRoyaleEvent {
  _id: Types.ObjectId;

  @Prop({ required: true })
  title: string;

  @Prop({ required: true })
  description: string;

  @Prop({ required: true })
  eventDate: Date;

  @Prop({ required: true })
  startTime: string; // Format: "HH:MM" in 24-hour format

  @Prop({ default: 0 })
  entryFee: number;

  @Prop({ required: true })
  prizePools: number[];

  @Prop({ default: false })
  isActive: boolean;

  @Prop({ default: 'upcoming' })
  status: string; // 'upcoming', 'active', 'completed'

  @Prop({ default: 100 })
  maxPlayers: number;

  @Prop({ default: [] })
  rooms: string[]; // List of active room IDs for this event
}

export const BattleRoyaleEventSchema = SchemaFactory.createForClass(BattleRoyaleEvent); 