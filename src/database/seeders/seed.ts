import { NestFactory } from '@nestjs/core';
import { ConfigModule } from '@nestjs/config';
import { MongooseModule } from '@nestjs/mongoose';
import { Module } from '@nestjs/common';
import { User, UserSchema } from '../../user/schemas/user.schema';
import { Leaderboard, LeaderboardSchema } from '../../leaderboard/schemas/leaderboard.schema';
import { LeaderboardEntry, LeaderboardEntrySchema } from '../../leaderboard/schemas/leaderboard-entry.schema';
import { GameSession, GameSessionSchema } from '../../leaderboard/schemas/game-session.schema';
import { InventoryItem, InventoryItemSchema } from '../../inventory/schemas/inventory-item.schema';
import { UserInventory, UserInventorySchema } from '../../inventory/schemas/user-inventory.schema';
import { DailyMission, DailyMissionSchema } from '../../daily-missions/schemas/daily-mission.schema';
import { PlayerProgress, PlayerProgressSchema } from '../../player-progress/schemas/player-progress.schema';
import { UserSeeder } from './user.seeder';
import { LeaderboardSeeder } from './leaderboard.seeder';
import { InventorySeeder } from './inventory.seeder';
import { DailyMissionSeeder } from './daily-mission.seeder';
import { PlayerProgressSeeder } from './player-progress.seeder';

@Module({
  imports: [
    ConfigModule.forRoot(),
    MongooseModule.forRoot(process.env.MONGODB_URI),
    MongooseModule.forFeature([
      { name: User.name, schema: UserSchema },
      { name: Leaderboard.name, schema: LeaderboardSchema },
      { name: LeaderboardEntry.name, schema: LeaderboardEntrySchema },
      { name: GameSession.name, schema: GameSessionSchema },
      { name: InventoryItem.name, schema: InventoryItemSchema },
      { name: UserInventory.name, schema: UserInventorySchema },
      { name: DailyMission.name, schema: DailyMissionSchema },
      { name: PlayerProgress.name, schema: PlayerProgressSchema },
    ]),
  ],
  providers: [
    UserSeeder,
    LeaderboardSeeder,
    InventorySeeder,
    DailyMissionSeeder,
    PlayerProgressSeeder,
  ],
})
class SeedModule {}

async function bootstrap() {
  const app = await NestFactory.create(SeedModule);

  const userSeeder = app.get(UserSeeder);
  const leaderboardSeeder = app.get(LeaderboardSeeder);
  const inventorySeeder = app.get(InventorySeeder);
  const dailyMissionSeeder = app.get(DailyMissionSeeder);
  const playerProgressSeeder = app.get(PlayerProgressSeeder);

  try {
    console.log('🌱 Starting database seeding...');

    // Create users first as other entities depend on them
    console.log('Seeding users...');
    const users = await userSeeder.seed();
    console.log('✅ Users seeded successfully');

    // Create missions before mission progress
    console.log('Seeding daily missions...');
    const missions = await dailyMissionSeeder.seed();
    console.log('✅ Daily missions seeded successfully');

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
        console.log('Seeding player progress...');
        await playerProgressSeeder.seed(users);
        console.log('✅ Player progress seeded successfully');
      })(),
    ]);

    console.log('✨ Database seeding completed successfully!');
  } catch (error) {
    console.error('❌ Database seeding failed:', error);
    throw error;
  } finally {
    await app.close();
  }
}

bootstrap(); 