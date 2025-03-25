import { NestFactory } from '@nestjs/core';
import { AppModule } from '../app.module';
import { DatabaseModule } from './database.module';
import { UserSeeder } from './seeders/user.seeder';
import { LeaderboardSeeder } from './seeders/leaderboard.seeder';
import { DailyMissionsSeeder } from './seeders/daily-missions.seeder';

async function bootstrap() {
  const app = await NestFactory.createApplicationContext(AppModule);

  try {
    console.log('🌱 Starting database seeding...');

    // Get all seeders
    const userSeeder = app.get(UserSeeder);
    const dailyMissionsSeeder = app.get(DailyMissionsSeeder);
    const leaderboardSeeder = app.get(LeaderboardSeeder);

    // Seed users first
    console.log('\n📊 Seeding users...');
    const users = await userSeeder.seed();
    console.log('✅ Users seeded successfully');

    // Seed daily missions before leaderboard
    console.log('\n🎯 Seeding daily missions...');
    try {
      const dailyMissionsResult = await dailyMissionsSeeder.seed();
      if (dailyMissionsResult) {
        const { colors, missions } = dailyMissionsResult;
        console.log('\nColors created:', colors.map(c => ({ name: c.name, id: c._id.toString() })));
        console.log('\nMissions created:', missions.map(m => ({ title: m.title, id: m._id.toString() })));
        console.log('✅ Daily missions seeded successfully');
      } else {
        console.error('❌ Daily missions seeding failed - no result returned');
      }
    } catch (error) {
      console.error('❌ Error seeding daily missions:', error);
      throw error;
    }

    // Seed leaderboard data
    console.log('\n🏆 Seeding leaderboards...');
    try {
      const leaderboardResult = await leaderboardSeeder.seed(users);
      console.log('Leaderboard created:', JSON.stringify(leaderboardResult, null, 2));
      console.log('✅ Leaderboards seeded successfully');
    } catch (error) {
      console.error('❌ Error seeding leaderboards:', error);
      throw error;
    }

    // Verify the seeded data
    console.log('\n🔍 Verifying seeded data...');
    try {
      const verifyResult = await dailyMissionsSeeder.seed();
      console.log('Verification complete:', {
        colorsCount: verifyResult.colors.length,
        missionsCount: verifyResult.missions.length
      });
    } catch (error) {
      console.error('❌ Error verifying seeded data:', error);
      throw error;
    }

    console.log('\n✨ Database seeding completed successfully!');
  } catch (error) {
    console.error('\n❌ Database seeding failed:', error);
    throw error;
  } finally {
    await app.close();
  }
}

bootstrap(); 