import { Module } from '@nestjs/common';
import { APP_CONFIG, type AppConfig } from '../../config';
import { MockPaymentAdapter } from './mock.adapter';
import { PAYMENT_PROVIDER } from './payment.provider';
import { RazorpayAdapter } from './razorpay.adapter';

@Module({
  providers: [
    MockPaymentAdapter,
    {
      provide: PAYMENT_PROVIDER,
      inject: [APP_CONFIG, MockPaymentAdapter],
      useFactory: (config: AppConfig, mock: MockPaymentAdapter) =>
        config.payments.provider === 'razorpay' ? new RazorpayAdapter(config) : mock,
    },
  ],
  exports: [PAYMENT_PROVIDER, MockPaymentAdapter],
})
export class PaymentModule {}
