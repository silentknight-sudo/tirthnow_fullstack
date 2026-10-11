import { Module } from '@nestjs/common';
import { AiModule } from '../ai';
import { CatalogModule } from '../catalog';
import { IdentityModule } from '../identity';
import { NotificationsModule } from '../notifications';
import { OrdersModule } from '../orders';
import { PaymentsModule } from '../payments';
import { ReelsModule } from '../reels';
import { SafetyModule } from '../safety';
import { VendorsModule } from '../vendors';
import { AdminController } from './controllers/admin.controller';
import { KpiService } from './services/kpi.service';

/** Orchestration only: owns audit_logs and app_config, everything else goes through facades. */
@Module({
  imports: [
    IdentityModule,
    CatalogModule,
    OrdersModule,
    PaymentsModule,
    VendorsModule,
    SafetyModule,
    ReelsModule,
    AiModule,
    NotificationsModule,
  ],
  controllers: [AdminController],
  providers: [KpiService],
})
export class AdminModule {}
