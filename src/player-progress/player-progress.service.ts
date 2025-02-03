import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model, Types } from 'mongoose';
import { PlayerProgress, PlayerProgressDocument } from './schemas/player-progress.schema';
import { CreatePlayerProgressDto } from './dto/create-player-progress.dto';
import { UpdatePlayerProgressDto } from './dto/update-player-progress.dto';

@Injectable()
export class PlayerProgressService {
  constructor(
    @InjectModel(PlayerProgress.name)
    private readonly playerProgressModel: Model<PlayerProgressDocument>,
  ) {}

  async create(createPlayerProgressDto: CreatePlayerProgressDto): Promise<PlayerProgress> {
    const createdProgress = new this.playerProgressModel(createPlayerProgressDto);
    return createdProgress.save();
  }

  async findAll(): Promise<PlayerProgress[]> {
    return this.playerProgressModel.find().exec();
  }

  async findOne(id: Types.ObjectId): Promise<PlayerProgress> {
    const progress = await this.playerProgressModel.findById(id).exec();
    if (!progress) {
      throw new NotFoundException(`Player progress with ID ${id} not found`);
    }
    return progress;
  }

  async findByUserAndGame(userId: Types.ObjectId, gameId: string): Promise<PlayerProgress> {
    const progress = await this.playerProgressModel
      .findOne({ userId, gameId })
      .exec();
    if (!progress) {
      throw new NotFoundException(`Progress not found for user ${userId} in game ${gameId}`);
    }
    return progress;
  }

  private calculateExperienceForNextLevel(currentLevel: number): number {
    // Experience required for next level increases by 20% each level
    return Math.floor(1000 * Math.pow(1.2, currentLevel - 1));
  }

  private determineRank(level: number): string {
    if (level >= 50) return 'Legend';
    if (level >= 40) return 'Master';
    if (level >= 30) return 'Expert';
    if (level >= 20) return 'Veteran';
    if (level >= 10) return 'Advanced';
    if (level >= 5) return 'Intermediate';
    return 'Rookie';
  }

  async updateProgress(
    userId: Types.ObjectId,
    gameId: string,
    updateDto: UpdatePlayerProgressDto,
  ): Promise<PlayerProgress> {
    const progress = await this.findByUserAndGame(userId, gameId) as PlayerProgressDocument;
    
    if (updateDto.experienceGained) {
      progress.experience += updateDto.experienceGained;
      
      // Level up logic
      while (progress.experience >= progress.experienceToNextLevel) {
        progress.experience -= progress.experienceToNextLevel;
        progress.level += 1;
        progress.experienceToNextLevel = this.calculateExperienceForNextLevel(progress.level);
        
        // Check for rank change
        const newRank = this.determineRank(progress.level);
        if (newRank !== progress.rank.current) {
          progress.rank.current = newRank;
          progress.rank.history.push({
            rank: newRank,
            achievedAt: new Date(),
          });
        }
      }
    }

    // Update unlocks
    if (updateDto.unlockedItems) {
      progress.unlocks.items.push(...updateDto.unlockedItems);
    }
    if (updateDto.unlockedAchievements) {
      progress.unlocks.achievements.push(...updateDto.unlockedAchievements);
    }
    if (updateDto.unlockedPowerUps) {
      progress.unlocks.powerUps.push(...updateDto.unlockedPowerUps);
    }

    return progress.save();
  }

  async remove(id: Types.ObjectId): Promise<PlayerProgress> {
    const deletedProgress = await this.playerProgressModel
      .findByIdAndDelete(id)
      .exec();
    if (!deletedProgress) {
      throw new NotFoundException(`Player progress with ID ${id} not found`);
    }
    return deletedProgress;
  }
} 