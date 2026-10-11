import { type DynamicModule, Module } from '@nestjs/common';
import { EventEmitterModule } from '@nestjs/event-emitter';
import { AuditModule } from './audit';
import { CacheModule } from './cache';
import { type AppConfig, ConfigModule } from './config';
import { LoggingModule } from './logging';
import { MaintenanceModule } from './maintenance';
import { PrismaModule } from './prisma';
import { ProvidersModule } from './providers';
import { QueueModule } from './queue';
import { RedisModule } from './redis';
import { SettingsModule } from './settings';

/** Infrastructure shared by the HTTP API and the worker. */
@Module({})
export class CoreModule {
  static forRoot(config?: AppConfig): DynamicModule {
    return {
      module: CoreModule,
      imports: [
        ConfigModule.forRoot(config),
        LoggingModule,
        PrismaModule,
        RedisModule,
        CacheModule,
        QueueModule,
        AuditModule,
        MaintenanceModule,
        SettingsModule,
        EventEmitterModule.forRoot({ wildcard: false, ignoreErrors: false }),
        ProvidersModule,
      ],
    };
  }
}
