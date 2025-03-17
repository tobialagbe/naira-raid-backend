import { Injectable } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model } from 'mongoose';
import { faker } from '@faker-js/faker';
import { UserMissionProgress, UserMissionProgressDocument } from '../../daily-missions/schemas/user-mission-progress.schema';
import { DailyMission, DailyMissionDocument } from '../../daily-missions/schemas/daily-mission.schema';
import { UserDocument } from '../../user/schemas/user.schema';
import { GameType } from '../../common/types/game.types';

@Injectable()
export class UserMissionProgressSeeder {
  constructor(
    @InjectModel(UserMissionProgress.name)
    private readonly userMissionProgressModel: Model<UserMissionProgressDocument>,
    @InjectModel(DailyMission.name)
    private readonly dailyMissionModel: Model<DailyMissionDocument>,
  ) {}

  async seed(users: UserDocument[]): Promise<UserMissionProgressDocument[]> {
    // Clear existing progress
    await this.userMissionProgressModel.deleteMany({});

    // Get all active missions
    const missions = await this.dailyMissionModel.find({ isActive: true });
    if (!missions.length) {
      console.log('No active missions found to create progress for');
      return [];
    }

    const progressRecords: Partial<UserMissionProgress>[] = [];
    const today = new Date();
    today.setHours(0, 0, 0, 0);

    // Create progress records for each user
    for (const user of users) {
      // Randomly select 1-3 missions for each user
      const userMissions = faker.helpers.arrayElements(
        missions,
        faker.number.int({ min: 1, max: 3 })
      );

      for (const mission of userMissions) {
        const progress = faker.number.int({ min: 0, max: mission.target });
        const isCompleted = progress >= mission.target;

        progressRecords.push({
          userId: user._id,
          missionId: mission._id,
          progress,
          matchProgresses: mission.matchesRequired 
            ? Array.from({ length: faker.number.int({ min: 0, max: mission.matchesRequired }) }, 
                () => faker.number.int({ min: 0, max: mission.target }))
            : [],
          date: today,
          gameId: GameType.NAIRA_RAID,
          isCompleted,
          rewardClaimed: isCompleted && faker.datatype.boolean(),
        });
      }
    }

    return this.userMissionProgressModel.insertMany(progressRecords) as Promise<UserMissionProgressDocument[]>;
  }
} 