import {
  IsDate,
  IsEnum,
  IsNumber,
  IsOptional,
  IsString,
  Min,
} from 'class-validator';
import { Type } from 'class-transformer';
import { GameType } from '../../common/types/game.types';

export class CreateUserInventoryDto {
  @IsString()
    itemId: string;

  @IsNumber()
  @Min(1)
    quantity: number;

  @IsEnum(GameType)
    gameId: string;

  @IsOptional()
  @Type(() => Date)
  @IsDate()
    expiresAt?: Date;
} 