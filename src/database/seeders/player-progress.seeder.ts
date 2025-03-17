import { Injectable } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model } from 'mongoose';
import { faker } from '@faker-js/faker';
import { PlayerProgress, PlayerProgressDocument } from '../../player-progress/schemas/player-progress.schema';
import { UserDocument } from '../../user/schemas/user.schema';
import { GameType } from '../../common/types/game.types';

@Injectable()
export class PlayerProgressSeeder {
  constructor(
    @InjectModel(PlayerProgress.name)
    private readonly playerProgressModel: Model<PlayerProgressDocument>,
  ) {}

  async seed(users: UserDocument[]): Promise<PlayerProgressDocument[]> {
    // Clear existing progress
    await this.playerProgressModel.deleteMany({});

    const progressRecords: Partial<PlayerProgress>[] = [];

    // Create progress for each user
    for (const user of users) {
      const level = faker.number.int({ min: 1, max: 50 });
      const ranks = ['Rookie', 'Intermediate', 'Advanced', 'Veteran', 'Expert', 'Master', 'Legend'];
      const currentRankIndex = Math.min(Math.floor(level / 7), ranks.length - 1);
      
      // Generate rank history
      const rankHistory = [];
      for (let i = 0; i <= currentRankIndex; i++) {
        rankHistory.push({
          rank: ranks[i],
          achievedAt: faker.date.past(),
        });
      }

      progressRecords.push({
        userId: user._id,
        gameId: GameType.NAIRA_RAID,
        level,
        experience: faker.number.int({ min: 0, max: 999 }),
        experienceToNextLevel: 1000 * Math.pow(1.2, level - 1),
        rank: {
          current: ranks[currentRankIndex],
          history: rankHistory.sort((a, b) => a.achievedAt.getTime() - b.achievedAt.getTime()),
        },
        unlocks: {
          items: [],
          achievements: [],
          powerUps: [],
        },
      });
    }

    return this.playerProgressModel.insertMany(progressRecords) as Promise<PlayerProgressDocument[]>;
  }
} 