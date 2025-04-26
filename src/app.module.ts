import { Module } from '@nestjs/common';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { MongooseModule } from '@nestjs/mongoose';
import { AppController } from './app.controller';
import { AppService } from './app.service';
import { UserModule } from './user/user.module';
import { AuthModule } from './auth/auth.module';
import { LeaderboardModule } from './leaderboard/leaderboard.module';
import { InventoryModule } from './inventory/inventory.module';
import { DailyMissionsModule } from './daily-missions/daily-missions.module';
import { PlayerProgressModule } from './player-progress/player-progress.module';
import { EmailModule } from './email/email.module';
import { BattleRoyaleModule } from './battle-royale/battle-royale.module';
import { DatabaseModule } from './database/database.module';

@Module({
  imports: [
    ConfigModule.forRoot({
      isGlobal: true,
      envFilePath: '.env',
      cache: true,
    }),
    MongooseModule.forRootAsync({
      imports: [ConfigModule],
      useFactory: async (configService: ConfigService) => {
        const uri = configService.get<string>('MONGODB_URI');
        return {
          uri: uri + '/test',
        useNewUrlParser: true,
        useUnifiedTopology: true,
        };
      },
      inject: [ConfigService],
    }),
    DatabaseModule,
    UserModule,
    AuthModule,
    LeaderboardModule,
    InventoryModule,
    DailyMissionsModule,
    PlayerProgressModule,
    EmailModule.register(),
    BattleRoyaleModule,
  ],
  controllers: [AppController],
  providers: [AppService],
})
export class AppModule {}
