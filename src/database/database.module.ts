import { Module } from '@nestjs/common';
import { MongooseModule } from '@nestjs/mongoose';
import { UserSeeder } from './seeders/user.seeder';
import { LeaderboardSeeder } from './seeders/leaderboard.seeder';
import { DailyMissionsSeeder } from './seeders/daily-missions.seeder';
import { User, UserSchema } from '../user/schemas/user.schema';
import { Leaderboard, LeaderboardSchema } from '../leaderboard/schemas/leaderboard.schema';
import { LeaderboardEntry, LeaderboardEntrySchema } from '../leaderboard/schemas/leaderboard-entry.schema';
import { GameSession, GameSessionSchema } from '../leaderboard/schemas/game-session.schema';
import { MissionDefinition, MissionDefinitionSchema } from '../daily-missions/schemas/mission-definition.schema';
import { MissionProgress, MissionProgressSchema } from '../daily-missions/schemas/mission-progress.schema';
import { MissionPoints, MissionPointsSchema } from '../daily-missions/schemas/mission-points.schema';
import { EnemyColor, EnemyColorSchema } from '../daily-missions/schemas/enemy-color.schema';
import { ConfigModule } from '@nestjs/config';

@Module({
  imports: [
    ConfigModule,
    MongooseModule.forFeature([
      { name: User.name, schema: UserSchema },
      { name: Leaderboard.name, schema: LeaderboardSchema },
      { name: LeaderboardEntry.name, schema: LeaderboardEntrySchema },
      { name: GameSession.name, schema: GameSessionSchema },
      { name: MissionDefinition.name, schema: MissionDefinitionSchema },
      { name: MissionProgress.name, schema: MissionProgressSchema },
      { name: MissionPoints.name, schema: MissionPointsSchema },
      { name: EnemyColor.name, schema: EnemyColorSchema },
    ]),
  ],
  providers: [
    UserSeeder,
    LeaderboardSeeder,
    {
      provide: DailyMissionsSeeder,
      useClass: DailyMissionsSeeder,
    },
  ],
  exports: [UserSeeder, LeaderboardSeeder, DailyMissionsSeeder],
})
export class DatabaseModule {} 