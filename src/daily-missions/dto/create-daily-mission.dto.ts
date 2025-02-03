import {
  IsEnum,
  IsNumber,
  IsOptional,
  IsString,
  Min,
} from 'class-validator';
import { GameType } from '../../common/types/game.types';
import { MissionType } from '../schemas/daily-mission.schema';

export class CreateDailyMissionDto {
  @IsString()
  name: string;

  @IsString()
  description: string;

  @IsEnum(GameType)
  gameId: string;

  @IsEnum(MissionType)
  type: MissionType;

  @IsNumber()
  @Min(1)
  target: number;

  @IsOptional()
  @IsNumber()
  @Min(1)
  matchesRequired?: number;

  @IsNumber()
  @Min(0)
  rewardPoints: number;
} 