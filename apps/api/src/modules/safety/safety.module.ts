import { Module } from '@nestjs/common';
import { CatalogModule } from '../catalog';
import { IdentityModule } from '../identity';
import { NotificationsModule } from '../notifications';
import { SafetyAdminController } from './controllers/safety-admin.controller';
import { SafetyController } from './controllers/safety.controller';
import { SosShareController } from './controllers/sos-share.controller';
import { SosProcessor } from './processors/sos.processor';
import { SafetyFacade } from './safety.facade';
import { SafetyService } from './services/safety.service';
import { SosDispatchService } from './services/sos-dispatch.service';
import { SosShareService } from './services/sos-share.service';

@Module({
  imports: [IdentityModule, CatalogModule, NotificationsModule],
  controllers: [SafetyController, SosShareController, SafetyAdminController],
  providers: [SafetyService, SosDispatchService, SosShareService, SosProcessor, SafetyFacade],
  exports: [SafetyFacade],
})
export class SafetyModule {}
