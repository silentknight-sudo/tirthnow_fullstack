import {
  Body,
  Controller,
  Delete,
  Get,
  HttpCode,
  Param,
  ParseUUIDPipe,
  Patch,
  Post,
  Query,
  UseGuards,
} from '@nestjs/common';
import { ApiBearerAuth, ApiOkResponse, ApiOperation, ApiTags } from '@nestjs/swagger';
import { type AuthPrincipal, CurrentUser, Public } from '../../../core/auth';
import { VendorAccessGuard, VendorPermissionRequired } from '../../vendors';
import {
  CategoryResponse,
  CouponResponse,
  CreateCouponDto,
  CreateProductDto,
  PriceQuoteDto,
  PriceQuoteResponse,
  ProductQueryDto,
  ProductResponse,
  UpdateCouponDto,
  UpdateProductDto,
} from '../dto/store.dto';
import { StoreService } from '../services/store.service';

const UUID = new ParseUUIDPipe();

@ApiTags('store')
@Controller('store')
export class StoreController {
  constructor(private readonly store: StoreService) {}

  @Public()
  @Get('products')
  @ApiOperation({ summary: 'Temple Store products from approved vendors' })
  @ApiOkResponse({ type: [ProductResponse] })
  list(@Query() q: ProductQueryDto) {
    return this.store.list(q);
  }

  @Public()
  @Get('products/:id')
  @ApiOkResponse({ type: ProductResponse })
  detail(@Param('id', UUID) id: string) {
    return this.store.detail(id);
  }

  @Public()
  @Get('categories')
  @ApiOkResponse({ type: [CategoryResponse] })
  categories() {
    return this.store.categories();
  }

  @Post('quote')
  @HttpCode(200)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Price breakdown (base, coupon, GST, platform fee) for a vendor' })
  @ApiOkResponse({ type: PriceQuoteResponse })
  quote(@Body() dto: PriceQuoteDto) {
    return this.store.quote(dto);
  }
}

@ApiTags('vendor · store')
@ApiBearerAuth()
@UseGuards(VendorAccessGuard)
@VendorPermissionRequired('listings.edit')
@Controller('vendors/:vid')
export class VendorStoreController {
  constructor(private readonly store: StoreService) {}

  @Get('products')
  @VendorPermissionRequired(null)
  @ApiOkResponse({ type: [ProductResponse] })
  products(@Param('vid', UUID) vid: string) {
    return this.store.listForVendor(vid);
  }

  @Post('products')
  @ApiOkResponse({ type: ProductResponse })
  createProduct(
    @CurrentUser() u: AuthPrincipal,
    @Param('vid', UUID) vid: string,
    @Body() dto: CreateProductDto,
  ) {
    return this.store.create(u, vid, dto);
  }

  @Patch('products/:id')
  @ApiOkResponse({ type: ProductResponse })
  updateProduct(
    @CurrentUser() u: AuthPrincipal,
    @Param('vid', UUID) vid: string,
    @Param('id', UUID) id: string,
    @Body() dto: UpdateProductDto,
  ) {
    return this.store.update(u, vid, id, dto);
  }

  @Delete('products/:id')
  @HttpCode(204)
  async removeProduct(
    @CurrentUser() u: AuthPrincipal,
    @Param('vid', UUID) vid: string,
    @Param('id', UUID) id: string,
  ) {
    await this.store.remove(u, vid, id);
  }

  @Get('coupons')
  @VendorPermissionRequired(null)
  @ApiOkResponse({ type: [CouponResponse] })
  coupons(@Param('vid', UUID) vid: string) {
    return this.store.coupons(vid);
  }

  @Post('coupons')
  @ApiOkResponse({ type: CouponResponse })
  createCoupon(
    @CurrentUser() u: AuthPrincipal,
    @Param('vid', UUID) vid: string,
    @Body() dto: CreateCouponDto,
  ) {
    return this.store.createCoupon(u, vid, dto);
  }

  @Patch('coupons/:id')
  @ApiOkResponse({ type: CouponResponse })
  updateCoupon(
    @CurrentUser() u: AuthPrincipal,
    @Param('vid', UUID) vid: string,
    @Param('id', UUID) id: string,
    @Body() dto: UpdateCouponDto,
  ) {
    return this.store.updateCoupon(u, vid, id, dto);
  }
}
