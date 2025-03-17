import { Injectable } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model } from 'mongoose';
import { faker } from '@faker-js/faker';
import { InventoryItem, InventoryItemDocument } from '../../inventory/schemas/inventory-item.schema';
import { UserInventory, UserInventoryDocument } from '../../inventory/schemas/user-inventory.schema';
import { UserDocument } from '../../user/schemas/user.schema';
import { GameType } from '../../common/types/game.types';

@Injectable()
export class InventorySeeder {
  constructor(
    @InjectModel(InventoryItem.name)
    private readonly inventoryItemModel: Model<InventoryItemDocument>,
    @InjectModel(UserInventory.name)
    private readonly userInventoryModel: Model<UserInventoryDocument>,
  ) {}

  async seed(users: UserDocument[]) {
    // Clear existing data
    await Promise.all([
      this.inventoryItemModel.deleteMany({}),
      this.userInventoryModel.deleteMany({}),
    ]);

    // Create inventory items
    const items = await this.createInventoryItems();

    // Create user inventories
    const userInventories = await this.createUserInventories(users, items);

    return {
      items,
      userInventories,
    };
  }

  private async createInventoryItems(): Promise<InventoryItemDocument[]> {
    const itemTypes = ['power-up', 'weapon', 'currency', 'boost'];
    const items: Partial<InventoryItem>[] = [];

    // Create 20 random items
    for (let i = 0; i < 20; i++) {
      const type = faker.helpers.arrayElement(itemTypes);
      items.push({
        name: faker.commerce.productName(),
        description: faker.commerce.productDescription(),
        gameId: GameType.NAIRA_RAID,
        type,
        duration: type === 'power-up' ? faker.number.int({ min: 30, max: 300 }) : undefined,
        power: type === 'weapon' ? faker.number.int({ min: 1, max: 100 }) : undefined,
        isActive: true,
      });
    }

    return this.inventoryItemModel.insertMany(items) as Promise<InventoryItemDocument[]>;
  }

  private async createUserInventories(
    users: UserDocument[],
    items: InventoryItemDocument[],
  ): Promise<UserInventoryDocument[]> {
    const userInventories: Partial<UserInventory>[] = [];

    for (const user of users) {
      // Give each user 1-5 random items
      const itemCount = faker.number.int({ min: 1, max: 5 });
      const selectedItems = faker.helpers.arrayElements(items, itemCount);

      for (const item of selectedItems) {
        userInventories.push({
          userId: user._id,
          itemId: item._id,
          quantity: faker.number.int({ min: 1, max: 10 }),
          gameId: GameType.NAIRA_RAID,
          expiresAt: faker.helpers.arrayElement([
            undefined,
            faker.date.future(),
          ]),
        });
      }
    }

    return this.userInventoryModel.insertMany(userInventories) as Promise<UserInventoryDocument[]>;
  }
} 