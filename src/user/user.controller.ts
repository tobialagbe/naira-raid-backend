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
import { UserService } from './user.service';
import { CreateUserDto } from './dto/create-user.dto';
import { UpdateUserDto } from './dto/update-user.dto';
import { PaginationDto } from '../common/dto/pagination.dto';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { CoinOperationDto } from './dto/coin-operation.dto';
import { ApiTags, ApiOperation, ApiParam, ApiResponse } from '@nestjs/swagger';
import { BattleStatsDto } from '../battle-royale/dto/battle-stats.dto';

@ApiTags('users')
@Controller('users')
export class UserController {
  constructor(private readonly userService: UserService) {}

  @Post()
  create(@Body() createUserDto: CreateUserDto) {
    return this.userService.create(createUserDto);
  }

  @UseGuards(JwtAuthGuard)
  @Get()
  findAll(@Query() paginationDto: PaginationDto) {
    return this.userService.findAll(paginationDto);
  }

  @UseGuards(JwtAuthGuard)
  @Get(':id')
  findOne(@Param('id') id: string) {
    return this.userService.findById(id);
  }

  @UseGuards(JwtAuthGuard)
  @Get('by-email/:email')
  findByEmail(@Param('email') email: string) {
    return this.userService.findByEmail(email);
  }

  @UseGuards(JwtAuthGuard)
  @Get('by-username/:username')
  findByUsername(@Param('username') username: string) {
    return this.userService.findByUsername(username);
  }

  @UseGuards(JwtAuthGuard)
  @Get('by-instagram/:instagram')
  findByInstagram(@Param('instagram') instagram: string) {
    return this.userService.findByInstagram(instagram);
  }

  @UseGuards(JwtAuthGuard)
  @Get('by-tiktok/:tiktok')
  findByTiktok(@Param('tiktok') tiktok: string) {
    return this.userService.findByTiktok(tiktok);
  }

  @UseGuards(JwtAuthGuard)
  @Patch(':id')
  update(@Param('id') id: string, @Body() updateUserDto: UpdateUserDto) {
    return this.userService.update(id, updateUserDto);
  }

  @UseGuards(JwtAuthGuard)
  @Delete(':id')
  remove(@Param('id') id: string) {
    return this.userService.remove(id);
  }

  // Coin endpoints for current authenticated user
  @UseGuards(JwtAuthGuard)
  @Get('coins')
  getCoins(@Request() req) {
    return this.userService.getCoins(req.user.userId);
  }

  @UseGuards(JwtAuthGuard)
  @Post('coins/add')
  addCoins(@Request() req, @Body() coinOperationDto: CoinOperationDto) {
    return this.userService.addCoins(req.user.userId, coinOperationDto.amount);
  }

  @UseGuards(JwtAuthGuard)
  @Post('coins/remove')
  removeCoins(@Request() req, @Body() coinOperationDto: CoinOperationDto) {
    return this.userService.removeCoins(req.user.userId, coinOperationDto.amount);
  }

  // Admin endpoints to manage another user's coins (optional)
  @UseGuards(JwtAuthGuard)
  @Get(':id/coins')
  getUserCoins(@Param('id') id: string) {
    return this.userService.getCoins(id);
  }

  @UseGuards(JwtAuthGuard)
  @Post(':id/coins/add')
  addUserCoins(@Param('id') id: string, @Body() coinOperationDto: CoinOperationDto) {
    return this.userService.addCoins(id, coinOperationDto.amount);
  }

  @UseGuards(JwtAuthGuard)
  @Post(':id/coins/remove')
  removeUserCoins(@Param('id') id: string, @Body() coinOperationDto: CoinOperationDto) {
    return this.userService.removeCoins(id, coinOperationDto.amount);
  }
}
