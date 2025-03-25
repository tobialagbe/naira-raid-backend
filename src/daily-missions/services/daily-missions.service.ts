/* eslint-disable max-len */
import { Injectable, NotFoundException, BadRequestException, Inject, forwardRef } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model, Types, Schema as MongooseSchema } from 'mongoose';
import { MissionDefinition, MissionDefinitionDocument, MissionType, MissionRequirementType } from '../schemas/mission-definition.schema';
import { MissionProgress, MissionProgressDocument, MissionStatus } from '../schemas/mission-progress.schema';
import { MissionPoints, MissionPointsDocument } from '../schemas/mission-points.schema';
import { LeaderboardService } from '../../leaderboard/leaderboard.service';
import { GameType } from '../../common/types/game.types';
import { LeaderboardEntry, LeaderboardEntryDocument } from '../../leaderboard/schemas/leaderboard-entry.schema';
import { CreateMissionDefinitionDto } from '../dto/create-mission-definition.dto';

@Injectable()
export class DailyMissionsService {
  constructor(
    @InjectModel(MissionDefinition.name)
    private readonly missionDefinitionModel: Model<MissionDefinitionDocument>,
    @InjectModel(MissionProgress.name)
    private readonly missionProgressModel: Model<MissionProgressDocument>,
    @InjectModel(MissionPoints.name)
    private readonly missionPointsModel: Model<MissionPointsDocument>,
    @Inject(forwardRef(() => LeaderboardService))
    private readonly leaderboardService: LeaderboardService,
    @InjectModel(LeaderboardEntry.name)
    private readonly leaderboardEntryModel: Model<LeaderboardEntryDocument>,
  ) {}

  /**
   * Get daily missions for a player
   * -----------------------------
   * Fetches or creates new daily missions for the player
   */
  async getDailyMissions(userId: string) {
    const today = new Date();
    today.setHours(0, 0, 0, 0);

    // Get player's missions for today
    let missions = await this.missionProgressModel
      .find({
        userId,
        date: {
          $gte: today,
          $lt: new Date(today.getTime() + 24 * 60 * 60 * 1000),
        },
      })
      .populate('missionId');

    // If no missions for today, generate new ones
    if (missions.length === 0) {
      missions = await this.generateDailyMissions(userId);
    }

    return missions;
  }

  /**
   * Generate daily missions for a player
   * ----------------------------------
   * Creates a new set of daily missions for the player.
   * Uses the current date to deterministically select missions,
   * ensuring all players get the same missions on any given day.
   */
  private async generateDailyMissions(userId: string) {
    // Get active mission definitions
    const missionDefs = await this.missionDefinitionModel
      .find({ isActive: true })
      .exec();

    if (missionDefs.length < 3) {
      throw new BadRequestException('Not enough active missions available');
    }

    const today = new Date();
    today.setHours(0, 0, 0, 0);

    // Create a deterministic seed based on the date
    const dateString = today.toISOString().split('T')[0]; // Format: YYYY-MM-DD
    const dateSeed = Array.from(dateString).reduce((acc, char) => acc + char.charCodeAt(0), 0);

    // Sort missions deterministically based on the date
    const sortedMissions = [...missionDefs].sort((a, b) => {
      // Create a unique number for each mission based on its ID and the date
      const aValue = (a._id.toString() + dateSeed).split('').reduce((acc, char) => acc + char.charCodeAt(0), 0);
      const bValue = (b._id.toString() + dateSeed).split('').reduce((acc, char) => acc + char.charCodeAt(0), 0);
      return aValue - bValue;
    });

    // Take the first 3 missions after sorting
    const selectedMissions = sortedMissions.slice(0, 3);

    // Create mission progress entries
    const missionProgress = await Promise.all(
      selectedMissions.map(mission => {
        return new this.missionProgressModel({
          userId: new Types.ObjectId(userId),
          missionId: mission._id,
          date: today,
          currentProgress: 0,
          status: MissionStatus.IN_PROGRESS,
        }).save();
      }),
    );

    return missionProgress;
  }

  /**
   * Update mission progress
   * ---------------------
   * Updates progress for missions based on game events
   */
  async updateMissionProgress(
    userId: string,
    gameId: string,
    matchId: string,
    stats: {
      kills: number;
      colorKills: { [colorId: string]: number };
    },
  ) {
    const today = new Date();
    today.setHours(0, 0, 0, 0);

    // Get today's missions
    const missions = await this.missionProgressModel
      .find({
        userId,
        date: {
          $gte: today,
          $lt: new Date(today.getTime() + 24 * 60 * 60 * 1000),
        },
        status: { $ne: MissionStatus.CLAIMED },
      })
      .populate('missionId');

    // Process each mission
    for (const mission of missions) {
      const def = mission.missionId as MissionDefinitionDocument;

      switch (def.type) {
        case MissionType.DAILY_CUMULATIVE:
          if (def.requirementType === MissionRequirementType.KILLS) {
            mission.currentProgress += stats.kills;
          }
          break;

        case MissionType.SINGLE_MATCH:
          if (def.requirementType === MissionRequirementType.KILLS) {
            if (!mission.matchProgress) {
              mission.matchProgress = [];
            }
            mission.matchProgress.push({
              matchId,
              progress: stats.kills,
            });
            mission.currentProgress = Math.max(
              ...mission.matchProgress.map(m => m.progress),
            );
          }
          break;

        case MissionType.COLOR_SPECIFIC_DAILY:
          if (def.requirementType === MissionRequirementType.COLOR_KILLS && def.colorRequirement) {
            const colorKills = stats.colorKills[def.colorRequirement.colorId] || 0;
            mission.currentProgress += colorKills;
          }
          break;

        case MissionType.COLOR_SPECIFIC_MATCH:
          if (def.requirementType === MissionRequirementType.COLOR_KILLS && def.colorRequirement) {
            const colorKills = stats.colorKills[def.colorRequirement.colorId] || 0;
            if (!mission.matchProgress) {
              mission.matchProgress = [];
            }
            mission.matchProgress.push({
              matchId,
              progress: colorKills,
            });
            mission.currentProgress = Math.max(
              ...mission.matchProgress.map(m => m.progress),
            );
          }
          break;
      }

      // Check if mission is completed
      if (mission.currentProgress >= def.requirementValue && mission.status === MissionStatus.IN_PROGRESS) {
        mission.status = MissionStatus.COMPLETED;
        mission.completedAt = new Date();
      }

      await mission.save();
    }
  }

  /**
   * Claim mission rewards
   * -------------------
   * Claims rewards for a completed mission
   */
  async claimMissionReward(userId: string, missionProgressId: string) {
    const mission = await this.missionProgressModel
      .findById(missionProgressId)
      .populate('missionId');

    if (!mission) {
      throw new NotFoundException('Mission progress not found');
    }

    if (mission.status !== MissionStatus.COMPLETED) {
      throw new BadRequestException('Mission is not completed');
    }

    const def = mission.missionId as MissionDefinitionDocument;

    // Check if special prize is available
    if (def.specialPrize && def.specialPrize.limitedToFirst > 0) {
      if (def.specialPrize.remaining <= 0) {
        throw new BadRequestException('Special prize is no longer available');
      }
      def.specialPrize.remaining--;
      await def.save();
    }

    // Get current leaderboard
    const currentLeaderboard = await this.leaderboardService.getCurrentLeaderboard(GameType.NAIRA_RAID);
    
    // Update leaderboard entry with extra points
    const leaderboardEntry = await this.leaderboardEntryModel.findOne({
      userId,
      leaderboardId: currentLeaderboard._id,
    });

    if (leaderboardEntry) {
      leaderboardEntry.extraPoints = (leaderboardEntry.extraPoints || 0) + def.points;
      await leaderboardEntry.save();
    }

    // Update mission points tracking
    let missionPoints = await this.missionPointsModel.findOne({
      userId,
      gameId: GameType.NAIRA_RAID,
      seasonNumber: currentLeaderboard.seasonNumber,
    });

    if (!missionPoints) {
      missionPoints = new this.missionPointsModel({
        userId,
        gameId: GameType.NAIRA_RAID,
        seasonNumber: currentLeaderboard.seasonNumber,
        totalPoints: 0,
        pointHistory: [],
      });
    }

    // Add points to history and update total
    const missionDefinition = mission.missionId as MissionDefinitionDocument;
    missionPoints.pointHistory.push({
      missionId: missionDefinition._id as MongooseSchema.Types.ObjectId,
      points: missionDefinition.points,
      date: new Date(),
    });
    missionPoints.totalPoints += missionDefinition.points;
    await missionPoints.save();

    // Update mission status
    mission.status = MissionStatus.CLAIMED;
    mission.claimedAt = new Date();
    await mission.save();

    return {
      claimed: true,
      points: missionDefinition.points,
      specialPrize: def.specialPrize && def.specialPrize.remaining > 0,
    };
  }

  /**
   * Get mission points
   * ----------------
   * Gets the total mission points for a player in the current season
   */
  async getMissionPoints(userId: string, gameId: string): Promise<number> {
    const currentLeaderboard = await this.leaderboardService.getCurrentLeaderboard(gameId);
    
    const points = await this.missionPointsModel.findOne({
      userId,
      gameId,
      seasonNumber: currentLeaderboard.seasonNumber,
    });

    return points?.totalPoints || 0;
  }

  /**
   * Create a new mission definition
   */
  async createMissionDefinition(createDto: CreateMissionDefinitionDto): Promise<MissionDefinitionDocument> {
    // Create the mission definition
    const missionDefinition = new this.missionDefinitionModel({
      ...createDto,
      isActive: true,
    });

    return missionDefinition.save();
  }

  /**
   * Get all mission definitions
   */
  async getMissionDefinitions(activeOnly: boolean = false) {
    const query = activeOnly ? { isActive: true } : {};
    return this.missionDefinitionModel.find(query).exec();
  }

  /**
   * Get a specific mission definition
   */
  async getMissionDefinitionById(id: string): Promise<MissionDefinitionDocument> {
    const mission = await this.missionDefinitionModel.findById(id);
    if (!mission) {
      throw new NotFoundException(`Mission definition with ID ${id} not found`);
    }
    return mission;
  }

  /**
   * Update a mission definition
   */
  async updateMissionDefinition(
    id: string,
    updateDto: Partial<CreateMissionDefinitionDto>,
  ): Promise<MissionDefinitionDocument> {
    const mission = await this.missionDefinitionModel.findByIdAndUpdate(
      id,
      { $set: updateDto },
      { new: true },
    );

    if (!mission) {
      throw new NotFoundException(`Mission definition with ID ${id} not found`);
    }

    return mission;
  }

  /**
   * Deactivate a mission definition
   */
  async deactivateMissionDefinition(id: string): Promise<MissionDefinitionDocument> {
    const mission = await this.missionDefinitionModel.findByIdAndUpdate(
      id,
      { $set: { isActive: false } },
      { new: true },
    );

    if (!mission) {
      throw new NotFoundException(`Mission definition with ID ${id} not found`);
    }

    return mission;
  }
} 