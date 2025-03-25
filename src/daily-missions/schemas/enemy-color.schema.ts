import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { Document } from 'mongoose';

export type EnemyColorDocument = EnemyColor & Document;

@Schema({ timestamps: true, collection: 'enemycolors' })
export class EnemyColor {
  @Prop({ required: true, unique: true })
  name: string;

  @Prop({ required: true })
  hexCode: string;

  @Prop({ required: true, default: true })
  isActive: boolean;

  @Prop({ type: Object, required: true })
  properties: {
    pointMultiplier: number;
    rarity: string; // common, rare, epic, legendary
    description: string;
  };
}

export const EnemyColorSchema = SchemaFactory.createForClass(EnemyColor); 