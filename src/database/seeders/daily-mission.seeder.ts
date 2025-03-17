import { Injectable } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model } from 'mongoose';
import { faker } from '@faker-js/faker';
import { DailyMission, DailyMissionDocument, MissionType } from '../../daily-missions/schemas/daily-mission.schema';
import { GameType } from '../../common/types/game.types';

@Injectable()
export class DailyMissionSeeder {
  constructor(
    @InjectModel(DailyMission.name)
    private readonly dailyMissionModel: Model<DailyMissionDocument>,
  ) {}

  async seed(): Promise<DailyMissionDocument[]> {
    // Clear existing missions
    await this.dailyMissionModel.deleteMany({});

    const missions: Partial<DailyMission>[] = [];

    // Create missions for each type
    Object.values(MissionType).forEach((type) => {
      const count = faker.number.int({ min: 2, max: 4 }); // 2-4 missions per type
      
      for (let i = 0; i < count; i++) {
        const target = faker.number.int({ min: 5, max: 50 });
        const missionData: Partial<DailyMission> = {
          name: this.generateMissionName(type, target),
          description: this.generateMissionDescription(type, target),
          gameId: GameType.NAIRA_RAID,
          type,
          target,
          rewardPoints: faker.number.int({ min: 100, max: 1000 }),
          isActive: true,
        };

        // Only add matchesRequired for KILLS_IN_MATCHES type
        if (type === MissionType.KILLS_IN_MATCHES) {
          missionData.matchesRequired = faker.number.int({ min: 3, max: 5 });
        }

        missions.push(missionData);
      }
    });

    return this.dailyMissionModel.insertMany(missions) as Promise<DailyMissionDocument[]>;
  }

  private generateMissionName(type: MissionType, target: number): string {
    switch (type) {
      case MissionType.TOTAL_KILLS:
        return `Eliminate ${target} Enemies`;
      case MissionType.SINGLE_MATCH_KILLS:
        return `Get ${target} Kills in One Match`;
      case MissionType.KILLS_IN_MATCHES:
        return `Get ${target} Kills in Multiple Matches`;
      default:
        return `Complete ${target} Objectives`;
    }
  }

  private generateMissionDescription(type: MissionType, target: number): string {
    switch (type) {
      case MissionType.TOTAL_KILLS:
        return `Eliminate a total of ${target} enemies in any number of matches.`;
      case MissionType.SINGLE_MATCH_KILLS:
        return `Eliminate ${target} enemies in a single match.`;
      case MissionType.KILLS_IN_MATCHES:
        return `Get ${target} kills in each of several matches.`;
      default:
        return `Complete ${target} mission objectives.`;
    }
  }
} 