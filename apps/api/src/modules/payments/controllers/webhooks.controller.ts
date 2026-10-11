import { Body, Controller, Headers, HttpCode, Inject, Param, Post, Req } from '@nestjs/common';
import { ApiExcludeEndpoint, ApiOperation, ApiTags } from '@nestjs/swagger';
import { SkipThrottle } from '@nestjs/throttler';
import { type Request } from 'express';
import { Public } from '../../../core/auth';
import { APP_CONFIG, type AppConfig } from '../../../core/config';
import { AppException } from '../../../core/http';
import { MockPaymentAdapter } from '../../../core/providers';
import { MockCheckoutDto } from '../dto/payments.dto';
import { PaymentsService } from '../services/payments.service';

type RawRequest = Request & { rawBody?: Buffer };

function headerMap(req: Request): Record<string, string | undefined> {
  const out: Record<string, string | undefined> = {};
  for (const [k, v] of Object.entries(req.headers))
    out[k.toLowerCase()] = Array.isArray(v) ? v[0] : v;
  return out;
}

@ApiTags('payments')
@Public()
@SkipThrottle()
@Controller()
export class WebhooksController {
  constructor(
    private readonly payments: PaymentsService,
    private readonly mock: MockPaymentAdapter,
    @Inject(APP_CONFIG) private readonly config: AppConfig,
  ) {}

  @Post('payments/webhooks/:provider')
  @HttpCode(200)
  @ApiOperation({
    summary: 'Gateway webhooks (razorpay | mock), verified with the raw body signature',
  })
  webhook(
    @Param('provider') provider: string,
    @Req() req: RawRequest,
    @Headers('x-razorpay-signature') rzpSig?: string,
    @Headers('x-mock-signature') mockSig?: string,
  ) {
    if (!req.rawBody) throw AppException.badRequest('Raw body unavailable');
    const signature = provider === 'razorpay' ? rzpSig : mockSig;
    if (!signature) throw AppException.unauthorized();
    return this.payments.handleWebhook(provider, req.rawBody, signature, headerMap(req));
  }

  /** Local stand-in for the checkout SDK (PAYMENT_PROVIDER=mock, non-production only). */
  @Post('dev/payments/checkout')
  @HttpCode(200)
  @ApiExcludeEndpoint()
  async mockCheckout(@Body() dto: MockCheckoutDto) {
    if (this.config.isProduction || this.config.payments.provider !== 'mock')
      throw AppException.notFound();
    const result = this.mock.checkout(dto.providerOrderId, dto.outcome ?? 'success');
    if (dto.deliverWebhook !== false) {
      const { body, signature } = this.mock.webhook(
        this.mock.paymentEvent(result.providerPaymentId),
      );
      await this.payments.handleWebhook('mock', body, signature, {});
    }
    return result;
  }
}
