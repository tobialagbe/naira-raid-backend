import {
  IsEnum,
  IsNumber,
  IsOptional,
  IsString,
  Min,
} from 'class-validator';
import { GameType } from '../../common/types/game.types';

export class CreateInventoryItemDto {
  @IsString()
    name: string;

  @IsString()
    description: string;

  @IsEnum(GameType)
    gameId: string;

  @IsString()
    type: string;

  @IsOptional()
  @IsNumber()
  @Min(0)
    duration?: number;

  @IsOptional()
  @IsNumber()
  @Min(0)
    power?: number;
} 