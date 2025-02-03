import { IsEnum, IsNumber, IsObject, IsOptional, Min } from 'class-validator';
import { GameType } from '../../common/types/game.types';

export class CreateLeaderboardEntryDto {
  @IsNumber()
  @Min(0)
  score: number;

  @IsNumber()
  @Min(0)
  @IsOptional()
  extraPoints?: number;

  @IsNumber()
  @Min(1)
  seasonNumber: number;

  @IsEnum(GameType)
  gameId: string;

  @IsObject()
  gameStats: {
    totalKills?: number;
    cashCollected?: number;
  };
} 