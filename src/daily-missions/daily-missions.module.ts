import { Module, forwardRef } from '@nestjs/common';
import { MongooseModule } from '@nestjs/mongoose';
import { ConfigModule } from '@nestjs/config';
import { DailyMissionsController } from './controllers/daily-missions.controller';
import { DailyMissionsService } from './services/daily-missions.service';
import { MissionDefinition, MissionDefinitionSchema } from './schemas/mission-definition.schema';
import { MissionProgress, MissionProgressSchema } from './schemas/mission-progress.schema';
import { MissionPoints, MissionPointsSchema } from './schemas/mission-points.schema';
import { LeaderboardModule } from '../leaderboard/leaderboard.module';
import { LeaderboardEntry, LeaderboardEntrySchema } from '../leaderboard/schemas/leaderboard-entry.schema';

@Module({
  imports: [
    ConfigModule,
    forwardRef(() => LeaderboardModule),
    MongooseModule.forFeature([
      { name: MissionDefinition.name, schema: MissionDefinitionSchema },
      { name: MissionProgress.name, schema: MissionProgressSchema },
      { name: MissionPoints.name, schema: MissionPointsSchema },
      { name: LeaderboardEntry.name, schema: LeaderboardEntrySchema },
    ]),
  ],
  controllers: [DailyMissionsController],
  providers: [DailyMissionsService],
  exports: [DailyMissionsService],
})
export class DailyMissionsModule {}
