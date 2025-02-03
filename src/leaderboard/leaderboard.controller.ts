import {
  Controller,
  Get,
  Post,
  Body,
  Param,
  Query,
  UseGuards,
  Request,
} from '@nestjs/common';
import { LeaderboardService } from './leaderboard.service';
import { CreateLeaderboardDto } from './dto/create-leaderboard.dto';
import { CreateGameSessionDto } from './dto/create-game-session.dto';
import { PaginationDto } from '../common/dto/pagination.dto';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';

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
  @Post('game-session/:sessionId/complete')
  completeGameSession(@Param('sessionId') sessionId: string) {
    return this.leaderboardService.completeGameSession(sessionId);
  }

  @UseGuards(JwtAuthGuard)
  @Get('player-stats/:gameId')
  getPlayerStats(@Request() req, @Param('gameId') gameId: string) {
    return this.leaderboardService.getPlayerStats(req.user.userId, gameId);
  }
}
