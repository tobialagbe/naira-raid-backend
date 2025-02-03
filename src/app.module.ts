import { Module } from '@nestjs/common';
import { AppController } from './app.controller';
import { AppService } from './app.service';
import { UserModule } from './user/user.module';
import { AuthModule } from './auth/auth.module';
import { LeaderboardModule } from './leaderboard/leaderboard.module';
import { InventoryModule } from './inventory/inventory.module';
import { DailyMissionsModule } from './daily-missions/daily-missions.module';
import { PlayerProgressModule } from './player-progress/player-progress.module';
import { EmailModule } from './email/email.module';

@Module({
  imports: [
    UserModule,
    AuthModule,
    LeaderboardModule,
    InventoryModule,
    DailyMissionsModule,
    PlayerProgressModule,
    EmailModule.register(),
  ],
  controllers: [AppController],
  providers: [AppService],
})
export class AppModule {}
