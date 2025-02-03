import { IsNumber, IsOptional, Min } from 'class-validator';
import { Types } from 'mongoose';

export class UpdatePlayerProgressDto {
  @IsOptional()
  @IsNumber()
  @Min(0)
  experienceGained?: number;

  @IsOptional()
  unlockedItems?: Types.ObjectId[];

  @IsOptional()
  unlockedAchievements?: Types.ObjectId[];

  @IsOptional()
  unlockedPowerUps?: Types.ObjectId[];
} 