import { Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { MongooseModule } from '@nestjs/mongoose';
import { Test } from '@nestjs/testing';
import { UserSeeder } from './user.seeder';
import { LeaderboardSeeder } from './leaderboard.seeder';
import { InventorySeeder } from './inventory.seeder';
import { DailyMissionSeeder } from './daily-mission.seeder';
import { PlayerProgressSeeder } from './player-progress.seeder';

@Injectable()
export class Seeder {
  constructor(private readonly configService: ConfigService) {}

  async seed() {
    const moduleRef = await Test.createTestingModule({
      imports: [
        MongooseModule.forRootAsync({
          useFactory: () => ({
            uri: this.configService.get<string>('MONGODB_URI'),
          }),
          inject: [ConfigService],
        }),
      ],
      providers: [
        UserSeeder,
        LeaderboardSeeder,
        InventorySeeder,
        DailyMissionSeeder,
        PlayerProgressSeeder,
      ],
    }).compile();

    const userSeeder = moduleRef.get(UserSeeder);
    const leaderboardSeeder = moduleRef.get(LeaderboardSeeder);
    const inventorySeeder = moduleRef.get(InventorySeeder);
    const dailyMissionSeeder = moduleRef.get(DailyMissionSeeder);
    const playerProgressSeeder = moduleRef.get(PlayerProgressSeeder);

    try {
      console.log('🌱 Starting database seeding...');

      // Create users first as other entities depend on them
      console.log('Seeding users...');
      const users = await userSeeder.seed();
      console.log('✅ Users seeded successfully');

      // Seed other collections in parallel
      await Promise.all([
        (async () => {
          console.log('Seeding leaderboards...');
          await leaderboardSeeder.seed(users);
          console.log('✅ Leaderboards seeded successfully');
        })(),
        (async () => {
          console.log('Seeding inventory items...');
          await inventorySeeder.seed(users);
          console.log('✅ Inventory seeded successfully');
        })(),
        (async () => {
          console.log('Seeding daily missions...');
          await dailyMissionSeeder.seed();
          console.log('✅ Daily missions seeded successfully');
        })(),
        (async () => {
          console.log('Seeding player progress...');
          await playerProgressSeeder.seed(users);
          console.log('✅ Player progress seeded successfully');
        })(),
      ]);

      console.log('✨ Database seeding completed successfully!');
    } catch (error) {
      console.error('❌ Database seeding failed:', error);
      throw error;
    }
  }
} 