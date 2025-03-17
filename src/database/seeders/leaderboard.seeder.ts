import { Injectable } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model } from 'mongoose';
import { faker } from '@faker-js/faker';
import { Leaderboard, LeaderboardDocument } from '../../leaderboard/schemas/leaderboard.schema';
import { LeaderboardEntry, LeaderboardEntryDocument } from '../../leaderboard/schemas/leaderboard-entry.schema';
import { GameSession, GameSessionDocument } from '../../leaderboard/schemas/game-session.schema';
import { UserDocument } from '../../user/schemas/user.schema';
import { GameType } from '../../common/types/game.types';

@Injectable()
export class LeaderboardSeeder {
  constructor(
    @InjectModel(Leaderboard.name)
    private readonly leaderboardModel: Model<LeaderboardDocument>,
    @InjectModel(LeaderboardEntry.name)
    private readonly leaderboardEntryModel: Model<LeaderboardEntryDocument>,
    @InjectModel(GameSession.name)
    private readonly gameSessionModel: Model<GameSessionDocument>,
  ) {}

  async seed(users: UserDocument[]) {
    // Clear existing data
    await Promise.all([
      this.leaderboardModel.deleteMany({}),
      this.leaderboardEntryModel.deleteMany({}),
      this.gameSessionModel.deleteMany({}),
    ]);

    // Create current season leaderboard
    const currentLeaderboard = await this.leaderboardModel.create({
      seasonNumber: 1,
      seasonStart: new Date(),
      seasonEnd: new Date(Date.now() + 90 * 24 * 60 * 60 * 1000), // 90 days from now
      gameId: GameType.NAIRA_RAID,
      isActive: true,
    });

    // Create leaderboard entries and game sessions for each user
    const leaderboardEntries = [];
    const gameSessions = [];

    for (const user of users) {
      // Create 1-5 game sessions per user
      const sessionCount = faker.number.int({ min: 1, max: 5 });
      for (let i = 0; i < sessionCount; i++) {
        const score = faker.number.int({ min: 100, max: 10000 });
        const totalKills = faker.number.int({ min: 5, max: 50 });
        const cashCollected = faker.number.int({ min: 1000, max: 100000 });

        gameSessions.push({
          userId: user._id,
          gameId: GameType.NAIRA_RAID,
          score,
          gameStats: {
            totalKills,
            cashCollected,
          },
          isCompleted: true,
        });
      }

      // Create leaderboard entry with highest score
      const highestScore = Math.max(...gameSessions
        .filter(session => session.userId.toString() === user._id.toString())
        .map(session => session.score));

      leaderboardEntries.push({
        userId: user._id,
        leaderboardId: currentLeaderboard._id,
        score: highestScore,
        extraPoints: faker.number.int({ min: 0, max: 1000 }),
        seasonNumber: currentLeaderboard.seasonNumber,
        gameId: GameType.NAIRA_RAID,
        gameStats: {
          totalKills: faker.number.int({ min: 50, max: 500 }),
          cashCollected: faker.number.int({ min: 10000, max: 1000000 }),
        },
      });
    }

    await Promise.all([
      this.leaderboardEntryModel.insertMany(leaderboardEntries),
      this.gameSessionModel.insertMany(gameSessions),
    ]);

    return {
      leaderboard: currentLeaderboard,
      entries: leaderboardEntries,
      sessions: gameSessions,
    };
  }
} 