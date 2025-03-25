import {
  Controller,
  Get,
  Post,
  Body,
  Param,
  UseGuards,
  Request,
  Query,
  Patch,
  Delete,
} from '@nestjs/common';
import { JwtAuthGuard } from '../../auth/guards/jwt-auth.guard';
import { DailyMissionsService } from '../services/daily-missions.service';
import { ApiTags, ApiOperation, ApiQuery, ApiParam } from '@nestjs/swagger';
import { UpdateMissionProgressDto } from '../dto/update-mission-progress.dto';
import { CreateMissionDefinitionDto } from '../dto/create-mission-definition.dto';
import { GameType } from '../../common/types/game.types';

@ApiTags('daily-missions')
@Controller('daily-missions')
export class DailyMissionsController {
  constructor(private readonly dailyMissionsService: DailyMissionsService) {}

  @UseGuards(JwtAuthGuard)
  @Post('definitions')
  @ApiOperation({ summary: 'Create a new mission definition' })
  createMissionDefinition(@Body() createDto: CreateMissionDefinitionDto) {
    return this.dailyMissionsService.createMissionDefinition(createDto);
  }

  @Get('definitions')
  @ApiOperation({ summary: 'Get all mission definitions' })
  @ApiQuery({ name: 'activeOnly', required: false, type: Boolean })
  getMissionDefinitions(@Query('activeOnly') activeOnly?: boolean) {
    return this.dailyMissionsService.getMissionDefinitions(activeOnly);
  }

  @Get('definitions/:id')
  @ApiOperation({ summary: 'Get a specific mission definition' })
  @ApiParam({ name: 'id', description: 'Mission definition ID' })
  getMissionDefinitionById(@Param('id') id: string) {
    return this.dailyMissionsService.getMissionDefinitionById(id);
  }

  @UseGuards(JwtAuthGuard)
  @Patch('definitions/:id')
  @ApiOperation({ summary: 'Update a mission definition' })
  @ApiParam({ name: 'id', description: 'Mission definition ID' })
  updateMissionDefinition(
    @Param('id') id: string,
    @Body() updateDto: Partial<CreateMissionDefinitionDto>,
  ) {
    return this.dailyMissionsService.updateMissionDefinition(id, updateDto);
  }

  @UseGuards(JwtAuthGuard)
  @Delete('definitions/:id')
  @ApiOperation({ summary: 'Deactivate a mission definition' })
  @ApiParam({ name: 'id', description: 'Mission definition ID' })
  deactivateMissionDefinition(@Param('id') id: string) {
    return this.dailyMissionsService.deactivateMissionDefinition(id);
  }

  @UseGuards(JwtAuthGuard)
  @Get()
  @ApiOperation({ summary: 'Get daily missions for the current player' })
  getDailyMissions(@Request() req) {
    return this.dailyMissionsService.getDailyMissions(req.user.userId);
  }

  @UseGuards(JwtAuthGuard)
  @Post('progress')
  @ApiOperation({ summary: 'Update mission progress based on game events' })
  updateMissionProgress(
    @Request() req,
    @Body() updateProgressDto: UpdateMissionProgressDto,
  ) {
    return this.dailyMissionsService.updateMissionProgress(
      req.user.userId,
      updateProgressDto.gameId,
      updateProgressDto.matchId,
      updateProgressDto.stats,
    );
  }

  @UseGuards(JwtAuthGuard)
  @Post('claim/:missionProgressId')
  @ApiOperation({ summary: 'Claim rewards for a completed mission' })
  claimMissionReward(
    @Request() req,
    @Param('missionProgressId') missionProgressId: string,
  ) {
    return this.dailyMissionsService.claimMissionReward(
      req.user.userId,
      missionProgressId,
    );
  }

  @UseGuards(JwtAuthGuard)
  @Get('points')
  @ApiOperation({ summary: 'Get total mission points for the current player' })
  getMissionPoints(@Request() req) {
    return this.dailyMissionsService.getMissionPoints(req.user.userId, GameType.NAIRA_RAID);
  }
} 