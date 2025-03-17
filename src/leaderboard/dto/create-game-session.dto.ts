import { IsEnum, IsNumber, IsObject, Min, ValidateNested } from 'class-validator';
import { Type } from 'class-transformer';
import { GameType } from '../../common/types/game.types';

class GameStatsDto {
  @IsNumber()
  @Min(0)
  totalKills: number;

  @IsNumber()
  @Min(0)
  cashCollected: number;
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