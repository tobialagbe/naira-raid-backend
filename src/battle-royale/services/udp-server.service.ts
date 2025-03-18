/* eslint-disable prefer-const */
/* eslint-disable max-len */
/* eslint-disable @typescript-eslint/no-unused-vars */
import { Injectable, Logger, OnModuleInit, OnModuleDestroy } from '@nestjs/common';
import * as dgram from 'dgram';
import { InjectModel } from '@nestjs/mongoose';
import { Model } from 'mongoose';
import { BattleRoyalePlayer, BattleRoyalePlayerDocument } from '../schemas/battle-royale-player.schema';

@Injectable()
export class UdpServerService implements OnModuleInit, OnModuleDestroy {
  private readonly logger = new Logger(UdpServerService.name);
  private server: dgram.Socket;
  private players: Record<string, any> = {};
  private readonly UDP_PORT = 41234;
  
  // Track last activity time for each player to handle timeouts
  private playerLastActivity: Record<string, number> = {};
  
  // How long a player can be inactive before being considered disconnected (ms)
  private readonly PLAYER_TIMEOUT = 15000; // 15 seconds
  
  // Interval for checking player timeouts (ms)
  private readonly CLEANUP_INTERVAL = 10000; // 10 seconds
  
  // Timer for cleanup
  private cleanupTimer: NodeJS.Timeout;

  constructor(
    @InjectModel(BattleRoyalePlayer.name)
    private readonly playerModel: Model<BattleRoyalePlayerDocument>,
  ) {}

  onModuleInit() {
    this.startServer();
    
    // Start a timer to clean up disconnected players
    this.cleanupTimer = setInterval(() => this.cleanupDisconnectedPlayers(), this.CLEANUP_INTERVAL);
  }

  onModuleDestroy() {
    if (this.server) {
      this.server.close();
    }
    
    if (this.cleanupTimer) {
      clearInterval(this.cleanupTimer);
    }
  }

  private startServer() {
    // Create a UDP socket (IPv4)
    this.server = dgram.createSocket('udp4');

    // Configure socket for better performance with mobile clients
    // NOTE: Configure socket options AFTER binding the socket, not before
    this.server.on('listening', () => {
      try {
        // These operations should only be performed after socket is bound
        this.server.setBroadcast(false);
        this.server.setRecvBufferSize(65536); // Larger buffer for mobile clients with inconsistent networking
        this.server.setSendBufferSize(65536);
        
        const address = this.server.address();
        this.logger.log(`UDP Server listening at ${address.address}:${address.port}`);
      } catch (err) {
        this.logger.error(`Error configuring socket: ${err.message}`);
      }
    });

    // When we receive a message (datagram):
    this.server.on('message', (msg, rinfo) => {
      try {
        const data = JSON.parse(msg.toString());
        const playerId = data.playerId;

        // Always update the player's network info
        if (playerId && this.players[playerId]) {
          this.players[playerId].address = rinfo.address;
          this.players[playerId].port = rinfo.port;
        }
        
        // Update last activity time for this player
        if (playerId) {
          this.playerLastActivity[playerId] = Date.now();
        }
        
        // Handle ping messages for keeping mobile connections alive
        if (data.type === 'ping') {
          this.handlePing(data, rinfo);
          return;
        }
        
        switch (data.type) {
          case 'connect':
            this.handleConnect(data, rinfo);
            break;
          case 'move':
            this.handleMove(data, rinfo);
            break;
          case 'flip':
            this.handleFlip(data, rinfo);
            break;
          case 'rotate':
            this.handleRotate(data, rinfo);
            break;
          case 'attack':
            this.handleAttack(data, rinfo);
            break;
          case 'damage':
            this.handleDamage(data, rinfo);
            break;
          case 'death':
            this.handleDeath(data, rinfo);
            break;
          default:
            this.logger.warn('Unknown message type:', data.type);
            break;
        }
      } catch (err) {
        this.logger.error('Failed to parse incoming message:', err);
      }
    });

    // Basic error handling
    this.server.on('error', (err) => {
      this.logger.error(`Server error: ${err.stack}`);
      this.server.close();
    });

    // 'listening' event
    this.server.on('listening', () => {
      const address = this.server.address();
      this.logger.log(`UDP Server listening at ${address.address}:${address.port}`);
    });

    // Start listening on UDP port
    this.server.bind(this.UDP_PORT);
  }

  /**
   * Handle ping messages (keep-alive)
   */
  private handlePing(data: any, rinfo: dgram.RemoteInfo) {
    // Simply send a pong response back to the client
    this.sendMessage({
      type: 'pong',
      timestamp: data.timestamp || Date.now()
    }, rinfo.address, rinfo.port);
  }

  /**
   * Periodically check for and remove disconnected players
   */
  private cleanupDisconnectedPlayers() {
    const now = Date.now();
    let disconnectedPlayers = [];
    
    for (const [playerId, lastActivity] of Object.entries(this.playerLastActivity)) {
      if (now - lastActivity > this.PLAYER_TIMEOUT) {
        disconnectedPlayers.push(playerId);
      }
    }
    
    // Remove disconnected players
    for (const playerId of disconnectedPlayers) {
      if (this.players[playerId]) {
        const roomId = this.players[playerId].roomId;
        
        this.logger.log(`Player ${playerId} timed out and will be disconnected`);
        
        // Broadcast to other players that this player has disconnected
        this.broadcastExcept({
          type: 'death',
          playerId: playerId,
        }, playerId, roomId);
        
        // Clean up player data
        delete this.players[playerId];
        delete this.playerLastActivity[playerId];
      }
    }
  }

  /**
   * Handle a new player connecting.
   */
  private handleConnect(data: any, rinfo: dgram.RemoteInfo) {
    const playerId = data.playerId;
    const roomId = data.roomId || null;
    const eventId = data.eventId || null;

    // If we already know this player, skip re-adding them
    if (!this.players[playerId]) {
      this.players[playerId] = {
        address: rinfo.address,
        port: rinfo.port,
        roomId,
        eventId,
        position: { x: 0, y: 0, z: 0 },
        flip: { x: 1, y: 1, z: 1 },
        rotation: 0,
        isAlive: true,
        health: 5 // Max health
      };
      this.logger.log(`Player connected: ${playerId} from ${rinfo.address}:${rinfo.port}`);

      // Update the player's roomId and status in the database if eventId is provided
      if (eventId && roomId) {
        this.updatePlayerInDatabase(playerId, eventId, roomId);
      }
    }

    // const testPlayer = {
    //   playerId: '123456',
    //   position: { x: 1, y: 1, z: 1 },
    //   flip: { x: 1, y: 1, z: 1 },
    //   rotation: 0,
    //   isAlive: true,
    //   health: 5,
    //   bot:true,
    //   roomId: 'test',
    // };

    // A) Send a "connect_ack" back to this newly connected client
    // including a list of existing players so they can spawn them locally.
    const existingPlayersList = Object.entries(this.players)
      .filter(([pid, info]) => info.roomId === roomId) // Only players in the same room
      .map(([pid, info]: [string, any]) => ({
        playerId: pid,
        position: info.position,
        flip: info.flip,
        rotation: info.rotation,
        isAlive: info.isAlive,
        health: info.health,
        bot: false,
        roomId: info.roomId
      }));

    this.sendMessage({
      type: 'connect_ack',
      message: 'Welcome to the server!',
      existingPlayers: [existingPlayersList], // Send both test player and real players
    }, rinfo.address, rinfo.port);

    // console.log('broadcast spawn!!! ');

    // B) Broadcast a "spawn" event to all OTHER players that a new player has joined
    this.broadcastExcept({
      type: 'spawn',
      playerId: playerId,
      position: { x: 0, y: 0, z: 0 },
      flip: { x: 1, y: 1, z: 1 },
      rotation: 0,
      isAlive: true,
      health: 5,
      bot: false,
      roomId: roomId,
    }, playerId, roomId);
  }

  /**
   * Handle a player's movement update.
   */
  private handleMove(data: any, rinfo: dgram.RemoteInfo) {
    const playerId = data.playerId;
    const player = this.players[playerId];
    if (!player || !player.isAlive) return; // ignore if not found or dead

    player.position = data.position;

    // console.log('moved!!! ');

    // Broadcast this movement to all other players in the same room
    this.broadcastExcept({
      type: 'move',
      playerId: playerId,
      position: data.position,
    }, playerId, player.roomId);
  }

  /**
   * Handle flipping (scaling) data.
   */
  private handleFlip(data: any, rinfo: dgram.RemoteInfo) {
    const playerId = data.playerId;
    const player = this.players[playerId];
    if (!player || !player.isAlive) return;

    player.flip = data.localScale;

    // console.log('flipped!!! ');

    this.broadcastExcept({
      type: 'flip',
      playerId: playerId,
      flip: data.localScale,
    }, playerId, player.roomId);
  }

  /**
   * Handle rotation data.
   */
  private handleRotate(data: any, rinfo: dgram.RemoteInfo) {
    const playerId = data.playerId;
    const player = this.players[playerId];
    if (!player || !player.isAlive) return;

    player.rotation = data.rotation;

    // console.log('rotated!!! ');

    this.broadcastExcept({
      type: 'rotate',
      playerId: playerId,
      rotation: data.rotation,
    }, playerId, player.roomId);
  }

  /**
   * Handle an attack event.
   */
  private handleAttack(data: any, rinfo: dgram.RemoteInfo) {
    console.log('person dey shoot');
    const playerId = data.playerId;
    const player = this.players[playerId];
    if (!player || !player.isAlive) return;

    // console.log('attacking!!! ');

    // Broadcast to everyone except the attacker in the same room
    this.broadcastExcept({
      type: 'attack',
      playerId: playerId,
      shootPoint: data.shootPoint || { x: 0, y: 0, z: 0 },
      shootDirection: data.shootDirection || { x: 0, y: 0 }
    }, playerId, player.roomId);
  }

  /**
   * Handle damage event
   */
  private handleDamage(data: any, rinfo: dgram.RemoteInfo) {
    const playerId = data.playerId;
    const player = this.players[playerId];
    if (!player || !player.isAlive) return;

    player.health = Math.max(0, player.health - data.damage);

    if (player.health <= 0) {
      player.isAlive = false;
      
      // Update database if this is a Battle Royale event
      if (player.eventId) {
        this.updatePlayerDeathInDatabase(playerId, player.eventId, data.position || 0);
      }
    }

    // console.log('damage!!! ');

    // Broadcast damage to all players in the room
    this.broadcastExcept({
      type: 'damage',
      playerId: playerId,
      damage: data.damage,
      shooterId: data.shooterId,
      currentHealth: player.health
    }, playerId, player.roomId);
  }

  /**
   * Handle a death event.
   */
  private handleDeath(data: any, rinfo: dgram.RemoteInfo) {
    const playerId = data.playerId;
    const player = this.players[playerId];
    if (!player) return;

    player.isAlive = false;

    // Update player position in database
    if (player.eventId) {
      this.updatePlayerDeathInDatabase(playerId, player.eventId, data.position || 0);
    }

    // Broadcast to everyone except the dead player in the same room
    this.broadcastExcept({
      type: 'death',
      playerId: playerId
    }, playerId, player.roomId);
  }

  /**
   * Broadcast a message to all players in a specific room except the specified playerId.
   */
  private broadcastExcept(msgObj: any, exceptPlayerId: string, roomId: string | null = null) {
    let broadcastCount = 0;
    for (const [pid, info] of Object.entries(this.players)) {
      // Skip if it's the excluded player or not in the same room
      if (pid === exceptPlayerId) continue;
      if (roomId && info.roomId !== roomId) continue;

      this.logger.debug(`Broadcasting to ${pid} at ${info.address}:${info.port}`);
      console.log(`Broadcasting to ${pid} at ${info.address}:${info.port}`);
      this.sendMessage(msgObj, info.address, info.port);
      broadcastCount++;
    }
    this.logger.log(`Broadcast message to ${broadcastCount} players in room ${roomId}`);
    console.log(`Broadcast message to ${broadcastCount} players in room ${roomId}`);
  }

  /**
   * Helper function to send a JSON message via UDP with improved error handling.
   */
  private sendMessage(dataObj: any, address: string, port: number) {
    const message = Buffer.from(JSON.stringify(dataObj));
    
    try {
      this.server.send(message, 0, message.length, port, address, (err) => {
        if (err) {
          this.logger.error('Failed to send message:', err);
        }
      });
    } catch (error) {
      this.logger.error('Error sending UDP message:', error);
    }
  }

  /**
   * Update player information in the database
   */
  private async updatePlayerInDatabase(playerId: string, eventId: string, roomId: string) {
    try {
      // Find the player by user ID and event ID and update the room ID
      await this.playerModel.findOneAndUpdate(
        { userId: playerId, eventId },
        { 
          roomId, 
          status: 'active',
          isAlive: true,
          position: 0
        }
      );
    } catch (error) {
      this.logger.error(`Failed to update player ${playerId} in database:`, error);
    }
  }

  /**
   * Update player death information in the database
   */
  private async updatePlayerDeathInDatabase(playerId: string, eventId: string, position: number) {
    try {
      // Find the player by user ID and event ID and update status and position
      await this.playerModel.findOneAndUpdate(
        { userId: playerId, eventId },
        { 
          status: position === 1 ? 'winner' : 'eliminated',
          isAlive: false,
          position: position,
        }
      );
    } catch (error) {
      this.logger.error(`Failed to update player ${playerId} death in database:`, error);
    }
  }
} 