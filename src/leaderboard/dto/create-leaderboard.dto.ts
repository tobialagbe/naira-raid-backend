import { IsDate, IsEnum, IsNumber, Min } from 'class-validator';
import { Type } from 'class-transformer';
import { GameType } from '../../common/types/game.types';

export class CreateLeaderboardDto {
  @IsNumber()
  @Min(1)
  seasonNumber: number;

  @Type(() => Date)
  @IsDate()
  seasonStart: Date;

  @Type(() => Date)
  @IsDate()
  seasonEnd: Date;

  @IsEnum(GameType)
  gameId: string;
} 