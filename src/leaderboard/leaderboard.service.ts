/* eslint-disable max-len */
import { Injectable, NotFoundException, BadRequestException } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model, Types } from 'mongoose';
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
    // Create a new game session
    const session = new this.gameSessionModel({
      userId,
      ...createGameSessionDto,
      isCompleted: true, // Session is already completed
    });
    await session.save();

    // Update leaderboard entry if score is higher
    const currentLeaderboard = await this.getCurrentLeaderboard(String(session.gameId));
    await this.updateLeaderboardEntry(String(session.userId), currentLeaderboard._id.toString(), {
      score: session.score,
      gameId: String(session.gameId), 
      seasonNumber: currentLeaderboard.seasonNumber,
      gameStats: session.gameStats,
    });

    return session;
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

  async getPlayerStats(userId: string, gameId: string) {
    const currentLeaderboard = await this.getCurrentLeaderboard(gameId);
    const entry = await this.leaderboardEntryModel
      .findOne({
        userId,
        leaderboardId: currentLeaderboard._id,
      })
      .populate('userId', '-password');

    // Calculate player rank by getting all entries sorted by score
    const allEntries = await this.leaderboardEntryModel
      .find({ leaderboardId: currentLeaderboard._id })
      .sort({ score: -1 });
    
    // Find player's position in the sorted list
    let playerRank = 0;
    for (let i = 0; i < allEntries.length; i++) {
      if (String(allEntries[i].userId) === String(userId)) {
        playerRank = i + 1; // +1 because array is 0-indexed
        break;
      }
    }

    const todayStart = new Date();
    todayStart.setHours(0, 0, 0, 0);

    const todayEnd = new Date();
    todayEnd.setHours(23, 59, 59, 999);

    const todayGames = await this.gameSessionModel
      .find({
        userId,
        gameId,
        createdAt: { $gte: todayStart, $lte: todayEnd }, // Use createdAt instead of startTime
        isCompleted: true,
      })
      .sort({ score: -1 });

    return {
      currentSeasonBest: entry,
      allTimeHighScore: entry?.score || 0,
      playerRank: playerRank,
      todayGames,
      todayBestScore: todayGames[0]?.score || 0,
      gamesPlayedToday: todayGames.length,
      totalGamesPlayed: await this.gameSessionModel.countDocuments({ userId, gameId, isCompleted: true }),
      totalKills: await this.calculateTotalKills(userId, gameId),
      totalCashCollected: await this.calculateTotalCash(userId, gameId),
    };
  }

  // Helper methods
  async calculateTotalKills(userId, gameId) {
    const result = await this.gameSessionModel.aggregate([
      { $match: { userId, gameId, isCompleted: true } },
      { $group: { _id: null, total: { $sum: '$gameStats.totalKills' } } },
    ]);
    return result.length > 0 ? result[0].total : 0;
  }

  async calculateTotalCash(userId, gameId) {
    const result = await this.gameSessionModel.aggregate([
      { $match: { userId, gameId, isCompleted: true } },
      { $group: { _id: null, total: { $sum: '$gameStats.cashCollected' } } },
    ]);
    return result.length > 0 ? result[0].total : 0;
  }

  async getTopPlayers(gameId: string, limit: number = 10) {
    try {
      // Get the current active leaderboard for the specified game
      const currentLeaderboard = await this.getCurrentLeaderboard(gameId);
      
      // Fetch the top N entries, sorted by score (and extraPoints as tiebreaker)
      const topEntries = await this.leaderboardEntryModel
        .find({ leaderboardId: currentLeaderboard._id })
        .sort({ score: -1, extraPoints: -1 })
        .limit(limit)
        .populate('userId', 'username') // Only get the username field from the user document
        .exec();
      
      // Return empty array if no entries found
      if (!topEntries || topEntries.length === 0) {
        return {
          gameId,
          leaderboardId: currentLeaderboard._id,
          seasonNumber: currentLeaderboard.seasonNumber,
          entries: [],
        };
      }
      
      // Transform the entries to the required format (position, username, score)
      const formattedEntries = topEntries.map((entry, index) => {
        // Handle case where userId might not be populated properly
        const username = entry.userId && typeof entry.userId === 'object' ? 
          entry.userId.username : 'Unknown Player';
          
        return {
          position: index + 1, // Position is 1-indexed
          username,
          score: entry.score,
        };
      });
      
      return {
        gameId,
        leaderboardId: currentLeaderboard._id,
        seasonNumber: currentLeaderboard.seasonNumber,
        entries: formattedEntries,
      };
    } catch (error) {
      // Re-throw NotFoundException from getCurrentLeaderboard if no active leaderboard
      if (error instanceof NotFoundException) {
        throw error;
      }
      
      // Log error and return a generic error for other types
      console.error('Error fetching top players:', error);
      throw new BadRequestException('Could not retrieve leaderboard data');
    }
  }
}
