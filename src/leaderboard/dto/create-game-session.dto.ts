import { IsEnum, IsNumber, IsObject, Min, ValidateNested } from 'class-validator';
import { Type } from 'class-transformer';
import { GameType } from '../../common/types/game.types';

// Record of colorId -> number of kills
class ColorKillsDto {
  [key: string]: number;
}

class GameStatsDto {
  @IsNumber()
  @Min(0)
  totalKills: number;

  @IsNumber()
  @Min(0)
  cashCollected: number;

  @IsObject()
  colorKills: ColorKillsDto;
}

export class CreateGameSessionDto {
  @IsEnum(GameType)
  gameId: string;

  @IsNumber()
  @Min(0)
  score: number;

  @ValidateNested()
  @Type(() => GameStatsDto)
  @IsObject()
  gameStats: GameStatsDto;
} 