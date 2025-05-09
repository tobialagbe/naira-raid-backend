import { Injectable, NotFoundException, ConflictException, BadRequestException, Inject, forwardRef } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model } from 'mongoose';
import { User, UserDocument } from './schemas/user.schema';
import { CreateUserDto } from './dto/create-user.dto';
import { UpdateUserDto } from './dto/update-user.dto';
import { PaginationDto } from '../common/dto/pagination.dto';
import { BattleRoyaleService } from '../battle-royale/services/battle-royale.service';

@Injectable()
export class UserService {
  constructor(
    @InjectModel(User.name) private readonly userModel: Model<UserDocument>,
    @Inject(forwardRef(() => BattleRoyaleService)) private readonly battleRoyaleService: BattleRoyaleService,
  ) {}

  async create(createUserDto: CreateUserDto): Promise<UserDocument> {
    try {
      const user = new this.userModel(createUserDto);
      return await user.save();
    } catch (error) {
      if (error.code === 11000) {
        throw new ConflictException('User with this email or username already exists');
      }
      throw error;
    }
  }

  async findAll(paginationDto: PaginationDto) {
    const { page = 1, limit = 10 } = paginationDto;
    const skip = (page - 1) * limit;

    const [users, total] = await Promise.all([
      this.userModel
        .find()
        .select('-password')
        .skip(skip)
        .limit(limit)
        .exec(),
      this.userModel.countDocuments(),
    ]);

    return {
      users,
      total,
      page,
      totalPages: Math.ceil(total / limit),
    };
  }

  async findById(id: string): Promise<any> {
    const user = await this.userModel.findById(id).select('-password');
    if (!user) {
      throw new NotFoundException('User not found');
    }
    
    // Add battle statistics
    const battleStats = await this.battleRoyaleService.getPlayerBattleStats(id);
    
    return {
      ...user.toObject(),
      battleStats
    };
  }

  async findByEmail(email: string): Promise<UserDocument> {
    return this.userModel.findOne({ email });
  }

  async findByUsername(username: string): Promise<UserDocument> {
    return this.userModel.findOne({ username });
  }

  async findByInstagram(instagram: string): Promise<UserDocument> {
    return this.userModel.findOne({ instagram });
  }

  async findByTiktok(tiktok: string): Promise<UserDocument> {
    return this.userModel.findOne({ tiktok });
  }

  async update(id: string, updateUserDto: UpdateUserDto): Promise<UserDocument> {
    try {
      const user = await this.userModel
        .findByIdAndUpdate(id, updateUserDto, { new: true })
        .select('-password');

      if (!user) {
        throw new NotFoundException('User not found');
      }

      return user;
    } catch (error) {
      if (error.code === 11000) {
        throw new ConflictException('Username or email already exists');
      }
      throw error;
    }
  }

  async remove(id: string): Promise<void> {
    const result = await this.userModel.deleteOne({ _id: id });
    if (result.deletedCount === 0) {
      throw new NotFoundException('User not found');
    }
  }

  // Coin management methods
  async getCoins(userId: string): Promise<{ coins: number }> {
    const user = await this.findById(userId);
    return { coins: user.coins };
  }

  async addCoins(userId: string, amount: number): Promise<any> {
    if (amount <= 0) {
      throw new BadRequestException('Amount must be positive');
    }

    const user = await this.userModel.findById(userId);
    if (!user) {
      throw new NotFoundException('User not found');
    }

    user.coins += amount;
    const updatedUser = await user.save();
    const { password: _pw, ...safeUser } = updatedUser.toObject();
    return safeUser;
  }

  async removeCoins(userId: string, amount: number): Promise<any> {
    if (amount <= 0) {
      throw new BadRequestException('Amount must be positive');
    }

    const user = await this.userModel.findById(userId);
    if (!user) {
      throw new NotFoundException('User not found');
    }

    if (user.coins < amount) {
      throw new BadRequestException('Insufficient coins');
    }

    user.coins -= amount;
    const updatedUser2 = await user.save();
    const { password: _pw2, ...safeUser2 } = updatedUser2.toObject();
    return safeUser2;
  }
}
