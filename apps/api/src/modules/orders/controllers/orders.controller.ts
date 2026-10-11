import {
  Body,
  Controller,
  Get,
  Headers,
  HttpCode,
  Param,
  ParseUUIDPipe,
  Post,
  Query,
} from '@nestjs/common';
import {
  ApiBearerAuth,
  ApiCreatedResponse,
  ApiOkResponse,
  ApiOperation,
  ApiTags,
} from '@nestjs/swagger';
import { type AuthPrincipal, CurrentUser, NoGuests } from '../../../core/auth';
import { type Page } from '../../../core/http';
import { Idempotent } from '../../../core/idempotency';
import {
  CancellationPreviewResponse,
  CancelOrderDto,
  CreateOrderDto,
  CreateOrderResponse,
  OrderQueryDto,
  OrderResponse,
  PaymentIntentResponse,
  VerifyPaymentDto,
} from '../dto/orders.dto';
import { OrdersService } from '../services/orders.service';

@ApiTags('orders')
@ApiBearerAuth()
@NoGuests()
@Controller('orders')
export class OrdersController {
  constructor(private readonly orders: OrdersService) {}

  @Post()
  @Idempotent('order.create')
  @ApiOperation({
    summary:
      'Book a hotel, cab, food order or experience; holds inventory and returns a payment intent',
  })
  @ApiCreatedResponse({ type: CreateOrderResponse })
  create(
    @CurrentUser() user: AuthPrincipal,
    @Body() dto: CreateOrderDto,
    @Headers('idempotency-key') key?: string,
  ): Promise<CreateOrderResponse> {
    return this.orders.create(user, dto, key);
  }

  @Get()
  @ApiOkResponse({ type: [OrderResponse] })
  list(
    @CurrentUser() user: AuthPrincipal,
    @Query() q: OrderQueryDto,
  ): Promise<Page<OrderResponse>> {
    return this.orders.listMine(user, q);
  }

  @Get(':id')
  @ApiOkResponse({ type: OrderResponse })
  get(
    @CurrentUser() user: AuthPrincipal,
    @Param('id', ParseUUIDPipe) id: string,
  ): Promise<OrderResponse> {
    return this.orders.getMine(user, id);
  }

  @Post(':id/pay')
  @HttpCode(200)
  @ApiOperation({ summary: 'Get the payment intent again (retry after a failed attempt)' })
  @ApiOkResponse({ type: PaymentIntentResponse })
  pay(
    @CurrentUser() user: AuthPrincipal,
    @Param('id', ParseUUIDPipe) id: string,
  ): Promise<PaymentIntentResponse> {
    return this.orders.payAgain(user, id);
  }

  @Post(':id/payments/verify')
  @HttpCode(200)
  @Idempotent('payment.verify')
  @ApiOperation({
    summary: 'Verify the checkout signature; the order confirms once the payment is captured',
  })
  @ApiOkResponse({ type: OrderResponse })
  verify(
    @CurrentUser() user: AuthPrincipal,
    @Param('id', ParseUUIDPipe) id: string,
    @Body() dto: VerifyPaymentDto,
  ): Promise<OrderResponse> {
    return this.orders.verifyPayment(user, id, dto);
  }

  @Get(':id/cancellation')
  @ApiOperation({ summary: 'What cancelling now would refund' })
  @ApiOkResponse({ type: CancellationPreviewResponse })
  preview(
    @CurrentUser() user: AuthPrincipal,
    @Param('id', ParseUUIDPipe) id: string,
  ): Promise<CancellationPreviewResponse> {
    return this.orders.previewCancellation(user, id);
  }

  @Post(':id/cancel')
  @HttpCode(200)
  @Idempotent('order.cancel')
  @ApiOkResponse({ type: OrderResponse })
  cancel(
    @CurrentUser() user: AuthPrincipal,
    @Param('id', ParseUUIDPipe) id: string,
    @Body() dto: CancelOrderDto,
  ): Promise<OrderResponse> {
    return this.orders.cancelMine(user, id, dto);
  }
}
