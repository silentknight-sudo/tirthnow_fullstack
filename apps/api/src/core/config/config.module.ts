import { type DynamicModule, Global, Module } from '@nestjs/common';
import { APP_CONFIG, type AppConfig, loadConfig } from './app-config';

@Global()
@Module({})
export class ConfigModule {
  /** Pass a config to override env (tests); otherwise process.env is validated. */
  static forRoot(config?: AppConfig): DynamicModule {
    return {
      module: ConfigModule,
      providers: [{ provide: APP_CONFIG, useFactory: () => config ?? loadConfig(process.env) }],
      exports: [APP_CONFIG],
    };
  }
}
