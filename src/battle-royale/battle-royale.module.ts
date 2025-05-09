import { Module, forwardRef } from '@nestjs/common';
import { MongooseModule } from '@nestjs/mongoose';
import { ConfigModule } from '@nestjs/config';
import { BattleRoyaleController } from './battle-royale.controller';
import { BattleRoyaleService } from './services/battle-royale.service';
import { UdpServerService } from './services/udp-server.service';
import { BattleRoyaleEvent, BattleRoyaleEventSchema } from './schemas/battle-royale-event.schema';
import { BattleRoyalePlayer, BattleRoyalePlayerSchema } from './schemas/battle-royale-player.schema';
import { UserModule } from '../user/user.module';
import { WebSocketServerService } from './services/websocket-server.service';

@Module({
  imports: [
    ConfigModule,
    forwardRef(() => UserModule),
    MongooseModule.forFeature([
      { name: BattleRoyaleEvent.name, schema: BattleRoyaleEventSchema },
      { name: BattleRoyalePlayer.name, schema: BattleRoyalePlayerSchema },
    ]),
  ],
  controllers: [BattleRoyaleController],
  providers: [BattleRoyaleService, UdpServerService, WebSocketServerService],
  exports: [BattleRoyaleService],
})
export class BattleRoyaleModule {} 