/* eslint-disable max-len */
import { Injectable, BadRequestException, NotFoundException, Inject, forwardRef } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model, Types } from 'mongoose';
import { BattleRoyaleEvent, BattleRoyaleEventDocument } from '../schemas/battle-royale-event.schema';
import { BattleRoyalePlayer, BattleRoyalePlayerDocument } from '../schemas/battle-royale-player.schema';
import { CreateEventDto } from '../dto/create-event.dto';
import { RegisterPlayerDto } from '../dto/register-player.dto';
import { UpdatePlayerDto } from '../dto/update-player.dto';
import { UserService } from '../../user/user.service';
import { BattleStatsDto } from '../dto/battle-stats.dto';

@Injectable()
export class BattleRoyaleService {
  constructor(
    @InjectModel(BattleRoyaleEvent.name)
    private readonly eventModel: Model<BattleRoyaleEventDocument>,
    @InjectModel(BattleRoyalePlayer.name)
    private readonly playerModel: Model<BattleRoyalePlayerDocument>,
    @Inject(forwardRef(() => UserService)) private readonly userService: UserService,
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

    // Fetch events and convert to plain JS objects
    const events = await this.eventModel
      .find(query)
      .sort({ eventDate: 1, startTime: 1 })
      .lean()
      .exec();

    // Attach number of registered participants to each event
    const eventsWithParticipants = await Promise.all(
      events.map(async (event) => {
        const registeredParticipants = await this.playerModel.countDocuments({
          eventId: event._id,
        });
        return { ...event, registeredParticipants };
      }),
    );

    return eventsWithParticipants;
  }

  /**
   * Get the latest 5 upcoming events with registration status
   */
  async getLatestUpcomingEvent(userId?: string) {
    const now = new Date();

    const upcomingEvents = await this.eventModel
      .find({
        eventDate: { $gte: now },
        status: 'upcoming',
      })
      .sort({ eventDate: 1, startTime: 1 })
      .limit(5)
      .lean()
      .exec();

    if (!upcomingEvents.length) {
      throw new NotFoundException('No upcoming events found');
    }

    // Get registration status for each event
    const eventsWithParticipants = await Promise.all(
      upcomingEvents.map(async (event) => {
        const registeredParticipants = await this.playerModel.countDocuments({
          eventId: event._id,
        });

        let isRegistered = false;
        if (userId) {
          const registration = await this.playerModel.findOne({
            userId: new Types.ObjectId(userId),
            eventId: event._id,
          });
          isRegistered = !!registration;
        }

        return { 
          ...event, 
          registeredParticipants,
          isRegistered
        };
      })
    );

    return eventsWithParticipants;
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

  /**
   * Get the closest upcoming event a user is registered for
   */
  async getClosestUpcomingEventForUser(userId: string) {
    const now = new Date();
    const userIdObj = new Types.ObjectId(userId.toString());

    // Fetch all event IDs the user is registered for
    const registrations = await this.playerModel
      .find({ userId: userIdObj })
      .select('eventId')
      .lean();

    const eventIds = registrations.map((r) => r.eventId);

    if (eventIds.length === 0) {
      throw new NotFoundException('User is not registered for any events');
    }

    // Find the closest upcoming event among the registered ones
    const upcomingEvent = await this.eventModel
      .findOne({
        _id: { $in: eventIds },
        status: 'upcoming',
        eventDate: { $gte: now },
      })
      .sort({ eventDate: 1, startTime: 1 })
      .lean()
      .exec();

    if (!upcomingEvent) {
      throw new NotFoundException('No upcoming registered events found');
    }

    // Attach participant count
    const registeredParticipants = await this.playerModel.countDocuments({
      eventId: upcomingEvent._id,
    });

    return { ...upcomingEvent, registeredParticipants };
  }

  /**
   * Get player battle statistics (total battles, wins, best rank)
   */
  async getPlayerBattleStats(userId: string): Promise<BattleStatsDto> {
    // Convert userId to ObjectId for MongoDB queries
    const userIdObj = new Types.ObjectId(userId.toString());
    
    // Get all player records for this user
    const playerRecords = await this.playerModel.find({ userId: userIdObj }).lean().exec();
    
    // Calculate stats
    const totalBattles = playerRecords.length;
    
    // Count wins (position === 1)
    const wins = playerRecords.filter(record => record.position === 1).length;
    
    // Find best rank (lowest position number greater than 0)
    // Position 0 means still active/registered but hasn't competed yet
    const positions = playerRecords
      .map(record => record.position)
      .filter(position => position > 0);
    
    const bestRank = positions.length > 0 ? Math.min(...positions) : 0;
    
    // Get unwithdrawn cash
    const unwithdrawnCash = await this.getUnwithdrawnCash(userId);
    
    return {
      totalBattles,
      wins,
      bestRank: bestRank || 0,
      unwithdrawnCash
    };
  }

  /**
   * Get the amount of unwithdrawn cash for a user
   */
  async getUnwithdrawnCash(userId: string): Promise<number> {
    // Convert userId to ObjectId for MongoDB queries
    const userIdObj = new Types.ObjectId(userId.toString());
    
    // Get all player records for this user where cash is not withdrawn
    const playerRecords = await this.playerModel.find({ 
      userId: userIdObj,
      cashWithdrawn: false,
      cashWon: { $gt: 0 }
    }).lean().exec();
    
    // Calculate total unwithdrawn cash
    const totalUnwithdrawnCash = playerRecords.reduce((total, record) => total + record.cashWon, 0);
    
    return totalUnwithdrawnCash;
  }

  /**
   * Withdraw all unwithdrawn cash for a user
   */
  async withdrawCash(userId: string): Promise<{ amountWithdrawn: number }> {
    // Convert userId to ObjectId for MongoDB queries
    const userIdObj = new Types.ObjectId(userId.toString());
    
    // Find all records with unwithdrawn cash
    const result = await this.playerModel.updateMany(
      { 
        userId: userIdObj,
        cashWithdrawn: false,
        cashWon: { $gt: 0 }
      },
      { 
        $set: { cashWithdrawn: true } 
      }
    );
    
    // For audit purposes, find the total amount that was withdrawn
    const unwithdrawnCash = await this.getUnwithdrawnCash(userId);
    
    return { amountWithdrawn: unwithdrawnCash };
  }
} 