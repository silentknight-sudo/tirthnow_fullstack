import { type DynamicModule, Module } from '@nestjs/common';
import { type AppConfig } from '../../core/config';
import { CatalogModule } from '../catalog';
import { OrdersModule } from '../orders';
import { SafetyModule } from '../safety';
import { VendorsModule } from '../vendors';
import { RealtimeListener } from './listeners/realtime.listener';
import { RealtimeGateway } from './realtime.gateway';
import { RealtimePublisher } from './realtime.publisher';
import { RoomAccessService } from './room-access.service';

@Module({})
export class RealtimeModule {
  /** The worker publishes through Redis but serves no sockets, so it gets no gateway. */
  static forRoot(config: AppConfig): DynamicModule {
    return {
      module: RealtimeModule,
      imports: [CatalogModule, OrdersModule, VendorsModule, SafetyModule],
      providers: [
        RealtimePublisher,
        RealtimeListener,
        ...(config.processRole === 'worker' ? [] : [RoomAccessService, RealtimeGateway]),
      ],
      exports: [RealtimePublisher],
    };
  }
}
