import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { Document, Types } from 'mongoose';

export type BattleRoyalePlayerDocument = BattleRoyalePlayer & Document;

@Schema({ timestamps: true })
export class BattleRoyalePlayer {
  _id: Types.ObjectId;

  @Prop({ type: Types.ObjectId, ref: 'User', required: true })
  userId: Types.ObjectId;

  @Prop({ required: true })
  username: string;

  @Prop({ type: Types.ObjectId, ref: 'BattleRoyaleEvent', required: true })
  eventId: Types.ObjectId;

  @Prop({ default: null })
  roomId: string;

  @Prop({ default: 0 })
  position: number; // 0 means still alive, 1 is winner, 2 is second place, etc.

  @Prop({ default: false })
  entryFeePaid: boolean;

  @Prop({ default: 'registered' })
  status: string; // 'registered', 'active', 'eliminated', 'winner'

  @Prop({ type: Object, default: { x: 0, y: 0, z: 0 } })
  lastPosition: {
    x: number;
    y: number;
    z: number;
  };

  @Prop({ type: Object, default: { x: 1, y: 1, z: 1 } })
  flip: {
    x: number;
    y: number;
    z: number;
  };

  @Prop({ default: 0 })
  rotation: number;

  @Prop({ default: true })
  isAlive: boolean;

  @Prop({ default: 0 })
  cashWon: number;

  @Prop({ default: false })
  cashWithdrawn: boolean;
}

export const BattleRoyalePlayerSchema = SchemaFactory.createForClass(BattleRoyalePlayer); 