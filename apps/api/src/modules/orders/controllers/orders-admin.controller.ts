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
import { ApiBearerAuth, ApiOkResponse, ApiTags } from '@nestjs/swagger';
import { type AuthPrincipal, CurrentUser, Roles } from '../../../core/auth';
import { type Page } from '../../../core/http';
import { Idempotent } from '../../../core/idempotency';
import { AdminOrderQueryDto, AdminRefundDto, OrderResponse, ReasonDto } from '../dto/orders.dto';
import { OrdersService } from '../services/orders.service';

@ApiTags('admin · orders')
@ApiBearerAuth()
@Roles('admin')
@Controller('admin/orders')
export class OrdersAdminController {
  constructor(private readonly orders: OrdersService) {}

  @Get()
  @ApiOkResponse({ type: [OrderResponse] })
  list(@Query() q: AdminOrderQueryDto): Promise<Page<OrderResponse>> {
    return this.orders.listForAdmin(q);
  }

  @Get(':id')
  @ApiOkResponse({ type: OrderResponse })
  get(@Param('id', ParseUUIDPipe) id: string): Promise<OrderResponse> {
    return this.orders.response(id);
  }

  @Post(':id/cancel')
  @HttpCode(200)
  @Idempotent('order.admin_cancel')
  cancel(
    @CurrentUser() u: AuthPrincipal,
    @Param('id', ParseUUIDPipe) id: string,
    @Body() dto: ReasonDto,
  ): Promise<OrderResponse> {
    return this.orders.adminCancel(u, id, dto.reason);
  }

  @Post(':id/complete')
  @HttpCode(200)
  complete(
    @CurrentUser() u: AuthPrincipal,
    @Param('id', ParseUUIDPipe) id: string,
  ): Promise<OrderResponse> {
    return this.orders.adminComplete(u, id);
  }

  @Post(':id/refund')
  @HttpCode(200)
  @Idempotent('order.admin_refund')
  refund(
    @CurrentUser() u: AuthPrincipal,
    @Param('id', ParseUUIDPipe) id: string,
    @Body() dto: AdminRefundDto,
    @Headers('idempotency-key') key: string,
  ): Promise<OrderResponse> {
    return this.orders.adminRefund(u, id, dto.amountPaise, dto.reason, key);
  }
}
