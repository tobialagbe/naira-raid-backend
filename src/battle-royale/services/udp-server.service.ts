/* eslint-disable prefer-const */
/* eslint-disable max-len */
/* eslint-disable @typescript-eslint/no-unused-vars */
import { Injectable, Logger, OnModuleInit, OnModuleDestroy } from '@nestjs/common';
import * as dgram from 'dgram';
import { InjectModel } from '@nestjs/mongoose';
import { Model } from 'mongoose';
import { BattleRoyalePlayer, BattleRoyalePlayerDocument } from '../schemas/battle-royale-player.schema';

/**
 * UdpServerService
 * ----------------
 * A UDP-based game server handling basic multiplayer events:
 * - Players can connect, move, flip (scale), rotate, attack, take damage, and die.
 * - The server also handles periodic cleanup of inactive players.
 * - Demonstrates how to parse incoming UDP messages, broadcast updates, and maintain minimal state in memory.
 */
@Injectable()
export class UdpServerService implements OnModuleInit, OnModuleDestroy {
  private readonly logger = new Logger(UdpServerService.name);
  private server: dgram.Socket;

  /**
   * players
   * -------
   * A map of playerId => player data. Stored in memory for quick lookups.
   * Example:
   *   this.players[playerId] = {
   *     address,       // from rinfo
   *     port,          // from rinfo
   *     roomId,
   *     eventId,
   *     position,      // current position
   *     flip,          // scaling
   *     rotation,      // angle
   *     isAlive,
   *     health,
   *   };
   */
  private players: Record<string, any> = {};

  /**
   * playerLastActivity
   * ------------------
   * A map of playerId => last activity timestamp (ms).
   * Used to detect timeouts / disconnections from inactivity.
   */
  private playerLastActivity: Record<string, number> = {};

  /**
   * Configuration constants
   */
  private readonly UDP_PORT = 41234;
  private readonly PLAYER_TIMEOUT = 20000;      // 20 seconds inactivity => disconnect
  private readonly CLEANUP_INTERVAL = 25000;    // 25 seconds interval to check for inactivity
  private readonly PING_INTERVAL = 5000;       // Clients should ping every 5 seconds

  /**
   * Timer for the cleanup interval
   */
  private cleanupTimer: NodeJS.Timeout;

  constructor(
    @InjectModel(BattleRoyalePlayer.name)
    private readonly playerModel: Model<BattleRoyalePlayerDocument>,
  ) {}

  /**
   * onModuleInit
   * ------------
   * Called once the NestJS module is initialized.
   * - Starts the UDP server.
   * - Starts a repeated cleanup timer for disconnected players.
   */
  onModuleInit() {
    this.startServer();
    this.cleanupTimer = setInterval(() => this.cleanupDisconnectedPlayers(), this.CLEANUP_INTERVAL);
  }

  /**
   * onModuleDestroy
   * ---------------
   * Called during application shutdown.
   * - Closes the UDP socket and clears the cleanup timer.
   */
  onModuleDestroy() {
    if (this.server) {
      this.server.close();
    }
    if (this.cleanupTimer) {
      clearInterval(this.cleanupTimer);
    }
  }

  /**
   * startServer
   * -----------
   * Creates the UDP socket, sets up event handlers, and binds to the configured port.
   */
  private startServer() {
    // Create a UDP socket (IPv4)
    this.server = dgram.createSocket('udp4');

    // Handle "error" events
    this.server.on('error', (err) => {
      this.logger.error(`Server error: ${err.stack}`);
      this.server.close();
    });

    // Handle incoming messages
    this.server.on('message', (msg, rinfo) => {
      try {
        const data = JSON.parse(msg.toString());
        const playerId = data.playerId;

        // Always update player's network info if we already know them
        if (playerId && this.players[playerId]) {
          this.players[playerId].address = rinfo.address;
          this.players[playerId].port = rinfo.port;
        }

        // Update last activity time
        if (playerId) {
          this.playerLastActivity[playerId] = Date.now();
        }

        // Handle ping messages quickly
        if (data.type === 'ping') {
          this.handlePing(data, rinfo);
          return;
        }

        // Main switch for game events
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
          case 'disconnect':
            this.handleDisconnect(data, rinfo);
            break;
          default:
            // Use template string for clarity in logs
            this.logger.warn(`Unknown message type: ${data.type}`);
            break;
        }
      } catch (err) {
        this.logger.error('Failed to parse incoming message:', err);
      }
    });

    // Handle "listening" event ONCE (combined into a single event listener)
    this.server.on('listening', () => {
      try {
        // Configure socket options - note that some OSes may ignore these
        this.server.setBroadcast(false);
        this.server.setRecvBufferSize(65536);
        this.server.setSendBufferSize(65536);

        const address = this.server.address();
        this.logger.log(`UDP Server listening at ${address.address}:${address.port}`);
      } catch (err) {
        this.logger.error(`Error configuring socket: ${err.message}`);
      }
    });

    // Finally bind the socket to the port
    this.server.bind(this.UDP_PORT);
  }

  /**
   * handlePing
   * ----------
   * Responds to "ping" messages with a "pong" to keep connections alive.
   * Also updates the player's last activity time.
   */
  private handlePing(data: any, rinfo: dgram.RemoteInfo) {
    const playerId = data.playerId;
    
    // Update last activity time if this is a known player
    if (playerId && this.players[playerId]) {
      this.playerLastActivity[playerId] = Date.now();
    }

    console.log('ping received', data);

    // Send pong response with original timestamp for latency calculation
    // this.sendMessage({
    //   type: 'pong',
    //   timestamp: data.timestamp || Date.now(),
    //   pingInterval: this.PING_INTERVAL, // Tell client how often to ping
    //   nextPingTime: Date.now() + this.PING_INTERVAL // Help client schedule next ping
    // }, rinfo.address, rinfo.port);
  }

  /**
   * cleanupDisconnectedPlayers
   * --------------------------
   * Periodically checks which players have been inactive too long
   * and broadcasts a "disconnect" event for them.
   */
  private cleanupDisconnectedPlayers() {
    const now = Date.now();
    const disconnectedPlayers: string[] = [];

    // Find all players whose last activity exceeded PLAYER_TIMEOUT
    for (const [playerId, lastActivity] of Object.entries(this.playerLastActivity)) {
      if (now - lastActivity > this.PLAYER_TIMEOUT) {
        disconnectedPlayers.push(playerId);
      }
    }

    // Remove each disconnected player from server state
    for (const playerId of disconnectedPlayers) {
      if (this.players[playerId]) {
        const roomId = this.players[playerId].roomId;
        const playerInfo = this.players[playerId]; // Store reference before deletion

        this.logger.log(`Player ${playerId} timed out and will be disconnected.`);

        // Send disconnect message to the timed out player
        this.sendMessage({
          type: 'disconnect',
          playerId: playerId,
          reason: 'inactivity_timeout'
        }, playerInfo.address, playerInfo.port);

        // Broadcast to other players that this player has disconnected
        this.broadcastExcept({
          type: 'disconnect',
          playerId: playerId,
          reason: 'inactivity_timeout'
        }, playerId, roomId);

        // Optionally, if your game logic treats a timeout as an actual elimination
        // you can set isAlive = false or update the DB here, e.g.:
        playerInfo.isAlive = false;
        if (playerInfo.eventId) {
          this.updatePlayerDeathInDatabase(playerId, playerInfo.eventId, /*position=*/0);
        }

        // Clean up memory
        delete this.players[playerId];
        delete this.playerLastActivity[playerId];
      }
    }
  }

  /**
   * handleConnect
   * -------------
   * Handles a new player's "connect" message:
   * - Adds them to the in-memory state if not already there.
   * - Sends back "connect_ack" with current players in the room.
   * - Broadcasts "spawn" to all other players in the same room.
   */
  private handleConnect(data: any, rinfo: dgram.RemoteInfo) {
    const playerId = data.playerId;
    const roomId = data.roomId || null;
    const eventId = data.eventId || null;

    // If new to this server, store their info
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
        health: 20,
      };
      this.logger.log(`Player connected: ${playerId} from ${rinfo.address}:${rinfo.port}`);

      // Update the player's roomId/status in DB if eventId is provided
      if (eventId && roomId) {
        this.updatePlayerInDatabase(playerId, eventId, roomId);
      }
    }

    // Initialize or update last activity time
    this.playerLastActivity[playerId] = Date.now();

    // Build a list of existing players in the same room
    const existingPlayersList = Object.entries(this.players)
      .filter(([pid, info]) => info.roomId === roomId)
      .map(([pid, info]) => ({
        playerId: pid,
        position: info.position,
        flip: info.flip,
        rotation: info.rotation,
        isAlive: info.isAlive,
        health: info.health,
        bot: false,
        roomId: info.roomId,
      }));

    // A) Acknowledge the new player with current state and ping configuration
    this.sendMessage({
      type: 'connect_ack',
      message: 'Welcome to the server!',
      existingPlayers: existingPlayersList,
      pingInterval: this.PING_INTERVAL,
      nextPingTime: Date.now() + this.PING_INTERVAL
    }, rinfo.address, rinfo.port);

    // B) Broadcast "spawn" event to all other players in the room
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
   * handleMove
   * ----------
   * Broadcasts a "move" event to other players in the same room.
   */
  private handleMove(data: any, rinfo: dgram.RemoteInfo) {
    const playerId = data.playerId;
    const player = this.players[playerId];
    if (!player || !player.isAlive) return;

    player.position = data.position;

    // Broadcast movement to others in the room
    this.broadcastExcept({
      type: 'move',
      playerId: playerId,
      position: data.position,
    }, playerId, player.roomId);
  }

  /**
   * handleFlip
   * ----------
   * Broadcasts a "flip" event (scaling) to other players.
   */
  private handleFlip(data: any, rinfo: dgram.RemoteInfo) {
    const playerId = data.playerId;
    const player = this.players[playerId];
    if (!player || !player.isAlive) return;

    player.flip = data.localScale;

    this.broadcastExcept({
      type: 'flip',
      playerId: playerId,
      flip: data.localScale,
    }, playerId, player.roomId);
  }

  /**
   * handleRotate
   * ------------
   * Broadcasts a "rotate" event to other players.
   */
  private handleRotate(data: any, rinfo: dgram.RemoteInfo) {
    const playerId = data.playerId;
    const player = this.players[playerId];
    if (!player || !player.isAlive) return;

    player.rotation = data.rotation;

    this.broadcastExcept({
      type: 'rotate',
      playerId: playerId,
      rotation: data.rotation,
    }, playerId, player.roomId);
  }

  /**
   * handleAttack
   * ------------
   * Broadcasts an "attack" event to other players.
   * NOTE: The attacker is excluded (because they already know they attacked).
   * If the attacker also needs confirmation, you'd need to handle that separately.
   */
  private handleAttack(data: any, rinfo: dgram.RemoteInfo) {
    const playerId = data.playerId;
    const player = this.players[playerId];
    if (!player || !player.isAlive) return;

    this.broadcastExcept({
      type: 'attack',
      playerId: playerId,
      shootPoint: data.shootPoint || { x: 0, y: 0, z: 0 },
      shootDirection: data.shootDirection || { x: 0, y: 0 },
    }, playerId, player.roomId);
  }

  /**
   * handleDamage
   * ------------
   * Reduces a player's health, checks if they are dead, then broadcasts "damage".
   * If the player dies, optionally updates DB (position, status).
   */
  private handleDamage(data: any, rinfo: dgram.RemoteInfo) {
    const playerId = data.playerId;
    const player = this.players[playerId];
    if (!player || !player.isAlive) return;

    // Reduce health
    player.health = Math.max(0, player.health - data.damage);

    // Check if death occurred
    // if (player.health <= 0) {
    //   player.isAlive = false;

    //   // Update DB if it's a Battle Royale event
    //   if (player.eventId) {
    //     this.updatePlayerDeathInDatabase(playerId, player.eventId, data.position || 0);
    //   }
    // }

    // Broadcast damage to other players
    this.broadcastExcept({
      type: 'damage',
      playerId: playerId,
      damage: data.damage,
      shooterId: data.shooterId,
      currentHealth: player.health,
    }, playerId, player.roomId);
  }

  /**
   * handleDeath
   * -----------
   * Handles an explicit "death" event from the client (e.g., they've definitely died).
   */
  private handleDeath(data: any, rinfo: dgram.RemoteInfo) {
    const playerId = data.playerId;
    const player = this.players[playerId];
    if (!player) return;

    player.isAlive = false;

    // Update database for an official death
    if (player.eventId) {
      this.updatePlayerDeathInDatabase(playerId, player.eventId, data.position || 0);
    }

    // Broadcast "death" to others in the room
    this.broadcastExcept({
      type: 'death',
      playerId: playerId,
    }, playerId, player.roomId);
  }

  /**
   * handleDisconnect
   * ---------------
   * Handles an explicit disconnect message from a client.
   * This allows for clean disconnections without waiting for timeout.
   */
  private handleDisconnect(data: any, rinfo: dgram.RemoteInfo) {
    const playerId = data.playerId;
    const player = this.players[playerId];
    if (!player) return;

    const roomId = player.roomId;
    
    // Log the clean disconnect
    this.logger.log(`Player ${playerId} disconnected cleanly`);

    // Broadcast disconnect to other players in the room
    this.broadcastExcept({
      type: 'disconnect',
      playerId: playerId,
    }, playerId, roomId);

    // If this was a Battle Royale event player, update their status
    if (player.eventId) {
      this.updatePlayerDeathInDatabase(playerId, player.eventId, 0);
    }

    // Clean up the player data
    delete this.players[playerId];
    delete this.playerLastActivity[playerId];
  }

  /**
   * broadcastExcept
   * ---------------
   * Sends a message to all players in the same room EXCEPT the given playerId.
   */
  private broadcastExcept(msgObj: any, exceptPlayerId: string, roomId: string | null = null) {
    let broadcastCount = 0;
    for (const [pid, info] of Object.entries(this.players)) {
      if (pid === exceptPlayerId) continue;
      if (roomId && info.roomId !== roomId) continue;

      // Debug-level logging for each broadcast
      this.logger.debug(`Broadcasting to ${pid} at ${info.address}:${info.port}`);
      this.sendMessage(msgObj, info.address, info.port);
      broadcastCount++;
    }
    this.logger.log(`Broadcasted '${msgObj.type}' to ${broadcastCount} players in room ${roomId}`);
  }

  /**
   * sendMessage
   * -----------
   * Safely sends a JSON-serialized object via UDP.
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
   * updatePlayerInDatabase
   * -----------------------
   * Example function to mark a player as 'active' in a given event & room.
   */
  private async updatePlayerInDatabase(playerId: string, eventId: string, roomId: string) {
    try {
      await this.playerModel.findOneAndUpdate(
        { userId: playerId, eventId },
        {
          roomId,
          status: 'active',
          isAlive: true,
          position: 0,
        },
      );
    } catch (error) {
      this.logger.error(`Failed to update player ${playerId} in database:`, error);
    }
  }

  /**
   * updatePlayerDeathInDatabase
   * ---------------------------
   * Example function to mark a player as 'eliminated' or 'winner' in the database.
   */
  private async updatePlayerDeathInDatabase(playerId: string, eventId: string, position: number) {
    try {
      await this.playerModel.findOneAndUpdate(
        { userId: playerId, eventId },
        {
          status: position === 1 ? 'winner' : 'eliminated',
          isAlive: false,
          position: position,
        },
      );
    } catch (error) {
      this.logger.error(`Failed to update player ${playerId} death in database:`, error);
    }
  }
}
