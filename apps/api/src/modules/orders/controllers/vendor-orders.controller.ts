import {
  Body,
  Controller,
  Get,
  HttpCode,
  Param,
  ParseUUIDPipe,
  Post,
  Query,
  UseGuards,
} from '@nestjs/common';
import { ApiBearerAuth, ApiOkResponse, ApiTags } from '@nestjs/swagger';
import { type AuthPrincipal, CurrentUser } from '../../../core/auth';
import { type Page } from '../../../core/http';
import { Idempotent } from '../../../core/idempotency';
import { VendorAccessGuard, VendorPermissionRequired } from '../../vendors';
import { CabLocationDto, OrderQueryDto, OrderResponse, ReasonDto } from '../dto/orders.dto';
import { type CabLocationEvent } from '../events';
import { CabTrackingService } from '../services/cab-tracking.service';
import { OrdersService } from '../services/orders.service';

const UUID = new ParseUUIDPipe();

@ApiTags('vendor · orders')
@ApiBearerAuth()
@UseGuards(VendorAccessGuard)
@VendorPermissionRequired('orders.manage')
@Controller('vendors/:vid/orders')
export class VendorOrdersController {
  constructor(
    private readonly orders: OrdersService,
    private readonly tracking: CabTrackingService,
  ) {}

  @Post(':id/location')
  @HttpCode(200)
  location(
    @Param('vid', UUID) vid: string,
    @Param('id', UUID) id: string,
    @Body() dto: CabLocationDto,
  ): Promise<CabLocationEvent> {
    return this.tracking.update(vid, id, dto);
  }

  @Get()
  @ApiOkResponse({ type: [OrderResponse] })
  list(@Param('vid', UUID) vid: string, @Query() q: OrderQueryDto): Promise<Page<OrderResponse>> {
    return this.orders.listForVendor(vid, q);
  }

  @Get(':id')
  @ApiOkResponse({ type: OrderResponse })
  get(@Param('vid', UUID) vid: string, @Param('id', UUID) id: string): Promise<OrderResponse> {
    return this.orders.getForVendor(vid, id);
  }

  @Post(':id/accept')
  @HttpCode(200)
  accept(
    @CurrentUser() u: AuthPrincipal,
    @Param('vid', UUID) vid: string,
    @Param('id', UUID) id: string,
  ): Promise<OrderResponse> {
    return this.orders.vendorAction(u, vid, id, 'accept');
  }

  @Post(':id/reject')
  @HttpCode(200)
  @Idempotent('order.vendor_reject')
  reject(
    @CurrentUser() u: AuthPrincipal,
    @Param('vid', UUID) vid: string,
    @Param('id', UUID) id: string,
    @Body() dto: ReasonDto,
  ): Promise<OrderResponse> {
    return this.orders.vendorAction(u, vid, id, 'reject', dto.reason);
  }

  @Post(':id/start')
  @HttpCode(200)
  start(
    @CurrentUser() u: AuthPrincipal,
    @Param('vid', UUID) vid: string,
    @Param('id', UUID) id: string,
  ): Promise<OrderResponse> {
    return this.orders.vendorAction(u, vid, id, 'start');
  }

  @Post(':id/complete')
  @HttpCode(200)
  complete(
    @CurrentUser() u: AuthPrincipal,
    @Param('vid', UUID) vid: string,
    @Param('id', UUID) id: string,
  ): Promise<OrderResponse> {
    return this.orders.vendorAction(u, vid, id, 'complete');
  }

  @Post(':id/cancel')
  @HttpCode(200)
  @Idempotent('order.vendor_cancel')
  cancel(
    @CurrentUser() u: AuthPrincipal,
    @Param('vid', UUID) vid: string,
    @Param('id', UUID) id: string,
    @Body() dto: ReasonDto,
  ): Promise<OrderResponse> {
    return this.orders.vendorAction(u, vid, id, 'cancel', dto.reason);
  }
}
