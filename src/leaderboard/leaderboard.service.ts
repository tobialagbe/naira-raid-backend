import { Injectable, NotFoundException, BadRequestException } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model } from 'mongoose';
import { Leaderboard, LeaderboardDocument } from './schemas/leaderboard.schema';
import { LeaderboardEntry, LeaderboardEntryDocument } from './schemas/leaderboard-entry.schema';
import { GameSession, GameSessionDocument } from './schemas/game-session.schema';
import { CreateLeaderboardDto } from './dto/create-leaderboard.dto';
import { CreateLeaderboardEntryDto } from './dto/create-leaderboard-entry.dto';
import { CreateGameSessionDto } from './dto/create-game-session.dto';
import { PaginationDto } from '../common/dto/pagination.dto';

@Injectable()
export class LeaderboardService {
  constructor(
    @InjectModel(Leaderboard.name)
    private readonly leaderboardModel: Model<LeaderboardDocument>,
    @InjectModel(LeaderboardEntry.name)
    private readonly leaderboardEntryModel: Model<LeaderboardEntryDocument>,
    @InjectModel(GameSession.name)
    private readonly gameSessionModel: Model<GameSessionDocument>,
  ) {}

  async createLeaderboard(createLeaderboardDto: CreateLeaderboardDto): Promise<LeaderboardDocument> {
    const leaderboard = new this.leaderboardModel(createLeaderboardDto);
    return leaderboard.save();
  }

  async getCurrentLeaderboard(gameId: string): Promise<LeaderboardDocument> {
    const leaderboard = await this.leaderboardModel.findOne({
      gameId,
      isActive: true,
      seasonStart: { $lte: new Date() },
      seasonEnd: { $gte: new Date() },
    });

    if (!leaderboard) {
      throw new NotFoundException('No active leaderboard found for this game');
    }

    return leaderboard;
  }

  async getLeaderboardEntries(
    leaderboardId: string,
    paginationDto: PaginationDto,
  ) {
    const { page = 1, limit = 10 } = paginationDto;
    const skip = (page - 1) * limit;

    const [entries, total] = await Promise.all([
      this.leaderboardEntryModel
        .find({ leaderboardId })
        .sort({ score: -1, extraPoints: -1 })
        .skip(skip)
        .limit(limit)
        .populate('userId', '-password')
        .exec(),
      this.leaderboardEntryModel.countDocuments({ leaderboardId }),
    ]);

    return {
      entries,
      total,
      page,
      totalPages: Math.ceil(total / limit),
    };
  }

  async createGameSession(userId: string, createGameSessionDto: CreateGameSessionDto): Promise<GameSessionDocument> {
    const session = new this.gameSessionModel({
      userId,
      ...createGameSessionDto,
    });
    return session.save();
  }

  async completeGameSession(sessionId: string): Promise<GameSessionDocument> {
    const session = await this.gameSessionModel.findById(sessionId);
    if (!session) {
      throw new NotFoundException('Game session not found');
    }

    if (session.isCompleted) {
      throw new BadRequestException('Game session already completed');
    }

    session.isCompleted = true;
    session.endTime = new Date();
    await session.save();

    // Update leaderboard entry if score is higher
    const currentLeaderboard = await this.getCurrentLeaderboard(session.gameId);
    await this.updateLeaderboardEntry(session.userId, currentLeaderboard._id, {
      score: session.score,
      gameId: session.gameId,
      seasonNumber: currentLeaderboard.seasonNumber,
      gameStats: session.gameStats,
    });

    return session;
  }

  private async updateLeaderboardEntry(
    userId: string,
    leaderboardId: string,
    data: CreateLeaderboardEntryDto,
  ): Promise<LeaderboardEntryDocument> {
    const existingEntry = await this.leaderboardEntryModel.findOne({
      userId,
      leaderboardId,
    });

    if (!existingEntry) {
      const entry = new this.leaderboardEntryModel({
        userId,
        leaderboardId,
        ...data,
      });
      return entry.save();
    }

    // Only update if new score is higher
    if (data.score > existingEntry.score) {
      existingEntry.score = data.score;
      existingEntry.gameStats = data.gameStats;
      return existingEntry.save();
    }

    return existingEntry;
  }

  async getPlayerStats(userId: string, gameId: string) {
    const currentLeaderboard = await this.getCurrentLeaderboard(gameId);
    const entry = await this.leaderboardEntryModel
      .findOne({
        userId,
        leaderboardId: currentLeaderboard._id,
      })
      .populate('userId', '-password');

    const todayStart = new Date();
    todayStart.setHours(0, 0, 0, 0);

    const todayEnd = new Date();
    todayEnd.setHours(23, 59, 59, 999);

    const todayGames = await this.gameSessionModel
      .find({
        userId,
        gameId,
        startTime: { $gte: todayStart, $lte: todayEnd },
        isCompleted: true,
      })
      .sort({ score: -1 });

    return {
      currentSeasonBest: entry,
      todayGames,
      todayBestScore: todayGames[0]?.score || 0,
      gamesPlayedToday: todayGames.length,
    };
  }
}
