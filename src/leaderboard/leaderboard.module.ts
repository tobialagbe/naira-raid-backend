import { Module, forwardRef } from '@nestjs/common';
import { MongooseModule } from '@nestjs/mongoose';
import { ConfigModule } from '@nestjs/config';
import { LeaderboardService } from './leaderboard.service';
import { LeaderboardController } from './leaderboard.controller';
import { Leaderboard, LeaderboardSchema } from './schemas/leaderboard.schema';
import { LeaderboardEntry, LeaderboardEntrySchema } from './schemas/leaderboard-entry.schema';
import { GameSession, GameSessionSchema } from './schemas/game-session.schema';
import { DailyMissionsModule } from '../daily-missions/daily-missions.module';

@Module({
  imports: [
    ConfigModule,
    forwardRef(() => DailyMissionsModule),
    MongooseModule.forFeature([
      { name: Leaderboard.name, schema: LeaderboardSchema },
      { name: LeaderboardEntry.name, schema: LeaderboardEntrySchema },
      { name: GameSession.name, schema: GameSessionSchema },
    ]),
  ],
  controllers: [LeaderboardController],
  providers: [LeaderboardService],
  exports: [LeaderboardService],
})
export class LeaderboardModule {}
