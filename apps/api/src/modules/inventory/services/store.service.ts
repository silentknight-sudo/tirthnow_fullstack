import { HttpStatus, Inject, Injectable } from '@nestjs/common';
import { type Coupon, type Prisma, type Product } from '@prisma/client';
import { ERROR_CODES } from '@tirth-now/shared-types';
import { AuditService } from '../../../core/audit';
import { type AuthPrincipal } from '../../../core/auth';
import { APP_CONFIG, type AppConfig } from '../../../core/config';
import { AppException } from '../../../core/http';
import { couponDiscount, displayPrice, priceBreakdown } from '../../../core/pricing';
import { PrismaService } from '../../../core/prisma';
import { FilesFacade } from '../../files';
import { VendorsFacade } from '../../vendors';
import {
  type CategoryResponse,
  type CouponResponse,
  type CreateCouponDto,
  type CreateProductDto,
  PRODUCT_CATEGORIES,
  type PriceQuoteDto,
  type PriceQuoteResponse,
  type ProductLineDto,
  type ProductQueryDto,
  type ProductResponse,
  type UpdateCouponDto,
  type UpdateProductDto,
} from '../dto/store.dto';
import { assertCanPublish } from './listing-guard';

type Tx = Prisma.TransactionClient;
type ProductWithVendor = Product & { vendor: { displayName: string } };

export interface ProductLine {
  productId: string;
  name: string;
  quantity: number;
  unitPricePaise: number;
}

const MAX_LINES = 30;

@Injectable()
export class StoreService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly vendors: VendorsFacade,
    private readonly files: FilesFacade,
    private readonly audit: AuditService,
    @Inject(APP_CONFIG) private readonly config: AppConfig,
  ) {}

  // ───────────── customer catalog ─────────────

  async list(q: ProductQueryDto): Promise<ProductResponse[]> {
    const rows = await this.prisma.product.findMany({
      where: {
        deletedAt: null,
        isPublished: true,
        vendor: { status: 'active', deletedAt: null },
        ...(q.category ? { category: q.category } : {}),
        ...(q.vendorId ? { vendorId: q.vendorId } : {}),
        ...(q.q ? { name: { contains: q.q, mode: 'insensitive' as const } } : {}),
      },
      include: { vendor: { select: { displayName: true } } },
      orderBy: [{ soldCount: 'desc' }, { createdAt: 'desc' }],
      take: 100,
    });
    return Promise.all(rows.map((p) => this.toResponse(p)));
  }

  async detail(id: string): Promise<ProductResponse> {
    const p = await this.prisma.product.findFirst({
      where: { id, deletedAt: null, isPublished: true, vendor: { status: 'active' } },
      include: { vendor: { select: { displayName: true } } },
    });
    if (!p) throw AppException.notFound('Product not found');
    return this.toResponse(p);
  }

  async categories(): Promise<CategoryResponse[]> {
    const rows = await this.prisma.product.groupBy({
      by: ['category'],
      where: { deletedAt: null, isPublished: true, vendor: { status: 'active' } },
      _count: { _all: true },
    });
    const counts = new Map(rows.map((r) => [r.category, r._count._all]));
    return PRODUCT_CATEGORIES.map((key) => ({ key, count: counts.get(key) ?? 0 })).filter(
      (c) => c.count > 0,
    );
  }

  // ───────────── vendor side ─────────────

  async listForVendor(vendorId: string): Promise<ProductResponse[]> {
    const rows = await this.prisma.product.findMany({
      where: { vendorId, deletedAt: null },
      include: { vendor: { select: { displayName: true } } },
      orderBy: { createdAt: 'desc' },
    });
    return Promise.all(rows.map((p) => this.toResponse(p)));
  }

  async create(
    actor: AuthPrincipal,
    vendorId: string,
    dto: CreateProductDto,
  ): Promise<ProductResponse> {
    await this.assertStoreVendor(vendorId);
    await assertCanPublish(this.vendors, vendorId, dto.isPublished ?? true);
    await this.assertMedia(actor, dto.mediaIds);
    const p = await this.prisma.product.create({
      data: {
        vendorId,
        cityId: dto.cityId ?? null,
        name: dto.name,
        description: dto.description ?? null,
        category: dto.category,
        unit: dto.unit ?? 'piece',
        pricePaise: dto.pricePaise,
        mrpPaise: dto.mrpPaise ?? null,
        stock: dto.stock,
        mediaIds: dto.mediaIds ?? [],
        isPublished: dto.isPublished ?? true,
      },
      include: { vendor: { select: { displayName: true } } },
    });
    await this.audit.record({
      actor,
      action: 'product.create',
      entityType: 'product',
      entityId: p.id,
      after: p,
    });
    return this.toResponse(p);
  }

  async update(
    actor: AuthPrincipal,
    vendorId: string,
    id: string,
    dto: UpdateProductDto,
  ): Promise<ProductResponse> {
    const before = await this.ownedProduct(vendorId, id);
    await assertCanPublish(this.vendors, vendorId, dto.isPublished);
    await this.assertMedia(actor, dto.mediaIds);
    const p = await this.prisma.product.update({
      where: { id },
      data: {
        name: dto.name,
        description: dto.description,
        category: dto.category,
        unit: dto.unit,
        pricePaise: dto.pricePaise,
        mrpPaise: dto.mrpPaise,
        stock: dto.stock,
        mediaIds: dto.mediaIds,
        cityId: dto.cityId,
        isPublished: dto.isPublished,
      },
      include: { vendor: { select: { displayName: true } } },
    });
    await this.audit.record({
      actor,
      action: 'product.update',
      entityType: 'product',
      entityId: id,
      before,
      after: p,
    });
    return this.toResponse(p);
  }

  async remove(actor: AuthPrincipal, vendorId: string, id: string): Promise<void> {
    await this.ownedProduct(vendorId, id);
    await this.prisma.product.update({
      where: { id },
      data: { deletedAt: new Date(), isPublished: false },
    });
    await this.audit.record({
      actor,
      action: 'product.delete',
      entityType: 'product',
      entityId: id,
    });
  }

  // ───────────── coupons ─────────────

  async coupons(vendorId: string): Promise<CouponResponse[]> {
    const rows = await this.prisma.coupon.findMany({
      where: { vendorId },
      orderBy: { createdAt: 'desc' },
    });
    return rows.map((c) => this.couponResponse(c));
  }

  async createCoupon(
    actor: AuthPrincipal,
    vendorId: string,
    dto: CreateCouponDto,
  ): Promise<CouponResponse> {
    this.assertCouponShape(dto.kind, dto.percentBps, dto.flatPaise);
    try {
      const c = await this.prisma.coupon.create({
        data: {
          vendorId,
          code: dto.code,
          kind: dto.kind,
          percentBps: dto.kind === 'percent' ? (dto.percentBps ?? 0) : 0,
          flatPaise: dto.kind === 'flat' ? (dto.flatPaise ?? 0) : 0,
          minOrderPaise: dto.minOrderPaise ?? 0,
          maxDiscountPaise: dto.maxDiscountPaise ?? null,
          startsAt: dto.startsAt ? new Date(dto.startsAt) : new Date(),
          endsAt: dto.endsAt ? new Date(dto.endsAt) : null,
          usageLimit: dto.usageLimit ?? null,
          isActive: dto.isActive ?? true,
        },
      });
      await this.audit.record({
        actor,
        action: 'coupon.create',
        entityType: 'coupon',
        entityId: c.id,
        after: c,
      });
      return this.couponResponse(c);
    } catch (err) {
      if ((err as { code?: string }).code === 'P2002')
        throw new AppException(
          ERROR_CODES.CONFLICT,
          HttpStatus.CONFLICT,
          'You already have a coupon with this code',
        );
      throw err;
    }
  }

  async updateCoupon(
    actor: AuthPrincipal,
    vendorId: string,
    id: string,
    dto: UpdateCouponDto,
  ): Promise<CouponResponse> {
    const before = await this.prisma.coupon.findFirst({ where: { id, vendorId } });
    if (!before) throw AppException.notFound('Coupon not found');
    const kind = dto.kind ?? before.kind;
    this.assertCouponShape(
      kind,
      dto.percentBps ?? before.percentBps,
      dto.flatPaise ?? before.flatPaise,
    );
    const c = await this.prisma.coupon.update({
      where: { id },
      data: {
        code: dto.code,
        kind: dto.kind,
        percentBps: dto.percentBps,
        flatPaise: dto.flatPaise,
        minOrderPaise: dto.minOrderPaise,
        maxDiscountPaise: dto.maxDiscountPaise,
        startsAt: dto.startsAt ? new Date(dto.startsAt) : undefined,
        endsAt: dto.endsAt ? new Date(dto.endsAt) : undefined,
        usageLimit: dto.usageLimit,
        isActive: dto.isActive,
      },
    });
    await this.audit.record({
      actor,
      action: 'coupon.update',
      entityType: 'coupon',
      entityId: id,
      before,
      after: c,
    });
    return this.couponResponse(c);
  }

  /** Discount for a vendor's coupon on a base amount; error text when it does not apply. */
  async couponFor(
    db: Tx | PrismaService,
    vendorId: string,
    code: string,
    basePaise: number,
  ): Promise<{ coupon: Coupon | null; discountPaise: number; error: string | null }> {
    const c = await db.coupon.findUnique({ where: { vendorId_code: { vendorId, code } } });
    if (!c) return { coupon: null, discountPaise: 0, error: 'This coupon code is not valid here' };
    const r = couponDiscount(c, basePaise, new Date());
    return r.ok
      ? { coupon: c, discountPaise: r.discountPaise, error: null }
      : { coupon: c, discountPaise: 0, error: r.reason };
  }

  /** Applies a coupon inside the order transaction; refuses if it no longer applies. */
  async redeemCoupon(tx: Tx, vendorId: string, code: string, basePaise: number): Promise<number> {
    const r = await this.couponFor(tx, vendorId, code, basePaise);
    if (!r.coupon || r.error) throw AppException.badRequest(r.error ?? 'Coupon not valid');
    const updated = await tx.coupon.updateMany({
      where: {
        id: r.coupon.id,
        ...(r.coupon.usageLimit !== null ? { usedCount: { lt: r.coupon.usageLimit } } : {}),
      },
      data: { usedCount: { increment: 1 } },
    });
    if (updated.count === 0) throw AppException.badRequest('This coupon has been fully used');
    return r.discountPaise;
  }

  async releaseCoupon(tx: Tx, vendorId: string, code: string): Promise<void> {
    await tx.coupon.updateMany({
      where: { vendorId, code, usedCount: { gt: 0 } },
      data: { usedCount: { decrement: 1 } },
    });
  }

  async quote(dto: PriceQuoteDto): Promise<PriceQuoteResponse> {
    let discount = 0;
    let error: string | null = null;
    if (dto.couponCode) {
      const r = await this.couponFor(this.prisma, dto.vendorId, dto.couponCode, dto.basePaise);
      discount = r.discountPaise;
      error = r.error;
    }
    const b = priceBreakdown(
      dto.basePaise,
      discount,
      this.config.payments.saleGstBps,
      this.config.payments.platformFeeBps,
    );
    return {
      ...b,
      couponCode: dto.couponCode && !error ? dto.couponCode : null,
      couponError: error,
    };
  }

  // ───────────── order hooks ─────────────

  /** Prices product lines for one vendor; all lines must belong to the same store. */
  async priceProducts(lines: ProductLineDto[]): Promise<{
    vendorId: string;
    cityId: string | null;
    vendorName: string;
    lines: ProductLine[];
  }> {
    if (lines.length === 0 || lines.length > MAX_LINES)
      throw AppException.badRequest('Add 1 to 30 items');
    const ids = [...new Set(lines.map((l) => l.productId))];
    const rows = await this.prisma.product.findMany({
      where: { id: { in: ids }, deletedAt: null, isPublished: true },
      include: { vendor: { select: { displayName: true, status: true, cityId: true } } },
    });
    if (rows.length !== ids.length)
      throw AppException.badRequest('Some items are no longer available');
    const vendorIds = new Set(rows.map((r) => r.vendorId));
    if (vendorIds.size !== 1) throw AppException.badRequest('Order from one store at a time');
    const first = rows[0] as (typeof rows)[number];
    if (first.vendor.status !== 'active')
      throw AppException.badRequest('This store is not taking orders');
    const byId = new Map(rows.map((r) => [r.id, r]));
    return {
      vendorId: first.vendorId,
      cityId: first.cityId ?? first.vendor.cityId,
      vendorName: first.vendor.displayName,
      lines: lines.map((l) => {
        const p = byId.get(l.productId) as Product;
        return {
          productId: p.id,
          name: p.name,
          quantity: l.quantity,
          unitPricePaise: p.pricePaise,
        };
      }),
    };
  }

  async holdStock(tx: Tx, lines: { productId: string; quantity: number }[]): Promise<void> {
    for (const l of lines) {
      const r = await tx.product.updateMany({
        where: { id: l.productId, stock: { gte: l.quantity } },
        data: { stock: { decrement: l.quantity }, soldCount: { increment: l.quantity } },
      });
      if (r.count === 0)
        throw new AppException(
          ERROR_CODES.INVENTORY_UNAVAILABLE,
          HttpStatus.CONFLICT,
          'An item just went out of stock',
        );
    }
  }

  async releaseStock(tx: Tx, lines: { productId: string; quantity: number }[]): Promise<void> {
    for (const l of lines) {
      await tx.product.updateMany({
        where: { id: l.productId },
        data: { stock: { increment: l.quantity }, soldCount: { decrement: l.quantity } },
      });
    }
  }

  // ───────────── helpers ─────────────

  private async assertStoreVendor(vendorId: string): Promise<void> {
    const v = await this.prisma.vendor.findUnique({
      where: { id: vendorId },
      select: { type: true },
    });
    if (!v || (v.type !== 'store' && v.type !== 'multi'))
      throw new AppException(
        ERROR_CODES.AUTH_FORBIDDEN,
        HttpStatus.FORBIDDEN,
        'Only Temple Store vendors can list products',
      );
  }

  private async assertMedia(actor: AuthPrincipal, ids: string[] | undefined): Promise<void> {
    for (const id of ids ?? []) {
      await this.files.requireReady(id, { ownerUserId: actor.userId, purposes: ['listing_image'] });
    }
  }

  private async ownedProduct(vendorId: string, id: string): Promise<Product> {
    const p = await this.prisma.product.findFirst({ where: { id, vendorId, deletedAt: null } });
    if (!p) throw AppException.notFound('Product not found');
    return p;
  }

  private assertCouponShape(
    kind: string,
    percentBps: number | undefined,
    flatPaise: number | undefined,
  ): void {
    if (kind === 'percent' && !percentBps) throw AppException.badRequest('Set the percent off');
    if (kind === 'flat' && !flatPaise) throw AppException.badRequest('Set the amount off');
  }

  async toResponse(p: ProductWithVendor): Promise<ProductResponse> {
    const media = await this.files.urls(p.mediaIds, 'thumb');
    return {
      id: p.id,
      vendorId: p.vendorId,
      vendorName: p.vendor.displayName,
      name: p.name,
      description: p.description,
      category: p.category,
      unit: p.unit,
      pricePaise: p.pricePaise,
      displayPricePaise: displayPrice(
        p.pricePaise,
        this.config.payments.saleGstBps,
        this.config.payments.platformFeeBps,
      ),
      mrpPaise: p.mrpPaise,
      stock: p.stock,
      imageUrls: [
        ...media,
        ...p.imageUrls.map((u) => (u.startsWith('/') ? `${this.config.publicUrl}${u}` : u)),
      ],
      isPublished: p.isPublished,
      ratingAvg: Number(p.ratingAvg),
      ratingCount: p.ratingCount,
      soldCount: p.soldCount,
    };
  }

  couponResponse(c: Coupon): CouponResponse {
    return {
      id: c.id,
      code: c.code,
      kind: c.kind,
      percentBps: c.percentBps,
      flatPaise: c.flatPaise,
      minOrderPaise: c.minOrderPaise,
      maxDiscountPaise: c.maxDiscountPaise,
      startsAt: c.startsAt.toISOString(),
      endsAt: c.endsAt?.toISOString() ?? null,
      usageLimit: c.usageLimit,
      usedCount: c.usedCount,
      isActive: c.isActive,
    };
  }
}
