import {
  Controller,
  Get,
  Post,
  Body,
  Param,
  Delete,
  Put,
  HttpStatus,
} from '@nestjs/common';
import { ApiTags, ApiOperation, ApiResponse, ApiParam } from '@nestjs/swagger';
import { Types } from 'mongoose';
import { PlayerProgressService } from './player-progress.service';
import { CreatePlayerProgressDto } from './dto/create-player-progress.dto';
import { UpdatePlayerProgressDto } from './dto/update-player-progress.dto';
import { PlayerProgress } from './schemas/player-progress.schema';

@ApiTags('player-progress')
@Controller('player-progress')
export class PlayerProgressController {
  constructor(private readonly playerProgressService: PlayerProgressService) {}

  @Post()
  @ApiOperation({ summary: 'Create new player progress' })
  @ApiResponse({
    status: HttpStatus.CREATED,
    description: 'The player progress has been successfully created.',
    type: PlayerProgress,
  })
  create(@Body() createPlayerProgressDto: CreatePlayerProgressDto) {
    return this.playerProgressService.create(createPlayerProgressDto);
  }

  @Get()
  @ApiOperation({ summary: 'Get all player progress records' })
  @ApiResponse({
    status: HttpStatus.OK,
    description: 'Returns all player progress records',
    type: [PlayerProgress],
  })
  findAll() {
    return this.playerProgressService.findAll();
  }

  @Get(':id')
  @ApiOperation({ summary: 'Get player progress by ID' })
  @ApiParam({ name: 'id', type: String })
  @ApiResponse({
    status: HttpStatus.OK,
    description: 'Returns the player progress record',
    type: PlayerProgress,
  })
  @ApiResponse({
    status: HttpStatus.NOT_FOUND,
    description: 'Player progress not found',
  })
  findOne(@Param('id') id: string) {
    return this.playerProgressService.findOne(new Types.ObjectId(id));
  }

  @Get('user/:userId/game/:gameId')
  @ApiOperation({ summary: 'Get player progress by user ID and game ID' })
  @ApiParam({ name: 'userId', type: String })
  @ApiParam({ name: 'gameId', type: String })
  @ApiResponse({
    status: HttpStatus.OK,
    description: 'Returns the player progress record',
    type: PlayerProgress,
  })
  @ApiResponse({
    status: HttpStatus.NOT_FOUND,
    description: 'Player progress not found',
  })
  findByUserAndGame(
    @Param('userId') userId: string,
    @Param('gameId') gameId: string,
  ) {
    return this.playerProgressService.findByUserAndGame(
      new Types.ObjectId(userId),
      gameId,
    );
  }

  @Put('user/:userId/game/:gameId')
  @ApiOperation({ summary: 'Update player progress' })
  @ApiParam({ name: 'userId', type: String })
  @ApiParam({ name: 'gameId', type: String })
  @ApiResponse({
    status: HttpStatus.OK,
    description: 'The player progress has been successfully updated.',
    type: PlayerProgress,
  })
  @ApiResponse({
    status: HttpStatus.NOT_FOUND,
    description: 'Player progress not found',
  })
  update(
    @Param('userId') userId: string,
    @Param('gameId') gameId: string,
    @Body() updatePlayerProgressDto: UpdatePlayerProgressDto,
  ) {
    return this.playerProgressService.updateProgress(
      new Types.ObjectId(userId),
      gameId,
      updatePlayerProgressDto,
    );
  }

  @Delete(':id')
  @ApiOperation({ summary: 'Delete player progress' })
  @ApiParam({ name: 'id', type: String })
  @ApiResponse({
    status: HttpStatus.OK,
    description: 'The player progress has been successfully deleted.',
    type: PlayerProgress,
  })
  @ApiResponse({
    status: HttpStatus.NOT_FOUND,
    description: 'Player progress not found',
  })
  remove(@Param('id') id: string) {
    return this.playerProgressService.remove(new Types.ObjectId(id));
  }
} 