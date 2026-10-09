import { type DynamicModule, Module } from '@nestjs/common';
import { type AppConfig, loadConfig } from './core/config';
import { CoreModule } from './core/core.module';
import { HealthModule } from './core/health';

/**
 * Background worker (ADR-0005): BullMQ processors and schedulers register here from Phase 2.
 * It exposes only /healthz and /readyz.
 */
@Module({})
export class WorkerModule {
  static forRoot(config: AppConfig = loadConfig(process.env)): DynamicModule {
    return { module: WorkerModule, imports: [CoreModule.forRoot(config), HealthModule] };
  }
}
