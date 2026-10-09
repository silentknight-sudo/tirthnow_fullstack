import { type DynamicModule, Module } from '@nestjs/common';
import { type AppConfig, ConfigModule } from './config';
import { LoggingModule } from './logging';
import { PrismaModule } from './prisma';
import { ProvidersModule } from './providers';
import { RedisModule } from './redis';

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
        ProvidersModule,
      ],
    };
  }
}
