import { Module } from '@nestjs/common';
import { MongooseModule } from '@nestjs/mongoose';
import { DailyMissionsService } from './daily-missions.service';
import { DailyMissionsController } from './daily-missions.controller';
import {
  DailyMission,
  DailyMissionSchema,
} from './schemas/daily-mission.schema';
import {
  UserMissionProgress,
  UserMissionProgressSchema,
} from './schemas/user-mission-progress.schema';

@Module({
  imports: [
    MongooseModule.forFeature([
      { name: DailyMission.name, schema: DailyMissionSchema },
      { name: UserMissionProgress.name, schema: UserMissionProgressSchema },
    ]),
  ],
  controllers: [DailyMissionsController],
  providers: [DailyMissionsService],
  exports: [DailyMissionsService],
})
export class DailyMissionsModule {}
