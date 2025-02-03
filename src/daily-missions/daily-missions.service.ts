import {
  Injectable,
  NotFoundException,
  BadRequestException,
} from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model } from 'mongoose';
import {
  DailyMission,
  DailyMissionDocument,
} from './schemas/daily-mission.schema';
import {
  UserMissionProgress,
  UserMissionProgressDocument,
} from './schemas/user-mission-progress.schema';
import { CreateDailyMissionDto } from './dto/create-daily-mission.dto';
import { PaginationDto } from '../common/dto/pagination.dto';
import { MissionType } from './schemas/daily-mission.schema';

@Injectable()
export class DailyMissionsService {
  constructor(
    @InjectModel(DailyMission.name)
    private readonly dailyMissionModel: Model<DailyMissionDocument>,
    @InjectModel(UserMissionProgress.name)
    private readonly userMissionProgressModel: Model<UserMissionProgressDocument>,
  ) {}

  async createMission(
    createDailyMissionDto: CreateDailyMissionDto,
  ): Promise<DailyMissionDocument> {
    const mission = new this.dailyMissionModel(createDailyMissionDto);
    return mission.save();
  }

  async findAllMissions(gameId: string, paginationDto: PaginationDto) {
    const { page = 1, limit = 10 } = paginationDto;
    const skip = (page - 1) * limit;

    const [missions, total] = await Promise.all([
      this.dailyMissionModel
        .find({ gameId, isActive: true })
        .skip(skip)
        .limit(limit)
        .exec(),
      this.dailyMissionModel.countDocuments({ gameId, isActive: true }),
    ]);

    return {
      missions,
      total,
      page,
      totalPages: Math.ceil(total / limit),
    };
  }

  async getUserMissionProgress(userId: string, gameId: string) {
    const today = new Date();
    today.setHours(0, 0, 0, 0);

    const activeMissions = await this.dailyMissionModel.find({
      gameId,
      isActive: true,
    });

    const userProgress = await this.userMissionProgressModel
      .find({
        userId,
        missionId: { $in: activeMissions.map((m) => m._id) },
        date: {
          $gte: today,
          $lt: new Date(today.getTime() + 24 * 60 * 60 * 1000),
        },
      })
      .populate('missionId');

    // Create progress entries for missions that don't have them yet
    const existingMissionIds = userProgress.map((p) => 
      p.missionId._id.toString(),
    );
    const missionsWithoutProgress = activeMissions.filter(
      (m) => !existingMissionIds.includes(m._id.toString()),
    );

    if (missionsWithoutProgress.length > 0) {
      const newProgressEntries = await this.userMissionProgressModel.insertMany(
        missionsWithoutProgress.map((mission) => ({
          userId,
          missionId: mission._id,
          gameId,
          progress: 0,
          matchProgresses: [],
          date: today,
        })),
      );

      userProgress.push(
        ...(await this.userMissionProgressModel
          .find({ _id: { $in: newProgressEntries.map((p) => p._id) } })
          .populate('missionId')),
      );
    }

    return userProgress;
  }

  async updateMissionProgress(
    userId: string,
    gameId: string,
    gameStats: { totalKills: number },
    matchNumber: number,
  ) {
    const userProgress = await this.getUserMissionProgress(userId, gameId);

    const updates = userProgress.map(async (progress) => {
      const mission = progress.missionId as DailyMissionDocument;
      let shouldUpdate = false;
      let newProgress = progress.progress;

      switch (mission.type) {
        case MissionType.TOTAL_KILLS:
          newProgress = progress.progress + gameStats.totalKills;
          shouldUpdate = true;
          break;

        case MissionType.SINGLE_MATCH_KILLS:
          if (gameStats.totalKills > progress.progress) {
            newProgress = gameStats.totalKills;
            shouldUpdate = true;
          }
          break;

        case MissionType.KILLS_IN_MATCHES:
          progress.matchProgresses[matchNumber - 1] = gameStats.totalKills;
          const validMatches = progress.matchProgresses
            .filter((kills) => kills >= mission.target)
            .length;
          newProgress = validMatches;
          shouldUpdate = true;
          break;
      }

      if (shouldUpdate) {
        progress.progress = newProgress;
        progress.isCompleted = newProgress >= mission.target;
        return progress.save();
      }

      return progress;
    });

    return Promise.all(updates);
  }

  async claimReward(userId: string, missionId: string): Promise<number> {
    const progress = await this.userMissionProgressModel
      .findOne({ userId, missionId })
      .populate('missionId');

    if (!progress) {
      throw new NotFoundException('Mission progress not found');
    }

    if (!progress.isCompleted) {
      throw new BadRequestException('Mission not completed');
    }

    if (progress.rewardClaimed) {
      throw new BadRequestException('Reward already claimed');
    }

    progress.rewardClaimed = true;
    await progress.save();

    const mission = progress.missionId as DailyMissionDocument;
    return mission.rewardPoints;
  }
}
