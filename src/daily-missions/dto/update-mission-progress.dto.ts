import { IsString, IsNumber, IsObject, ValidateNested, Min } from 'class-validator';
import { Type } from 'class-transformer';
import { ApiProperty } from '@nestjs/swagger';

export class ColorKillsDto {
  [key: string]: number;
}

export class GameStatsDto {
  @ApiProperty()
  @IsNumber()
  @Min(0)
  kills: number;

  @ApiProperty({ type: ColorKillsDto })
  @IsObject()
  colorKills: ColorKillsDto;
}

export class UpdateMissionProgressDto {
  @ApiProperty()
  @IsString()
  gameId: string;

  @ApiProperty()
  @IsString()
  matchId: string;

  @ApiProperty({ type: GameStatsDto })
  @ValidateNested()
  @Type(() => GameStatsDto)
  stats: GameStatsDto;
} 