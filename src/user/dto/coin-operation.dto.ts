import { IsInt, IsPositive } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';

export class CoinOperationDto {
  @ApiProperty({ description: 'Number of coins to add or remove', example: 100 })
  @IsInt()
  @IsPositive()
  amount: number;
} 