import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { Document, Types } from 'mongoose';
import { GameType } from '../../common/types/game.types';
import { InventoryItem } from './inventory-item.schema';

export type UserInventoryDocument = UserInventory & Document;

@Schema({ timestamps: true })
export class UserInventory {
  _id: Types.ObjectId;

  @Prop({ type: Types.ObjectId, ref: 'User', required: true })
  userId: Types.ObjectId;

  @Prop({ type: Types.ObjectId, ref: InventoryItem.name, required: true })
  itemId: Types.ObjectId | InventoryItem;

  @Prop({ required: true })
  quantity: number;

  @Prop({ required: true, enum: GameType })
  gameId: string;

  @Prop()
  expiresAt?: Date;
}

export const UserInventorySchema = SchemaFactory.createForClass(UserInventory);

// Create compound index for unique item per user per game
UserInventorySchema.index({ userId: 1, itemId: 1, gameId: 1 }, { unique: true }); 