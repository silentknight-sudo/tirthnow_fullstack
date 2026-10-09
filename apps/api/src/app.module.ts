import { type DynamicModule, Module } from '@nestjs/common';
import { AuthCoreModule } from './core/auth';
import { type AppConfig, loadConfig } from './core/config';
import { CoreModule } from './core/core.module';
import { DevModule } from './core/dev/dev.module';
import { HealthModule } from './core/health';
import { ThrottleModule } from './core/throttle';
import { IdentityModule } from './modules/identity';

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
        HealthModule,
        IdentityModule,
        ...(config.isProduction ? [] : [DevModule]),
      ],
    };
  }
}
