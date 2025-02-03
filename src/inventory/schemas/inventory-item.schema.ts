import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { Document, Types } from 'mongoose';
import { GameType } from '../../common/types/game.types';

export type InventoryItemDocument = InventoryItem & Document;

@Schema({ timestamps: true })
export class InventoryItem {
  _id: Types.ObjectId;

  @Prop({ required: true })
  name: string;

  @Prop({ required: true })
  description: string;

  @Prop({ required: true, enum: GameType })
  gameId: string;

  @Prop({ required: true })
  type: string; // e.g., 'power-up', 'weapon', 'currency'

  @Prop()
  duration?: number; // Duration in seconds if applicable

  @Prop()
  power?: number; // Power/strength if applicable

  @Prop({ default: true })
  isActive: boolean;
}

export const InventoryItemSchema = SchemaFactory.createForClass(InventoryItem); 