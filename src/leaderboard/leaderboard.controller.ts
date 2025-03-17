import {
  Controller,
  Get,
  Post,
  Body,
  Param,
  Query,
  UseGuards,
  Request,
  DefaultValuePipe,
  ParseIntPipe,
  BadRequestException,
} from '@nestjs/common';
import { LeaderboardService } from './leaderboard.service';
import { CreateLeaderboardDto } from './dto/create-leaderboard.dto';
import { CreateGameSessionDto } from './dto/create-game-session.dto';
import { PaginationDto } from '../common/dto/pagination.dto';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { ApiOperation, ApiQuery, ApiResponse, ApiTags } from '@nestjs/swagger';

@ApiTags('leaderboard')
@Controller('leaderboard')
export class LeaderboardController {
  constructor(private readonly leaderboardService: LeaderboardService) {}

  @UseGuards(JwtAuthGuard)
  @Post()
  createLeaderboard(@Body() createLeaderboardDto: CreateLeaderboardDto) {
    return this.leaderboardService.createLeaderboard(createLeaderboardDto);
  }

  @Get('current/:gameId')
  getCurrentLeaderboard(@Param('gameId') gameId: string) {
    return this.leaderboardService.getCurrentLeaderboard(gameId);
  }

  @Get('top')
  @ApiOperation({ summary: 'Get top players from the current leaderboard' })
  @ApiQuery({ name: 'gameId', required: true, description: 'Game identifier' })
  @ApiQuery({ name: 'limit', required: false, description: 'Number of players to return (default: 10)' })
  @ApiResponse({
    status: 200,
    description: 'Returns the top players with their position, username, and score',
  })
  getTopPlayers(
    @Query('gameId') gameId: string,
    @Query('limit', new DefaultValuePipe(10), ParseIntPipe) limit: number,
  ) {
    if (!gameId) {
      throw new BadRequestException('gameId is required');
    }
    
    return this.leaderboardService.getTopPlayers(gameId, limit);
  }

  @Get(':leaderboardId/entries')
  getLeaderboardEntries(
    @Param('leaderboardId') leaderboardId: string,
    @Query() paginationDto: PaginationDto,
  ) {
    return this.leaderboardService.getLeaderboardEntries(leaderboardId, paginationDto);
  }

  @UseGuards(JwtAuthGuard)
  @Post('game-session')
  createGameSession(
    @Request() req,
    @Body() createGameSessionDto: CreateGameSessionDto,
  ) {
    return this.leaderboardService.createGameSession(req.user.userId, createGameSessionDto);
  }

  @UseGuards(JwtAuthGuard)
  @Get('player-stats/:gameId')
  getPlayerStats(@Request() req, @Param('gameId') gameId: string) {
    return this.leaderboardService.getPlayerStats(req.user.userId, gameId);
  }
}
