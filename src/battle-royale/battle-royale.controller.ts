import {
  Controller,
  Get,
  Post,
  Body,
  Param,
  Query,
  UseGuards,
  Request,
  Patch,
} from '@nestjs/common';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { BattleRoyaleService } from './services/battle-royale.service';
import { CreateEventDto } from './dto/create-event.dto';
import { RegisterPlayerDto } from './dto/register-player.dto';
import { UpdatePlayerDto } from './dto/update-player.dto';
import { ApiTags, ApiOperation, ApiParam, ApiQuery } from '@nestjs/swagger';

@ApiTags('battle-royale')
@Controller('battle-royale')
export class BattleRoyaleController {
  constructor(private readonly battleRoyaleService: BattleRoyaleService) {}

  @UseGuards(JwtAuthGuard)
  @Post('events')
  @ApiOperation({ summary: 'Create a new Battle Royale event' })
  createEvent(@Body() createEventDto: CreateEventDto) {
    return this.battleRoyaleService.createEvent(createEventDto);
  }

  @Get('events')
  @ApiOperation({ summary: 'Get all Battle Royale events' })
  @ApiQuery({ name: 'status', required: false, description: 'Filter by event status' })
  getEvents(@Query('status') status?: string) {
    return this.battleRoyaleService.getEvents(status);
  }

  @Get('events/upcoming')
  @ApiOperation({ summary: 'Get the latest upcoming Battle Royale event' })
  getLatestUpcomingEvent() {
    return this.battleRoyaleService.getLatestUpcomingEvent();
  }

  @Get('events/:id')
  @ApiOperation({ summary: 'Get a specific Battle Royale event' })
  @ApiParam({ name: 'id', description: 'Event ID' })
  getEventById(@Param('id') id: string) {
    return this.battleRoyaleService.getEventById(id);
  }

  @UseGuards(JwtAuthGuard)
  @Post('register')
  @ApiOperation({ summary: 'Register for a Battle Royale event' })
  registerPlayer(@Request() req, @Body() registerPlayerDto: RegisterPlayerDto) {
    return this.battleRoyaleService.registerPlayer(req.user.userId, registerPlayerDto);
  }

  @UseGuards(JwtAuthGuard)
  @Patch('players')
  @ApiOperation({ summary: 'Update player information' })
  updatePlayer(@Request() req, @Body() updatePlayerDto: UpdatePlayerDto) {
    return this.battleRoyaleService.updatePlayer(req.user.userId, updatePlayerDto);
  }

  @UseGuards(JwtAuthGuard)
  @Get('players/status/:eventId')
  @ApiOperation({ summary: 'Get player status for an event' })
  @ApiParam({ name: 'eventId', description: 'Event ID' })
  getPlayerStatus(@Request() req, @Param('eventId') eventId: string) {
    return this.battleRoyaleService.getPlayerStatus(req.user.userId, eventId);
  }

  @UseGuards(JwtAuthGuard)
  @Post('players/pay-entry-fee/:eventId')
  @ApiOperation({ summary: 'Mark entry fee as paid' })
  @ApiParam({ name: 'eventId', description: 'Event ID' })
  markEntryFeePaid(@Request() req, @Param('eventId') eventId: string) {
    return this.battleRoyaleService.markEntryFeePaid(req.user.userId, eventId);
  }

  @Get('events/:id/players')
  @ApiOperation({ summary: 'Get all players registered for an event' })
  @ApiParam({ name: 'id', description: 'Event ID' })
  getEventPlayers(@Param('id') id: string) {
    return this.battleRoyaleService.getEventPlayers(id);
  }

  @Get('events/:id/leaderboard')
  @ApiOperation({ summary: 'Get leaderboard for an event' })
  @ApiParam({ name: 'id', description: 'Event ID' })
  getEventLeaderboard(@Param('id') id: string) {
    return this.battleRoyaleService.getEventLeaderboard(id);
  }
} 