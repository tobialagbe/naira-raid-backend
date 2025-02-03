import {
  Injectable,
  NotFoundException,
  BadRequestException,
} from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model } from 'mongoose';
import {
  InventoryItem,
  InventoryItemDocument,
} from './schemas/inventory-item.schema';
import {
  UserInventory,
  UserInventoryDocument,
} from './schemas/user-inventory.schema';
import { CreateInventoryItemDto } from './dto/create-inventory-item.dto';
import { CreateUserInventoryDto } from './dto/create-user-inventory.dto';
import { PaginationDto } from '../common/dto/pagination.dto';

@Injectable()
export class InventoryService {
  constructor(
    @InjectModel(InventoryItem.name)
    private readonly inventoryItemModel: Model<InventoryItemDocument>,
    @InjectModel(UserInventory.name)
    private readonly userInventoryModel: Model<UserInventoryDocument>,
  ) {}

  async createItem(
    createInventoryItemDto: CreateInventoryItemDto,
  ): Promise<InventoryItemDocument> {
    const item = new this.inventoryItemModel(createInventoryItemDto);
    return item.save();
  }

  async findAllItems(gameId: string, paginationDto: PaginationDto) {
    const { page = 1, limit = 10 } = paginationDto;
    const skip = (page - 1) * limit;

    const [items, total] = await Promise.all([
      this.inventoryItemModel
        .find({ gameId, isActive: true })
        .skip(skip)
        .limit(limit)
        .exec(),
      this.inventoryItemModel.countDocuments({ gameId, isActive: true }),
    ]);

    return {
      items,
      total,
      page,
      totalPages: Math.ceil(total / limit),
    };
  }

  async findItemById(id: string): Promise<InventoryItemDocument> {
    const item = await this.inventoryItemModel.findById(id);
    if (!item) {
      throw new NotFoundException('Inventory item not found');
    }
    return item;
  }

  async updateItem(
    id: string,
    updateData: Partial<CreateInventoryItemDto>,
  ): Promise<InventoryItemDocument> {
    const item = await this.inventoryItemModel.findByIdAndUpdate(
      id,
      updateData,
      {
        new: true,
      },
    );
    if (!item) {
      throw new NotFoundException('Inventory item not found');
    }
    return item;
  }

  async deleteItem(id: string): Promise<void> {
    const result = await this.inventoryItemModel.deleteOne({ _id: id });
    if (result.deletedCount === 0) {
      throw new NotFoundException('Inventory item not found');
    }
  }

  async addToUserInventory(
    userId: string,
    createUserInventoryDto: CreateUserInventoryDto,
  ): Promise<UserInventoryDocument> {
    const item = await this.findItemById(createUserInventoryDto.itemId);
    if (!item.isActive) {
      throw new BadRequestException('This item is no longer available');
    }

    const existingInventory = await this.userInventoryModel.findOne({
      userId,
      itemId: createUserInventoryDto.itemId,
      gameId: createUserInventoryDto.gameId,
    });

    if (existingInventory) {
      existingInventory.quantity += createUserInventoryDto.quantity;
      if (createUserInventoryDto.expiresAt) {
        existingInventory.expiresAt = createUserInventoryDto.expiresAt;
      }
      return existingInventory.save();
    }

    const userInventory = new this.userInventoryModel({
      userId,
      ...createUserInventoryDto,
    });
    return userInventory.save();
  }

  async getUserInventory(
    userId: string,
    gameId: string,
    paginationDto: PaginationDto,
  ) {
    const { page = 1, limit = 10 } = paginationDto;
    const skip = (page - 1) * limit;

    const [items, total] = await Promise.all([
      this.userInventoryModel
        .find({
          userId,
          gameId,
          $or: [{ expiresAt: { $gt: new Date() } }, { expiresAt: null }],
        })
        .populate('itemId')
        .skip(skip)
        .limit(limit)
        .exec(),
      this.userInventoryModel.countDocuments({
        userId,
        gameId,
        $or: [{ expiresAt: { $gt: new Date() } }, { expiresAt: null }],
      }),
    ]);

    return {
      items,
      total,
      page,
      totalPages: Math.ceil(total / limit),
    };
  }

  async useInventoryItem(
    userId: string,
    itemId: string,
    quantity = 1,
  ): Promise<UserInventoryDocument> {
    const userInventory = await this.userInventoryModel
      .findOne({
        userId,
        itemId,
        $or: [{ expiresAt: { $gt: new Date() } }, { expiresAt: null }],
      })
      .populate('itemId');

    if (!userInventory) {
      throw new NotFoundException('Item not found in user inventory');
    }

    if (userInventory.quantity < quantity) {
      throw new BadRequestException('Insufficient quantity');
    }

    userInventory.quantity -= quantity;

    if (userInventory.quantity === 0) {
      await userInventory.deleteOne();
      return null;
    }

    return userInventory.save();
  }
}
