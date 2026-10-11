import { Global, Module } from '@nestjs/common';
import { MaintenanceProcessor } from './maintenance.processor';
import { MaintenanceRegistry } from './maintenance.registry';

@Global()
@Module({ providers: [MaintenanceRegistry, MaintenanceProcessor], exports: [MaintenanceRegistry] })
export class MaintenanceModule {}
