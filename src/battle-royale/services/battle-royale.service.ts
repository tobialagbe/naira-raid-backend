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

// Define the preset list of rooms
const BATTLE_ROYALE_ROOMS = ['Room-A', 'Room-B', 'Room-C'];
const MAX_PLAYERS_PER_ROOM = 120;

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
  async getEvents(status?: string, userId?: string) {
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
        
        let isRegistered = false;
        let userRoomId = null;
        let hasParticipated = false;
        
        if (userId) {
          const registration = await this.playerModel.findOne({
            userId: new Types.ObjectId(userId),
            eventId: event._id,
          });
          
          isRegistered = !!registration;
          
          if (registration) {
            userRoomId = registration.roomId;
            // Check if player has already participated
            hasParticipated = registration.status !== 'registered';
          }
        }
        
        const result = { 
          ...event, 
          registeredParticipants 
        };
        
        if (userId) {
          Object.assign(result, {
            isRegistered,
            userRoomId,
            hasParticipated
          });
        }
        
        return result;
      }),
    );

    return eventsWithParticipants;
  }

  /**
   * Get the latest 5 upcoming events with registration status
   */
  async getLatestUpcomingEvent(userId?: string) {
    // Get today's date with time set to start of day (00:00:00)
    const today = new Date();
    today.setHours(0, 0, 0, 0);

    const upcomingEvents = await this.eventModel
      .find({
        // Get events happening today or in the future
        eventDate: { $gte: today },
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
        let userRoomId = null;
        let hasParticipated = false;
        
        if (userId) {
          const registration = await this.playerModel.findOne({
            userId: new Types.ObjectId(userId),
            eventId: event._id,
          });
          
          isRegistered = !!registration;
          
          if (registration) {
            userRoomId = registration.roomId;
            // Check if player has already participated
            hasParticipated = registration.status !== 'registered';
          }
        }
        
        // Get room occupancy information
        const roomsInfo = await Promise.all(
          BATTLE_ROYALE_ROOMS.map(async (roomId) => {
            const occupancy = await this.playerModel.countDocuments({
              eventId: event._id,
              roomId
            });
            
            return {
              roomId,
              occupancy,
              isFull: occupancy >= MAX_PLAYERS_PER_ROOM,
              capacity: MAX_PLAYERS_PER_ROOM
            };
          })
        );

        return { 
          ...event, 
          registeredParticipants,
          isRegistered,
          userRoomId,
          hasParticipated,
          rooms: roomsInfo,
          isFullyBooked: roomsInfo.every(room => room.isFull)
        };
      })
    );

    return eventsWithParticipants;
  }

  /**
   * Get a specific event by ID
   */
  async getEventById(eventId: string, userId?: string): Promise<any> {
    const event = await this.eventModel.findById(eventId).lean().exec();
    
    if (!event) {
      throw new NotFoundException(`Event with ID ${eventId} not found`);
    }
    
    // Attach participant count
    const registeredParticipants = await this.playerModel.countDocuments({
      eventId: event._id,
    });
    
    const result = {
      ...event,
      registeredParticipants
    };
    
    if (userId) {
      const registration = await this.playerModel.findOne({
        userId: new Types.ObjectId(userId),
        eventId: event._id,
      });
      
      const isRegistered = !!registration;
      const userRoomId = registration ? registration.roomId : null;
      const hasParticipated = registration ? registration.status !== 'registered' : false;
      
      Object.assign(result, {
        isRegistered,
        userRoomId,
        hasParticipated
      });
      
      // Get room occupancy information
      const roomsInfo = await Promise.all(
        BATTLE_ROYALE_ROOMS.map(async (roomId) => {
          const occupancy = await this.playerModel.countDocuments({
            eventId: event._id,
            roomId
          });
          
          return {
            roomId,
            occupancy,
            isFull: occupancy >= MAX_PLAYERS_PER_ROOM,
            capacity: MAX_PLAYERS_PER_ROOM
          };
        })
      );
      
      Object.assign(result, {
        rooms: roomsInfo,
        isFullyBooked: roomsInfo.every(room => room.isFull)
      });
    }
    
    return result;
  }

  /**
   * Find available room for an event
   */
  private async findAvailableRoom(eventId: string): Promise<string | null> {
    const eventIdObj = new Types.ObjectId(eventId);
    
    // Check each room in sequence
    for (const room of BATTLE_ROYALE_ROOMS) {
      // Count players in this room for this event
      const playersInRoom = await this.playerModel.countDocuments({
        eventId: eventIdObj,
        roomId: room,
      });
      
      // If room has space, return it
      if (playersInRoom < MAX_PLAYERS_PER_ROOM) {
        return room;
      }
    }
    
    // All rooms are full
    return null;
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
    
    // Find an available room
    const availableRoom = await this.findAvailableRoom(eventIdString);
    
    if (!availableRoom) {
      throw new BadRequestException('All rooms for this event are full. Registration is closed.');
    }
    
    // Get user details
    const user = await this.userService.findById(userId);
    
    // Create player registration
    const playerData = {
      userId: new Types.ObjectId(userIdString),
      username: user.username,
      eventId: new Types.ObjectId(eventIdString),
      roomId: availableRoom,
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
  async getEventPlayers(eventId: string, roomId?: string) {
    const query: any = { eventId };
    
    if (roomId) {
      query.roomId = roomId;
    }
    
    return this.playerModel.find(query).exec();
  }

  /**
   * Get players by room for an event
   */
  async getEventPlayersByRoom(eventId: string): Promise<{ roomId: string; players: any[]; count: number }[]> {
    const eventIdObj = new Types.ObjectId(eventId);
    
    const results = [];
    
    for (const room of BATTLE_ROYALE_ROOMS) {
      const players = await this.playerModel.find({ 
        eventId: eventIdObj,
        roomId: room
      }).exec();
      
      results.push({
        roomId: room,
        players,
        count: players.length
      });
    }
    
    return results;
  }

  /**
   * Get leaderboard for an event (players ordered by position)
   */
  async getEventLeaderboard(eventId: string, roomId?: string) {
    const query: any = {
      eventId,
      status: { $in: ['eliminated', 'winner'] },
      position: { $gt: 0 }
    };
    
    if (roomId) {
      query.roomId = roomId;
    }
    
    const players = await this.playerModel.find(query)
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
      .select('eventId roomId status')
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

    // Find the user's room for this event
    const userRegistration = registrations.find(
      (r) => r.eventId.toString() === upcomingEvent._id.toString()
    );
    
    const userRoomId = userRegistration ? userRegistration.roomId : null;
    const hasParticipated = userRegistration ? userRegistration.status !== 'registered' : false;
    
    // Get room occupancy information
    const roomsInfo = await Promise.all(
      BATTLE_ROYALE_ROOMS.map(async (roomId) => {
        const occupancy = await this.playerModel.countDocuments({
          eventId: upcomingEvent._id,
          roomId
        });
        
        return {
          roomId,
          occupancy,
          isFull: occupancy >= MAX_PLAYERS_PER_ROOM,
          capacity: MAX_PLAYERS_PER_ROOM
        };
      })
    );

    return {
      ...upcomingEvent,
      registeredParticipants,
      userRoomId,
      hasParticipated,
      rooms: roomsInfo,
      isFullyBooked: roomsInfo.every(room => room.isFull)
    };
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