import { type DynamicModule, Module } from '@nestjs/common';
import { AuthCoreModule } from './core/auth';
import { type AppConfig, loadConfig } from './core/config';
import { CoreModule } from './core/core.module';
import { DevModule } from './core/dev/dev.module';
import { HealthModule } from './core/health';
import { IdempotencyModule } from './core/idempotency';
import { ThrottleModule } from './core/throttle';
import { CatalogModule } from './modules/catalog';
import { FilesModule } from './modules/files';
import { IdentityModule } from './modules/identity';
import { InventoryModule } from './modules/inventory';
import { NotificationsModule } from './modules/notifications';
import { OrdersModule } from './modules/orders';
import { PaymentsModule } from './modules/payments';
import { RealtimeModule } from './modules/realtime';
import { SafetyModule } from './modules/safety';
import { TransitModule } from './modules/transit';
import { VendorsModule } from './modules/vendors';
import { WeatherModule } from './modules/weather';

@Module({})
export class AppModule {
  static forRoot(config: AppConfig = loadConfig(process.env)): DynamicModule {
    return {
      module: AppModule,
      imports: [
        CoreModule.forRoot(config),
        // Guard order = registration order: throttle → authenticate → authorize.
        ThrottleModule,
        AuthCoreModule,
        IdempotencyModule,
        HealthModule,
        IdentityModule,
        FilesModule,
        CatalogModule,
        VendorsModule,
        InventoryModule,
        PaymentsModule,
        OrdersModule,
        NotificationsModule,
        SafetyModule,
        RealtimeModule.forRoot(config),
        WeatherModule,
        TransitModule,
        ...(config.isProduction ? [] : [DevModule]),
      ],
    };
  }
}
