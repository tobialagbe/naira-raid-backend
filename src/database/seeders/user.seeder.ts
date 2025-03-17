import { Injectable } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model } from 'mongoose';
import { faker } from '@faker-js/faker';
import * as bcrypt from 'bcrypt';
import { User, UserDocument } from '../../user/schemas/user.schema';

@Injectable()
export class UserSeeder {
  constructor(
    @InjectModel(User.name) private readonly userModel: Model<UserDocument>,
  ) {}

  async seed(count = 20): Promise<UserDocument[]> {
    // Define the type with required fields
    type CreateUserData = Required<Pick<User, 'firstName' | 'username' | 'email' | 'password'>> &
      Partial<Omit<User, 'firstName' | 'username' | 'email' | 'password' | '_id'>>;

    const users: CreateUserData[] = [];
    const hashedPassword = await bcrypt.hash('password123', 10);

    // Create one admin user with known credentials
    users.push({
      firstName: 'Admin',
      lastName: 'User',
      username: 'admin',
      email: 'admin@nairaraid.com',
      password: hashedPassword,
      isEmailVerified: true,
      points: 1000,
    });

    // Generate random users
    for (let i = 0; i < count - 1; i++) {
      const firstName = faker.person.firstName();
      const lastName = faker.person.lastName();
      
      users.push({
        firstName,
        lastName,
        username: faker.internet.username({ firstName, lastName }).toLowerCase(),
        email: faker.internet.email({ firstName, lastName }).toLowerCase(),
        password: hashedPassword,
        phoneNumber: faker.phone.number(),
        isEmailVerified: faker.datatype.boolean(),
        instagram: faker.internet.username(),
        tiktok: faker.internet.username(),
        points: faker.number.int({ min: 0, max: 10000 }),
      });
    }

    // Clear existing users
    await this.userModel.deleteMany({});

    // Insert new users
    return this.userModel.insertMany(users) as Promise<UserDocument[]>;
  }
} 