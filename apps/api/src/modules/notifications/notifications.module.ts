import { Module } from '@nestjs/common';
import { CatalogModule } from '../catalog';
import { IdentityModule } from '../identity';
import { OrdersModule } from '../orders';
import { VendorsModule } from '../vendors';
import { DomainNotificationsListener } from './listeners/domain-notifications.listener';
import { NotificationsController } from './notifications.controller';
import { NotificationsFacade } from './notifications.facade';
import { NotificationsProcessor } from './processors/notifications.processor';
import { AartiRemindersService } from './services/aarti-reminders.service';
import { NotificationSender } from './services/notification-sender.service';
import { NotificationsService } from './services/notifications.service';
import { TemplatesService } from './services/templates.service';

@Module({
  imports: [IdentityModule, CatalogModule, OrdersModule, VendorsModule],
  controllers: [NotificationsController],
  providers: [
    TemplatesService,
    NotificationsService,
    NotificationSender,
    AartiRemindersService,
    DomainNotificationsListener,
    NotificationsProcessor,
    NotificationsFacade,
  ],
  exports: [NotificationsFacade, TemplatesService],
})
export class NotificationsModule {}
