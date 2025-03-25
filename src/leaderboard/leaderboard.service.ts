/* eslint-disable max-len */
import { Injectable, NotFoundException, BadRequestException, Inject, forwardRef } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model, Types } from 'mongoose';
import { Leaderboard, LeaderboardDocument } from './schemas/leaderboard.schema';
import { LeaderboardEntry, LeaderboardEntryDocument } from './schemas/leaderboard-entry.schema';
import { GameSession, GameSessionDocument } from './schemas/game-session.schema';
import { CreateLeaderboardDto } from './dto/create-leaderboard.dto';
import { CreateLeaderboardEntryDto } from './dto/create-leaderboard-entry.dto';
import { CreateGameSessionDto } from './dto/create-game-session.dto';
import { PaginationDto } from '../common/dto/pagination.dto';
import { DailyMissionsService } from '../daily-missions/services/daily-missions.service';

@Injectable()
export class LeaderboardService {
  constructor(
    @InjectModel(Leaderboard.name)
    private readonly leaderboardModel: Model<LeaderboardDocument>,
    @InjectModel(LeaderboardEntry.name)
    private readonly leaderboardEntryModel: Model<LeaderboardEntryDocument>,
    @InjectModel(GameSession.name)
    private readonly gameSessionModel: Model<GameSessionDocument>,
    @Inject(forwardRef(() => DailyMissionsService))
    private readonly dailyMissionsService: DailyMissionsService,
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

    // First aggregate to calculate total scores
    const entries = await this.leaderboardEntryModel
      .aggregate([
        { 
          $match: { 
            leaderboardId: Types.ObjectId.createFromHexString(leaderboardId) 
          } 
        },
        {
          $addFields: {
            totalScore: { $add: ['$score', { $ifNull: ['$extraPoints', 0] }] }
          }
        },
        { $sort: { totalScore: -1 } },
        { $skip: skip },
        { $limit: limit },
        {
          $lookup: {
            from: 'users',
            localField: 'userId',
            foreignField: '_id',
            as: 'user'
          }
        },
        { $unwind: '$user' },
        {
          $project: {
            'user.password': 0
          }
        }
      ]);

    const total = await this.leaderboardEntryModel.countDocuments({ leaderboardId });

    return {
      entries,
      total,
      page,
      totalPages: Math.ceil(total / limit),
    };
  }

  async createGameSession(userId: string, createGameSessionDto: CreateGameSessionDto): Promise<{
    session: GameSessionDocument;
    position: number;
  }> {
    // Create a new game session
    const session = new this.gameSessionModel({
      userId,
      ...createGameSessionDto,
      isCompleted: true,
    });
    await session.save();

    // Get current leaderboard
    const currentLeaderboard = await this.getCurrentLeaderboard(String(session.gameId));
    
    // Update leaderboard entry if score is higher
    const updatedEntry = await this.updateLeaderboardEntry(String(session.userId), currentLeaderboard._id.toString(), {
      score: session.score,
      gameId: String(session.gameId), 
      seasonNumber: currentLeaderboard.seasonNumber,
      gameStats: session.gameStats,
    });

    // Calculate position using aggregation
    const higherScores = await this.leaderboardEntryModel
      .aggregate([
        {
          $match: {
            leaderboardId: Types.ObjectId.createFromHexString(currentLeaderboard._id.toString())
          }
        },
        {
          $addFields: {
            totalScore: { $add: ['$score', { $ifNull: ['$extraPoints', 0] }] }
          }
        },
        {
          $match: {
            totalScore: { $gt: updatedEntry.score + (updatedEntry.extraPoints || 0) }
          }
        },
        {
          $count: 'count'
        }
      ])
      .then(result => (result[0]?.count || 0));

    // Update mission progress
    await this.dailyMissionsService.updateMissionProgress(
      userId,
      String(session.gameId),
      session._id.toString(),
      {
        kills: session.gameStats.totalKills,
        colorKills: session.gameStats.colorKills || {},
      }
    );

    return {
      session,
      position: higherScores + 1
    };
  }

  private async updateLeaderboardEntry(
    userId: string,
    leaderboardId: string | Types.ObjectId,
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

  /**
   * calculateTotalKills
   * ------------------
   * Calculate total kills across all game sessions for a player
   */
  async calculateTotalKills(userId, gameId) {
    const result = await this.gameSessionModel.aggregate([
      { $match: { userId, gameId, isCompleted: true } },
      { $group: { _id: null, total: { $sum: '$gameStats.totalKills' } } },
    ]);
    return result.length > 0 ? result[0].total : 0;
  }

  /**
   * calculateTotalCash
   * -----------------
   * Calculate total cash collected across all game sessions
   */
  async calculateTotalCash(userId, gameId) {
    const result = await this.gameSessionModel.aggregate([
      { $match: { userId, gameId, isCompleted: true } },
      { $group: { _id: null, total: { $sum: '$gameStats.cashCollected' } } },
    ]);
    return result.length > 0 ? result[0].total : 0;
  }

  /**
   * calculateXP
   * -----------
   * Calculate player's total XP based on lifetime kills
   * XP formula: kills * 10
   */
  private calculateXP(totalKills: number): number {
    return totalKills * 10; // Each kill gives 10 XP
  }

  /**
   * calculateLevel
   * -------------
   * Calculate player's current season level based on kills
   * Level formula: 1 + floor(kills / 100)
   * Every 100 kills = 1 level up, starting from level 1
   */
  private calculateLevel(seasonKills: number): number {
    return 1 + Math.floor(seasonKills / 100); // Every 100 kills = 1 level
  }

  /**
   * getSeasonKills
   * -------------
   * Get total kills for a player in the current season
   */
  private async getSeasonKills(userId: string, leaderboardId: string | Types.ObjectId): Promise<number> {
    const entry = await this.leaderboardEntryModel.findOne({
      userId: new Types.ObjectId(userId),
      leaderboardId: typeof leaderboardId === 'string' ? new Types.ObjectId(leaderboardId) : leaderboardId,
    });

    return entry?.gameStats?.totalKills || 0;
  }

  /**
   * Get player stats for an event
   */
  async getPlayerStats(userId: string, gameId: string) {
    const currentLeaderboard = await this.getCurrentLeaderboard(gameId);
    const entry = await this.leaderboardEntryModel
      .findOne({
        userId,
        leaderboardId: currentLeaderboard._id,
      })
      .populate('userId', '-password');

    // Calculate player rank using aggregation
    const rankResult = await this.leaderboardEntryModel
      .aggregate([
        {
          $match: {
            leaderboardId: Types.ObjectId.createFromHexString(currentLeaderboard._id.toString())
          }
        },
        {
          $addFields: {
            totalScore: { $add: ['$score', { $ifNull: ['$extraPoints', 0] }] }
          }
        },
        {
          $sort: { totalScore: -1 }
        },
        {
          $group: {
            _id: null,
            entries: {
              $push: {
                userId: '$userId',
                totalScore: '$totalScore'
              }
            }
          }
        },
        {
          $project: {
            rank: {
              $add: [
                {
                  $indexOfArray: [
                    '$entries.userId',
                    Types.ObjectId.createFromHexString(userId)
                  ]
                },
                1
              ]
            }
          }
        }
      ]);

    const playerRank = rankResult[0]?.rank || 0;

    const todayStart = new Date();
    todayStart.setHours(0, 0, 0, 0);

    const todayEnd = new Date();
    todayEnd.setHours(23, 59, 59, 999);

    const todayGames = await this.gameSessionModel
      .find({
        userId,
        gameId,
        createdAt: { $gte: todayStart, $lte: todayEnd },
        isCompleted: true,
      })
      .sort({ score: -1 });

    // Calculate stats
    const totalKills = await this.calculateTotalKills(userId, gameId);
    const seasonKills = await this.getSeasonKills(
      userId, 
      currentLeaderboard._id.toString()
    );

    const xp = this.calculateXP(totalKills);
    const level = this.calculateLevel(seasonKills);

    return {
      currentSeasonBest: {
        ...entry?.toObject(),
        totalScore: entry ? entry.score + (entry.extraPoints || 0) : 0
      },
      allTimeHighScore: entry ? entry.score + (entry.extraPoints || 0) : 0,
      playerRank,
      todayGames,
      todayBestScore: todayGames[0]?.score || 0,
      gamesPlayedToday: todayGames.length,
      totalGamesPlayed: await this.gameSessionModel.countDocuments({ userId, gameId, isCompleted: true }),
      totalKills,
      totalCashCollected: await this.calculateTotalCash(userId, gameId),
      progression: {
        xp,
        level,
        seasonKills,
        lifetimeKills: totalKills,
        killsToNextLevel: 100 - (seasonKills % 100),
      }
    };
  }

  async getTopPlayers(gameId: string, limit: number = 10) {
    try {
      const currentLeaderboard = await this.getCurrentLeaderboard(gameId);
      
      // Use aggregation to get top players with total score
      const topEntries = await this.leaderboardEntryModel
        .aggregate([
          {
            $match: {
              leaderboardId: Types.ObjectId.createFromHexString(currentLeaderboard._id.toString())
            }
          },
          {
            $addFields: {
              totalScore: { $add: ['$score', { $ifNull: ['$extraPoints', 0] }] }
            }
          },
          {
            $sort: { totalScore: -1 }
          },
          {
            $limit: limit
          },
          {
            $lookup: {
              from: 'users',
              localField: 'userId',
              foreignField: '_id',
              as: 'user'
            }
          },
          {
            $unwind: '$user'
          },
          {
            $project: {
              _id: 1,
              totalScore: 1,
              'user.username': 1
            }
          }
        ]);
      
      if (!topEntries || topEntries.length === 0) {
        return {
          gameId,
          leaderboardId: currentLeaderboard._id,
          seasonNumber: currentLeaderboard.seasonNumber,
          entries: [],
        };
      }
      
      const formattedEntries = topEntries.map((entry, index) => ({
        position: index + 1,
        username: entry.user.username || 'Unknown Player',
        score: entry.totalScore,
      }));
      
      return {
        gameId,
        leaderboardId: currentLeaderboard._id,
        seasonNumber: currentLeaderboard.seasonNumber,
        entries: formattedEntries,
      };
    } catch (error) {
      if (error instanceof NotFoundException) {
        throw error;
      }
      
      console.error('Error fetching top players:', error);
      throw new BadRequestException('Could not retrieve leaderboard data');
    }
  }
}
