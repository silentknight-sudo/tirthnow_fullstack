import { Module } from '@nestjs/common';
import { InventoryModule } from '../inventory';
import { PaymentsModule } from '../payments';
import { VendorsModule } from '../vendors';
import { OrdersAdminController } from './controllers/orders-admin.controller';
import { OrdersController } from './controllers/orders.controller';
import { VendorOrdersController } from './controllers/vendor-orders.controller';
import { PaymentListener } from './listeners/payment.listener';
import { CabTrackingService } from './services/cab-tracking.service';
import { OrdersFacade } from './orders.facade';
import { OrdersProcessor } from './processors/orders.processor';
import { OrderTransitionService } from './services/order-transition.service';
import { OrdersService } from './services/orders.service';

@Module({
  imports: [InventoryModule, PaymentsModule, VendorsModule],
  controllers: [OrdersController, VendorOrdersController, OrdersAdminController],
  providers: [
    CabTrackingService,
    OrdersService,
    OrderTransitionService,
    PaymentListener,
    OrdersProcessor,
    OrdersFacade,
  ],
  exports: [OrdersFacade],
})
export class OrdersModule {}
