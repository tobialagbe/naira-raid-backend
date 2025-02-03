import {
  Controller,
  Get,
  Post,
  Body,
  Patch,
  Param,
  Delete,
  Query,
  UseGuards,
  Request,
} from '@nestjs/common';
import { InventoryService } from './inventory.service';
import { CreateInventoryItemDto } from './dto/create-inventory-item.dto';
import { CreateUserInventoryDto } from './dto/create-user-inventory.dto';
import { PaginationDto } from '../common/dto/pagination.dto';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';

@Controller('inventory')
export class InventoryController {
  constructor(private readonly inventoryService: InventoryService) {}

  @UseGuards(JwtAuthGuard)
  @Post('items')
  createItem(@Body() createInventoryItemDto: CreateInventoryItemDto) {
    return this.inventoryService.createItem(createInventoryItemDto);
  }

  @Get('items/:gameId')
  findAllItems(
    @Param('gameId') gameId: string,
    @Query() paginationDto: PaginationDto,
  ) {
    return this.inventoryService.findAllItems(gameId, paginationDto);
  }

  @Get('items/detail/:id')
  findItemById(@Param('id') id: string) {
    return this.inventoryService.findItemById(id);
  }

  @UseGuards(JwtAuthGuard)
  @Patch('items/:id')
  updateItem(
    @Param('id') id: string,
    @Body() updateData: Partial<CreateInventoryItemDto>,
  ) {
    return this.inventoryService.updateItem(id, updateData);
  }

  @UseGuards(JwtAuthGuard)
  @Delete('items/:id')
  deleteItem(@Param('id') id: string) {
    return this.inventoryService.deleteItem(id);
  }

  @UseGuards(JwtAuthGuard)
  @Post('user')
  addToUserInventory(
    @Request() req,
    @Body() createUserInventoryDto: CreateUserInventoryDto,
  ) {
    return this.inventoryService.addToUserInventory(
      req.user.userId,
      createUserInventoryDto,
    );
  }

  @UseGuards(JwtAuthGuard)
  @Get('user/:gameId')
  getUserInventory(
    @Request() req,
    @Param('gameId') gameId: string,
    @Query() paginationDto: PaginationDto,
  ) {
    return this.inventoryService.getUserInventory(
      req.user.userId,
      gameId,
      paginationDto,
    );
  }

  @UseGuards(JwtAuthGuard)
  @Post('user/use/:itemId')
  useInventoryItem(
    @Request() req,
    @Param('itemId') itemId: string,
    @Body('quantity') quantity?: number,
  ) {
    return this.inventoryService.useInventoryItem(
      req.user.userId,
      itemId,
      quantity,
    );
  }
}
