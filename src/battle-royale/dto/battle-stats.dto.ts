import { ApiProperty } from '@nestjs/swagger';

export class BattleStatsDto {
  @ApiProperty({ description: 'Total number of battles participated in', example: 10 })
  totalBattles: number;

  @ApiProperty({ description: 'Number of battles won', example: 3 })
  wins: number;

  @ApiProperty({ description: 'Best rank achieved (1 is highest/winner)', example: 1 })
  bestRank: number;
  
  @ApiProperty({ description: 'Total unwithdrawn cash from battles', example: 5000 })
  unwithdrawnCash: number;
} 