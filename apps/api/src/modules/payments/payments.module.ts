import { Module } from '@nestjs/common';
import { IdentityModule } from '../identity';
import { VendorsModule } from '../vendors';
import { PaymentsAdminController } from './controllers/payments-admin.controller';
import { VendorFinanceController } from './controllers/vendor-finance.controller';
import { WebhooksController } from './controllers/webhooks.controller';
import { PaymentsFacade } from './payments.facade';
import { PaymentsProcessor } from './processors/payments.processor';
import { PayoutsProcessor } from './processors/payouts.processor';
import { CommissionService } from './services/commission.service';
import { LedgerService } from './services/ledger.service';
import { PaymentsService } from './services/payments.service';
import { PayoutsService } from './services/payouts.service';
import { StatementsService } from './services/statements.service';

@Module({
  imports: [VendorsModule, IdentityModule],
  controllers: [WebhooksController, PaymentsAdminController, VendorFinanceController],
  providers: [
    PaymentsService,
    LedgerService,
    CommissionService,
    PayoutsService,
    StatementsService,
    PaymentsProcessor,
    PayoutsProcessor,
    PaymentsFacade,
  ],
  exports: [PaymentsFacade],
})
export class PaymentsModule {}
