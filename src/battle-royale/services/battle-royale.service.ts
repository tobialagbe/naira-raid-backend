/* eslint-disable max-len */
import { Injectable, BadRequestException, NotFoundException } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model, Types } from 'mongoose';
import { BattleRoyaleEvent, BattleRoyaleEventDocument } from '../schemas/battle-royale-event.schema';
import { BattleRoyalePlayer, BattleRoyalePlayerDocument } from '../schemas/battle-royale-player.schema';
import { CreateEventDto } from '../dto/create-event.dto';
import { RegisterPlayerDto } from '../dto/register-player.dto';
import { UpdatePlayerDto } from '../dto/update-player.dto';
import { UserService } from '../../user/user.service';

@Injectable()
export class BattleRoyaleService {
  constructor(
    @InjectModel(BattleRoyaleEvent.name)
    private readonly eventModel: Model<BattleRoyaleEventDocument>,
    @InjectModel(BattleRoyalePlayer.name)
    private readonly playerModel: Model<BattleRoyalePlayerDocument>,
    private readonly userService: UserService,
  ) {}

  /**
   * Create a new Battle Royale event
   */
  async createEvent(createEventDto: CreateEventDto): Promise<BattleRoyaleEventDocument> {
    const event = new this.eventModel(createEventDto);
    return event.save();
  }

  /**
   * Get all events with optional filtering
   */
  async getEvents(status?: string) {
    const query: any = {};
    
    if (status) {
      query.status = status;
    }
    
    return this.eventModel.find(query).sort({ eventDate: 1, startTime: 1 }).exec();
  }

  /**
   * Get the latest upcoming event
   */
  async getLatestUpcomingEvent() {
    const now = new Date();
    
    // Find the next event that's scheduled after now
    const upcomingEvents = await this.eventModel.find({
      eventDate: { $gte: now },
      status: 'upcoming'
    })
    .sort({ eventDate: 1, startTime: 1 })
    .limit(1)
    .exec();
    
    if (upcomingEvents.length === 0) {
      throw new NotFoundException('No upcoming events found');
    }
    
    return upcomingEvents[0];
  }

  /**
   * Get a specific event by ID
   */
  async getEventById(eventId: string): Promise<BattleRoyaleEventDocument> {
    const event = await this.eventModel.findById(eventId).exec();
    
    if (!event) {
      throw new NotFoundException(`Event with ID ${eventId} not found`);
    }
    
    return event;
  }

  /**
   * Register a player for an event
   */
  async registerPlayer(userId: string, registerPlayerDto: RegisterPlayerDto): Promise<BattleRoyalePlayerDocument> {
    const event = await this.getEventById(registerPlayerDto.eventId.toString());
    
    // Check if event is still open for registration
    if (event.status !== 'upcoming') {
      throw new BadRequestException('Registration for this event is closed');
    }
    
    // Convert IDs to strings for consistent comparison
    const userIdString = userId.toString();
    const eventIdString = registerPlayerDto.eventId.toString();
    
    // Check if user is already registered
    const existingRegistration = await this.playerModel.findOne({
      userId: new Types.ObjectId(userIdString),
      eventId: new Types.ObjectId(eventIdString)
    });
    
    if (existingRegistration) {
      throw new BadRequestException('You are already registered for this event');
    }
    
    // Get user details
    const user = await this.userService.findById(userId);
    
    // Create player registration
    const playerData = {
      userId: new Types.ObjectId(userIdString),
      username: user.username,
      eventId: new Types.ObjectId(eventIdString),
      // If there's no entry fee, automatically set as paid
      entryFeePaid: event.entryFee === 0
    };
    
    const player = new this.playerModel(playerData);
    return player.save();
  }

  /**
   * Update player information
   */
  async updatePlayer(userId: string, updatePlayerDto: UpdatePlayerDto): Promise<BattleRoyalePlayerDocument> {
    // Convert IDs to ObjectId for MongoDB queries
    const userIdObj = new Types.ObjectId(userId.toString());
    const eventIdObj = new Types.ObjectId(updatePlayerDto.eventId.toString());
    
    const player = await this.playerModel.findOne({
      userId: userIdObj,
      eventId: eventIdObj
    });
    
    if (!player) {
      throw new NotFoundException('Player registration not found');
    }
    
    // Update player fields
    Object.keys(updatePlayerDto).forEach(key => {
      if (key !== 'eventId' && updatePlayerDto[key] !== undefined) {
        player[key] = updatePlayerDto[key];
      }
    });
    
    return player.save();
  }

  /**
   * Get player status for an event
   */
  async getPlayerStatus(userId: string, eventId: string): Promise<BattleRoyalePlayerDocument> {
    // Convert IDs to ObjectId for MongoDB queries
    const userIdObj = new Types.ObjectId(userId.toString());
    const eventIdObj = new Types.ObjectId(eventId.toString());
    
    const player = await this.playerModel.findOne({
      userId: userIdObj,
      eventId: eventIdObj
    });
    
    // For debugging - log the query params
    console.log('Looking for player with userId:', userIdObj, 'eventId:', eventIdObj);
    
    if (!player) {
      // Check if there are any registrations for this user to help diagnose
      const allUserRegistrations = await this.playerModel.find({ userId: userIdObj });
      console.log('Found registrations for user:', allUserRegistrations.length);
      
      throw new NotFoundException('Player registration not found');
    }
    
    return player;
  }

  /**
   * Mark player's entry fee as paid
   */
  async markEntryFeePaid(userId: string, eventId: string): Promise<BattleRoyalePlayerDocument> {
    // Convert IDs to ObjectId for MongoDB queries
    const userIdObj = new Types.ObjectId(userId.toString());
    const eventIdObj = new Types.ObjectId(eventId.toString());
    
    const player = await this.playerModel.findOne({
      userId: userIdObj,
      eventId: eventIdObj
    });
    
    if (!player) {
      throw new NotFoundException('Player registration not found');
    }
    
    player.entryFeePaid = true;
    return player.save();
  }

  /**
   * Get all players registered for an event
   */
  async getEventPlayers(eventId: string) {
    return this.playerModel.find({ eventId }).exec();
  }

  /**
   * Get leaderboard for an event (players ordered by position)
   */
  async getEventLeaderboard(eventId: string) {
    const players = await this.playerModel.find({
      eventId,
      status: { $in: ['eliminated', 'winner'] },
      position: { $gt: 0 }
    })
    .sort({ position: 1 })
    .exec();
    
    // Players are sorted by position (1 is winner, 2 is second place, etc.)
    return players;
  }
} 