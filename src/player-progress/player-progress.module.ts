import { Module } from '@nestjs/common';
import { MongooseModule } from '@nestjs/mongoose';
import { ConfigModule } from '@nestjs/config';
import { PlayerProgressService } from './player-progress.service';
import { PlayerProgressController } from './player-progress.controller';
import { PlayerProgress, PlayerProgressSchema } from './schemas/player-progress.schema';

@Module({
  imports: [
    ConfigModule,
    MongooseModule.forFeature([
      { name: PlayerProgress.name, schema: PlayerProgressSchema },
    ]),
  ],
  controllers: [PlayerProgressController],
  providers: [PlayerProgressService],
  exports: [PlayerProgressService],
})
export class PlayerProgressModule {} 