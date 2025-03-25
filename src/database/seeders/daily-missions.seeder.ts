/* eslint-disable max-len */
import { Injectable } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model } from 'mongoose';
import { MissionDefinition, MissionType, MissionRequirementType } from '../../daily-missions/schemas/mission-definition.schema';
import { EnemyColor } from '../../daily-missions/schemas/enemy-color.schema';
import { MissionProgress, MissionStatus } from '../../daily-missions/schemas/mission-progress.schema';
import { MissionPoints } from '../../daily-missions/schemas/mission-points.schema';
import { GameType } from '../../common/types/game.types';

@Injectable()
export class DailyMissionsSeeder {
  constructor(
    @InjectModel(MissionDefinition.name)
    private readonly missionDefinitionModel: Model<MissionDefinition>,
    @InjectModel(EnemyColor.name)
    private readonly enemyColorModel: Model<EnemyColor>,
    @InjectModel(MissionProgress.name)
    private readonly missionProgressModel: Model<MissionProgress>,
    @InjectModel(MissionPoints.name)
    private readonly missionPointsModel: Model<MissionPoints>,
  ) {
    console.log('[DailyMissionsSeeder] Constructed');
    console.log(`[DailyMissionsSeeder] MissionDefinition model name: ${MissionDefinition.name}`);
    console.log(`[DailyMissionsSeeder] EnemyColor model name: ${EnemyColor.name}`);
  }

  async seed() {
    try {
      console.log('[DailyMissionsSeeder] Starting daily missions seeding...');
      
      // Clear existing data
      console.log('[DailyMissionsSeeder] Clearing existing data...');
      const [missionDeleteResult, colorDeleteResult, progressDeleteResult, pointsDeleteResult] = await Promise.all([
        this.missionDefinitionModel.deleteMany({}),
        this.enemyColorModel.deleteMany({}),
        this.missionProgressModel.deleteMany({}),
        this.missionPointsModel.deleteMany({}),
      ]);
      console.log(`[DailyMissionsSeeder] Deleted ${missionDeleteResult.deletedCount} mission definitions`);
      console.log(`[DailyMissionsSeeder] Deleted ${colorDeleteResult.deletedCount} enemy colors`);
      console.log(`[DailyMissionsSeeder] Deleted ${progressDeleteResult.deletedCount} mission progresses`);
      console.log(`[DailyMissionsSeeder] Deleted ${pointsDeleteResult.deletedCount} mission points`);

      // Seed enemy colors
      console.log('[DailyMissionsSeeder] Creating enemy colors...');
      const colorData = [
        {
          name: 'Red',
          hexCode: '#FF0000',
          isActive: true,
          properties: {
            pointMultiplier: 1.0,
            rarity: 'common',
            description: 'Basic enemy type',
          },
        },
        {
          name: 'Blue',
          hexCode: '#0000FF',
          isActive: true,
          properties: {
            pointMultiplier: 1.5,
            rarity: 'rare',
            description: 'Faster and more agile',
          },
        },
        {
          name: 'Gold',
          hexCode: '#FFD700',
          isActive: true,
          properties: {
            pointMultiplier: 3.0,
            rarity: 'legendary',
            description: 'Rare and valuable enemy',
          },
        },
      ];

      console.log('[DailyMissionsSeeder] About to create enemy colors with data:', JSON.stringify(colorData, null, 2));
      const colors = await this.enemyColorModel.create(colorData);
      console.log(`[DailyMissionsSeeder] Created ${colors.length} enemy colors`);

      // Log color IDs for debugging
      colors.forEach(color => {
        console.log(`[DailyMissionsSeeder] Created color: ${color.name} with ID: ${color._id}`);
      });

      // Seed mission definitions
      console.log('[DailyMissionsSeeder] Creating mission definitions...');
      const missionData = [
        {
          title: 'Kill Streak',
          description: 'Get 50 kills in a single match',
          type: MissionType.SINGLE_MATCH,
          requirementType: MissionRequirementType.KILLS,
          requirementValue: 50,
          points: 300,
          isActive: true,
        },
        {
          title: 'Daily Hunter',
          description: 'Accumulate 100 kills throughout the day',
          type: MissionType.DAILY_CUMULATIVE,
          requirementType: MissionRequirementType.KILLS,
          requirementValue: 100,
          points: 200,
          isActive: true,
        },
        {
          title: 'Gold Rush',
          description: 'Kill 10 gold enemies in a single match',
          type: MissionType.COLOR_SPECIFIC_MATCH,
          requirementType: MissionRequirementType.COLOR_KILLS,
          requirementValue: 10,
          colorRequirement: {
            colorId: colors[2]._id.toString(),
            colorName: 'Gold',
          },
          points: 500,
          isActive: true,
        },
        {
          title: 'Blue Hunter',
          description: 'Kill 30 blue enemies throughout the day',
          type: MissionType.COLOR_SPECIFIC_DAILY,
          requirementType: MissionRequirementType.COLOR_KILLS,
          requirementValue: 30,
          colorRequirement: {
            colorId: colors[1]._id.toString(),
            colorName: 'Blue',
          },
          points: 300,
          isActive: true,
        },
        {
          title: 'Red Menace',
          description: 'Kill 50 red enemies throughout the day',
          type: MissionType.COLOR_SPECIFIC_DAILY,
          requirementType: MissionRequirementType.COLOR_KILLS,
          requirementValue: 50,
          colorRequirement: {
            colorId: colors[0]._id.toString(),
            colorName: 'Red',
          },
          points: 200,
          isActive: true,
        },
      ];

      console.log('[DailyMissionsSeeder] About to create mission definitions with data:', JSON.stringify(missionData, null, 2));
      const missions = await this.missionDefinitionModel.create(missionData);
      console.log(`[DailyMissionsSeeder] Created ${missions.length} mission definitions`);

      // Log mission details for debugging
      missions.forEach(mission => {
        console.log(`[DailyMissionsSeeder] Created mission: ${mission.title} with ID: ${mission._id}`);
      });

      // Create some sample mission progress and points
      console.log('[DailyMissionsSeeder] Creating sample mission progress and points...');
      
      // Sample user IDs (you might want to get these from actual users)
      const sampleUserIds = [
        '507f1f77bcf86cd799439011',
        '507f1f77bcf86cd799439012',
        '507f1f77bcf86cd799439013'
      ];

      const today = new Date();
      today.setHours(0, 0, 0, 0);

      // Create mission progress for each user
      for (const userId of sampleUserIds) {
        // Create progress for each mission
        const progressData = missions.map(mission => ({
          userId,
          missionId: mission._id,
          date: today,
          currentProgress: Math.floor(Math.random() * mission.requirementValue),
          status: MissionStatus.IN_PROGRESS,
        }));

        await this.missionProgressModel.create(progressData);
        console.log(`[DailyMissionsSeeder] Created ${progressData.length} mission progresses for user ${userId}`);

        // Create mission points
        const pointsData = {
          userId,
          gameId: GameType.NAIRA_RAID,
          seasonNumber: 1,
          totalPoints: Math.floor(Math.random() * 1000),
          pointHistory: missions.map(mission => ({
            missionId: mission._id,
            points: mission.points,
            date: new Date(),
          })),
        };

        await this.missionPointsModel.create(pointsData);
        console.log(`[DailyMissionsSeeder] Created mission points for user ${userId}`);
      }

      // Verify the data was created
      const colorCount = await this.enemyColorModel.countDocuments();
      const missionCount = await this.missionDefinitionModel.countDocuments();
      const progressCount = await this.missionProgressModel.countDocuments();
      const pointsCount = await this.missionPointsModel.countDocuments();

      console.log(`[DailyMissionsSeeder] Verification - Colors: ${colorCount}, Missions: ${missionCount}, Progresses: ${progressCount}, Points: ${pointsCount}`);

      return {
        colors,
        missions,
        progressCount,
        pointsCount,
      };
    } catch (error) {
      console.error('[DailyMissionsSeeder] Error seeding daily missions:', error.stack || error);
      throw error;
    }
  }
} 