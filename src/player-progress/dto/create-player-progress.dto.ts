import { IsEnum, IsMongoId, IsNotEmpty, IsNumber, Min } from 'class-validator';
import { GameType } from '../../common/types/game.types';
import { Types } from 'mongoose';

export class CreatePlayerProgressDto {
  @IsNotEmpty()
  @IsMongoId()
  userId: Types.ObjectId;

  @IsNotEmpty()
  @IsEnum(GameType)
  gameId: string;

  @IsNotEmpty()
  @IsNumber()
  @Min(1)
  level: number = 1;

  @IsNotEmpty()
  @IsNumber()
  @Min(0)
  experience: number = 0;

  @IsNotEmpty()
  @IsNumber()
  @Min(0)
  experienceToNextLevel: number = 1000; // Default value for level 1

  rank: {
    current: string;
    history: { rank: string; achievedAt: Date }[];
  } = {
    current: 'Rookie',
    history: [{ rank: 'Rookie', achievedAt: new Date() }],
  };

  unlocks: {
    items: Types.ObjectId[];
    achievements: Types.ObjectId[];
    powerUps: Types.ObjectId[];
  } = {
    items: [],
    achievements: [],
    powerUps: [],
  };
} 