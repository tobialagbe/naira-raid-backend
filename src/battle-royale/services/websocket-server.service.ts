// -----------------------------------------------------------------------------
//  WebSocketServerService – drop‑in replacement for the UDP NestJS server
// -----------------------------------------------------------------------------
//  • Uses the **ws** library (raw RFC‑6455 WebSocket, NOT Socket.IO)
//  • Keeps the same JSON message schema and gameplay logic as the old
//    UdpServerService so your database code and front‑end remain unchanged.
//  • Listens on wss://<host>:8765/match – exactly what the new Unity client
//    connects to.
// -----------------------------------------------------------------------------
//  Install once:   npm i ws @types/ws --save
//                  # if not already present
//  Then register the service inside any NestJS module’s providers array.
// -----------------------------------------------------------------------------

import { Injectable, Logger, OnModuleInit, OnModuleDestroy } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model } from 'mongoose';
import { BattleRoyalePlayer, BattleRoyalePlayerDocument } from '../schemas/battle-royale-player.schema';
import * as WebSocket from 'ws';

interface PlayerInfo {
  ws: WebSocket;
  address: string;
  port: number;
  roomId: string | null;
  eventId: string | null;
  username: string | null;
  position: any;
  flip: any;
  rotation: number;
  isAlive: boolean;
  health: number;
  bot?: boolean;
  cashCollected?: number;
}

@Injectable()
export class WebSocketServerService implements OnModuleInit, OnModuleDestroy {
  private readonly logger = new Logger(WebSocketServerService.name);

  private wss!: WebSocket.Server;
  private players: Record<string, PlayerInfo> = {};
  private playerLastActivity: Record<string, number> = {};
  private cashObjects: Record<string, { position: any; roomId?: string; eventId?: string }> = {};

  private readonly WS_PORT = 8765;
  private readonly WS_PATH = '/match';

  private readonly PLAYER_TIMEOUT = 50000;
  private readonly CLEANUP_INTERVAL = 60000;
  private readonly PING_INTERVAL = 5000;
  private cleanupTimer!: NodeJS.Timeout;

  constructor(
    @InjectModel(BattleRoyalePlayer.name)
    private readonly playerModel: Model<BattleRoyalePlayerDocument>,
  ) {}

  // ---------------------------------------------------------------------------
  //  Lifecycle hooks
  // ---------------------------------------------------------------------------
  onModuleInit(): void {
    this.startServer();
    this.cleanupTimer = setInterval(() => this.cleanupDisconnectedPlayers(), this.CLEANUP_INTERVAL);
  }

  onModuleDestroy(): void {
    this.wss?.close();
    clearInterval(this.cleanupTimer);
  }

  // ---------------------------------------------------------------------------
  private startServer(): void {
    this.wss = new WebSocket.Server({ port: this.WS_PORT, path: this.WS_PATH });

    this.wss.on('listening', () => {
      this.logger.log(`WebSocket server listening at ws://0.0.0.0:${this.WS_PORT}${this.WS_PATH}`);
    });

    this.wss.on('connection', (ws: WebSocket, req) => {
      // No playerId yet – wait for first message.
      ws.on('message', (data: WebSocket.RawData) => this.handleRawMessage(ws, data));

      ws.on('close', () => {
        // Find which player had this socket and treat as disconnect.
        const entry = Object.entries(this.players).find(([, info]) => info.ws === ws);
        if (entry) this.forceDisconnect(entry[0], 'socket_closed');
      });
    });

    this.wss.on('error', (err) => this.logger.error(`WebSocket server error: ${err.message}`));
  }

  // ---------------------------------------------------------------------------
  private handleRawMessage(ws: WebSocket, raw: WebSocket.RawData): void {
    try {
      const data = JSON.parse(raw.toString());
      const playerId = data.playerId;

    //   console.log("received message", JSON.stringify(data));

      // Record socket & remote info once we know the playerId
      if (playerId) {
        if (!this.players[playerId]) {
          // first time – socket is set later in handleConnect
        } else {
          this.players[playerId].ws = ws;
        }
        this.playerLastActivity[playerId] = Date.now();
      }

      if (data.type === 'ping') return this.handlePing(data, ws);

      switch (data.type) {
        case 'connect':   return this.handleConnect(data, ws);
        case 'move':      return this.handleMove(data);
        case 'flip':      return this.handleFlip(data);
        case 'rotate':    return this.handleRotate(data);
        case 'attack':    return this.handleAttack(data);
        case 'damage':    return this.handleDamage(data);
        case 'death':     return this.handleDeath(data);
        case 'disconnect':return this.handleDisconnect(data);
        case 'cash_spawn':return this.handleCashSpawn(data);
        case 'cash_collected': return this.handleCashCollected(data);
        default:
          this.logger.warn(`Unknown message type: ${data.type}`);
      }
    } catch (err) {
      this.logger.error(`Failed to parse message: ${err.message}`);
    }
  }

  // ---------------------------------------------------------------------------
  private handlePing(data: any, ws: WebSocket): void {
    // Clients only care that the connection is alive – we don’t send pong unless you need RTT.
  }

  private handleConnect(data: any, ws: WebSocket): void {
    const { playerId, roomId = null, eventId = null, username = null } = data;
    if (!this.players[playerId]) {
      const { remoteAddress: address, remotePort: port } = (ws as any)._socket;
      this.players[playerId] = {
        ws,
        address,
        port,
        roomId,
        eventId,
        username,
        position: { x: 0, y: 0, z: 0 },
        flip: { x: 1, y: 1, z: 1 },
        rotation: 0,
        isAlive: true,
        health: 20,
      };
      this.logger.log(`Player connected: ${playerId}`);

      if (eventId && roomId) this.updatePlayerInDatabase(playerId, eventId, roomId);
    }

    const existingPlayers = Object.entries(this.players)
      .filter(([, info]) => info.roomId === roomId && info.eventId === eventId)
      .map(([pid, info]) => ({
        playerId: pid,
        username: info.username,
        position: info.position,
        flip: info.flip,
        rotation: info.rotation,
        isAlive: info.isAlive,
        health: info.health,
        bot: false,
      }));

    const existingCash = Object.entries(this.cashObjects)
      .filter(([, c]) => c.roomId === roomId && c.eventId === eventId)
      .map(([cid, c]) => ({ cashId: cid, position: c.position }));

    // ACK to new player
    this.sendMessage(ws, {
      type: 'connect_ack',
      message: 'Welcome!',
      existingPlayers,
      existingCash,
      pingInterval: this.PING_INTERVAL,
      nextPingTime: Date.now() + this.PING_INTERVAL,
    });

    // Broadcast spawn to others
    this.broadcastExcept(playerId, roomId, eventId, {
      type: 'spawn',
      playerId,
      username,
      position: { x: 0, y: 0, z: 0 },
      flip: { x: 1, y: 1, z: 1 },
      rotation: 0,
      isAlive: true,
      health: 20,
      bot: false,
    });
  }

  private handleMove(data: any): void {
    const p = this.players[data.playerId];
    if (!p || !p.isAlive) return;
    p.position = data.position;
    this.broadcastExcept(data.playerId, p.roomId, p.eventId, { ...data, username: p.username, bot: p.bot, health: p.health });
  }

  private handleFlip(data: any): void {
    const p = this.players[data.playerId];
    if (!p || !p.isAlive) return;
    p.flip = data.localScale;
    this.broadcastExcept(data.playerId, p.roomId, p.eventId, { ...data, username: p.username, bot: p.bot, health: p.health });
  }

  private handleRotate(data: any): void {
    const p = this.players[data.playerId];
    if (!p || !p.isAlive) return;
    p.rotation = data.rotation;
    this.broadcastExcept(data.playerId, p.roomId, p.eventId, { ...data, username: p.username, bot: p.bot, health: p.health });
  }

  private handleAttack(data: any): void {
    const p = this.players[data.playerId];
    if (!p || !p.isAlive) return;
    this.broadcastExcept(data.playerId, p.roomId, p.eventId, { ...data, username: p.username, bot: p.bot, health: p.health });
  }

  private handleDamage(data: any): void {
    const p = this.players[data.playerId];
    if (!p || !p.isAlive) return;
    p.health = Math.max(0, p.health - data.damage);
    this.broadcastExcept(data.playerId, p.roomId, p.eventId, {
      type: 'damage',
      playerId: data.playerId,
      username: p.username,
      bot: p.bot,
      health: p.health,
      damage: data.damage,
      shooterId: data.shooterId,
      currentHealth: p.health,
    });
  }

  private handleDeath(data: any): void {
    const p = this.players[data.playerId];
    if (!p) return;
    p.isAlive = false;

    const playersLeft = Object.values(this.players).filter(pp => pp.isAlive && pp.roomId === p.roomId && pp.eventId === p.eventId).length;
    const rank = playersLeft + 1;
    this.updatePlayerDeathInDatabase(data.playerId, p.eventId!, rank);

    this.sendMessage(p.ws, { type: 'death_stats', playerId: data.playerId, rank, cashCollected: p.cashCollected || 0 });
    this.broadcastExcept(data.playerId, p.roomId, p.eventId, { type: 'death', playerId: data.playerId });
  }

  private handleDisconnect(data: any): void {
    this.forceDisconnect(data.playerId, 'client_disconnect');
  }

  private forceDisconnect(playerId: string, reason: string): void {
    const p = this.players[playerId];
    if (!p) return;
    this.sendMessage(p.ws, { type: 'disconnect', playerId, reason });
    this.broadcastExcept(playerId, p.roomId, p.eventId, { type: 'disconnect', playerId, reason });
    delete this.players[playerId];
    delete this.playerLastActivity[playerId];
  }

  private handleCashSpawn(data: any): void {
    const { cashId, position, playerId, eventId } = data;
    if (!cashId) return;
    if (!this.cashObjects[cashId]) this.cashObjects[cashId] = { position, roomId: this.players[playerId]?.roomId, eventId };
    const p = this.players[playerId];
    this.broadcastExcept(playerId, p?.roomId || null, p?.eventId || eventId, data);
  }

  private handleCashCollected(data: any): void {
    const { cashId, playerId, eventId } = data;
    if (!cashId) return;
    delete this.cashObjects[cashId];
    const p = this.players[playerId];
    if (p) {
      p.cashCollected = (p.cashCollected || 0) + 300;
    }
    this.broadcastExcept(playerId, p?.roomId || null, p?.eventId || eventId, { ...data, cashAmount: 300 });
  }

  // ---------------------------------------------------------------------------
  private broadcastExcept(exceptId: string, roomId: string | null, eventId: string | null, payload: any): void {
    for (const [pid, info] of Object.entries(this.players)) {
      if (pid === exceptId) continue;
      if (roomId && info.roomId !== roomId) continue;
      if (eventId && info.eventId !== eventId) continue;
      this.sendMessage(info.ws, payload);
    }
  }

  private sendMessage(ws: WebSocket, obj: any): void {
    if (ws.readyState === WebSocket.OPEN) ws.send(JSON.stringify(obj));
  }

  // ---------------------------------------------------------------------------
  private cleanupDisconnectedPlayers(): void {
    const now = Date.now();
    for (const [pid, last] of Object.entries(this.playerLastActivity)) {
      if (now - last > this.PLAYER_TIMEOUT) this.forceDisconnect(pid, 'inactivity_timeout');
    }
  }

  // ---------------------------------------------------------------------------
  private async updatePlayerInDatabase(playerId: string, eventId: string, roomId: string): Promise<void> {
    try {
      await this.playerModel.findOneAndUpdate({ userId: playerId, eventId }, { roomId, status: 'active', isAlive: true, position: 0 });
    } catch (e) { this.logger.error(e); }
  }

  private async updatePlayerDeathInDatabase(playerId: string, eventId: string, position: number): Promise<void> {
    if (!eventId) return;
    try {
      await this.playerModel.findOneAndUpdate({ userId: playerId, eventId }, { status: position === 1 ? 'winner' : 'eliminated', isAlive: false, position });
    } catch (e) { this.logger.error(e); }
  }
}

// -----------------------------------------------------------------------------
//  END OF FILE – register in any module like:
//  @Module({ providers: [WebSocketServerService], imports: [MongooseModule.forFeature([...])] })
// -----------------------------------------------------------------------------
