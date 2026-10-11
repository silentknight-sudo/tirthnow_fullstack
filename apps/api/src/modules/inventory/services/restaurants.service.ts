import { HttpStatus, Injectable } from '@nestjs/common';
import { type MenuItem, type Prisma, type Restaurant } from '@prisma/client';
import { ERROR_CODES, type Lang } from '@tirth-now/shared-types';
import { AuditService } from '../../../core/audit';
import { type AuthPrincipal } from '../../../core/auth';
import { boundingBox, withinRadius } from '../../../core/geo';
import { AppException, definedFields } from '../../../core/http';
import { i18nJson, t } from '../../../core/i18n';
import { PrismaService } from '../../../core/prisma';
import { CatalogFacade } from '../../catalog';
import { FilesFacade } from '../../files';
import { VendorsFacade } from '../../vendors';
import {
  type CreateMenuItemDto,
  type CreateRestaurantDto,
  type MenuItemResponse,
  type RestaurantQueryDto,
  type RestaurantResponse,
  type UpdateMenuItemDto,
  type UpdateRestaurantDto,
} from '../dto/food.dto';
import { assertCanPublish } from './listing-guard';
import { isOpenAt } from './opening-hours';

export interface FoodLine {
  menuItemId: string;
  name: string;
  quantity: number;
  unitPricePaise: number;
  totalPaise: number;
}

const MAX_LINES = 30;
const MAX_QTY = 20;

@Injectable()
export class RestaurantsService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly vendors: VendorsFacade,
    private readonly catalog: CatalogFacade,
    private readonly files: FilesFacade,
    private readonly audit: AuditService,
  ) {}

  // ───────────── vendor side ─────────────

  async listForVendor(vendorId: string): Promise<RestaurantResponse[]> {
    const rows = await this.prisma.restaurant.findMany({
      where: { vendorId, deletedAt: null },
      include: { menuItems: { where: { deletedAt: null }, include: { media: true } } },
      orderBy: { createdAt: 'asc' },
    });
    return Promise.all(rows.map((r) => this.toResponse(r, 'en', r.menuItems)));
  }

  async create(
    actor: AuthPrincipal,
    vendorId: string,
    dto: CreateRestaurantDto,
  ): Promise<RestaurantResponse> {
    await assertCanPublish(this.vendors, vendorId, dto.isPublished);
    const r = await this.prisma.restaurant.create({
      data: {
        vendorId,
        cityId: dto.cityId,
        nameI18n: i18nJson(dto.name),
        lat: dto.lat,
        lng: dto.lng,
        address: dto.address ?? null,
        isPureVeg: dto.isPureVeg ?? true,
        isSatvik: dto.isSatvik ?? false,
        fssaiNo: dto.fssaiNo ?? null,
        openingHours: (dto.openingHours ?? {}) as Prisma.InputJsonObject,
        externalLinks: definedFields(dto.externalLinks),
        acceptsOrders: dto.acceptsOrders ?? false,
        isPublished: dto.isPublished ?? false,
      },
    });
    await this.audit.record({
      actor,
      action: 'restaurant.create',
      entityType: 'restaurant',
      entityId: r.id,
      after: r,
    });
    return this.toResponse(r, 'en', []);
  }

  async update(
    actor: AuthPrincipal,
    vendorId: string,
    id: string,
    dto: UpdateRestaurantDto,
  ): Promise<RestaurantResponse> {
    const before = await this.owned(vendorId, id);
    await assertCanPublish(this.vendors, vendorId, dto.isPublished);
    const r = await this.prisma.restaurant.update({
      where: { id },
      data: {
        cityId: dto.cityId,
        nameI18n: dto.name ? i18nJson(dto.name) : undefined,
        lat: dto.lat,
        lng: dto.lng,
        address: dto.address,
        isPureVeg: dto.isPureVeg,
        isSatvik: dto.isSatvik,
        fssaiNo: dto.fssaiNo,
        openingHours: dto.openingHours as Prisma.InputJsonObject | undefined,
        externalLinks: dto.externalLinks ? definedFields(dto.externalLinks) : undefined,
        acceptsOrders: dto.acceptsOrders,
        isPublished: dto.isPublished,
      },
    });
    await this.audit.record({
      actor,
      action: 'restaurant.update',
      entityType: 'restaurant',
      entityId: id,
      before,
      after: dto,
    });
    return this.toResponse(r, 'en', []);
  }

  async remove(actor: AuthPrincipal, vendorId: string, id: string): Promise<void> {
    await this.owned(vendorId, id);
    await this.prisma.restaurant.update({
      where: { id },
      data: { deletedAt: new Date(), isPublished: false },
    });
    await this.audit.record({
      actor,
      action: 'restaurant.delete',
      entityType: 'restaurant',
      entityId: id,
    });
  }

  async createMenuItem(
    actor: AuthPrincipal,
    vendorId: string,
    restaurantId: string,
    dto: CreateMenuItemDto,
  ): Promise<MenuItemResponse> {
    await this.owned(vendorId, restaurantId);
    if (dto.mediaId) await this.files.requireReady(dto.mediaId, { kinds: ['image'] });
    const item = await this.prisma.menuItem.create({
      data: {
        restaurantId,
        nameI18n: i18nJson(dto.name),
        category: dto.category,
        pricePaise: dto.pricePaise,
        isAvailable: dto.isAvailable ?? true,
        isJain: dto.isJain ?? false,
        mediaId: dto.mediaId ?? null,
      },
      include: { media: true },
    });
    await this.audit.record({
      actor,
      action: 'menu_item.create',
      entityType: 'menu_item',
      entityId: item.id,
      after: item,
    });
    return this.menuResponse(item, 'en');
  }

  async updateMenuItem(
    actor: AuthPrincipal,
    vendorId: string,
    itemId: string,
    dto: UpdateMenuItemDto,
  ): Promise<MenuItemResponse> {
    const before = await this.prisma.menuItem.findFirst({
      where: { id: itemId, deletedAt: null, restaurant: { vendorId, deletedAt: null } },
    });
    if (!before) throw AppException.notFound('Menu item not found');
    if (dto.mediaId) await this.files.requireReady(dto.mediaId, { kinds: ['image'] });
    const item = await this.prisma.menuItem.update({
      where: { id: itemId },
      data: {
        nameI18n: dto.name ? i18nJson(dto.name) : undefined,
        category: dto.category,
        pricePaise: dto.pricePaise,
        isAvailable: dto.isAvailable,
        isJain: dto.isJain,
        mediaId: dto.mediaId,
      },
      include: { media: true },
    });
    await this.audit.record({
      actor,
      action: 'menu_item.update',
      entityType: 'menu_item',
      entityId: itemId,
      before,
      after: dto,
    });
    return this.menuResponse(item, 'en');
  }

  async removeMenuItem(actor: AuthPrincipal, vendorId: string, itemId: string): Promise<void> {
    const res = await this.prisma.menuItem.updateMany({
      where: { id: itemId, deletedAt: null, restaurant: { vendorId } },
      data: { deletedAt: new Date() },
    });
    if (res.count === 0) throw AppException.notFound('Menu item not found');
    await this.audit.record({
      actor,
      action: 'menu_item.delete',
      entityType: 'menu_item',
      entityId: itemId,
    });
  }

  private async owned(vendorId: string, id: string): Promise<Restaurant> {
    const r = await this.prisma.restaurant.findFirst({ where: { id, vendorId, deletedAt: null } });
    if (!r) throw AppException.notFound('Restaurant not found');
    return r;
  }

  // ───────────── public side ─────────────

  async search(q: RestaurantQueryDto, lang: Lang): Promise<RestaurantResponse[]> {
    const cityId = q.city ? await this.catalog.cityIdBySlug(q.city) : undefined;
    const center = q.lat !== undefined && q.lng !== undefined ? { lat: q.lat, lng: q.lng } : null;
    const radius = q.radiusKm ?? 5;
    const rows = await this.prisma.restaurant.findMany({
      where: {
        deletedAt: null,
        isPublished: true,
        vendorId: { in: await this.vendors.activeVendorIds() },
        ...(cityId ? { cityId } : {}),
        ...(q.veg !== undefined ? { isPureVeg: q.veg } : {}),
        ...(q.satvik !== undefined ? { isSatvik: q.satvik } : {}),
        ...(center ? boundingBox(center, radius) : {}),
      },
      take: 200,
    });
    const ordered = center ? withinRadius(rows, center, radius) : rows;
    return Promise.all(ordered.map((r) => this.toResponse(r, lang, null)));
  }

  async detail(id: string, lang: Lang): Promise<RestaurantResponse> {
    const r = await this.prisma.restaurant.findFirst({
      where: {
        id,
        deletedAt: null,
        isPublished: true,
        vendorId: { in: await this.vendors.activeVendorIds() },
      },
      include: {
        menuItems: {
          where: { deletedAt: null },
          include: { media: true },
          orderBy: [{ category: 'asc' }, { pricePaise: 'asc' }],
        },
      },
    });
    if (!r) throw AppException.notFound('Restaurant not found');
    return this.toResponse(r, lang, r.menuItems);
  }

  /** Server-side pricing for a food order; rejects closed restaurants and unavailable items. */
  async priceOrder(
    restaurantId: string,
    items: { menuItemId: string; quantity: number }[],
    at = new Date(),
  ): Promise<{ restaurant: Restaurant; lines: FoodLine[]; subtotalPaise: number }> {
    if (items.length === 0 || items.length > MAX_LINES)
      throw AppException.badRequest(`Order between 1 and ${MAX_LINES} items`);
    const restaurant = await this.prisma.restaurant.findFirst({
      where: {
        id: restaurantId,
        deletedAt: null,
        isPublished: true,
        vendorId: { in: await this.vendors.activeVendorIds() },
      },
    });
    if (!restaurant) throw AppException.notFound('Restaurant not found');
    if (!restaurant.acceptsOrders)
      throw unavailable('This restaurant does not take orders in the app; use the delivery links');
    if (!isOpenAt(restaurant.openingHours, at))
      throw unavailable('The restaurant is closed right now');
    const ids = [...new Set(items.map((i) => i.menuItemId))];
    const menu = await this.prisma.menuItem.findMany({
      where: { id: { in: ids }, restaurantId, deletedAt: null },
    });
    const byId = new Map(menu.map((m) => [m.id, m]));
    const lines = items.map((i) => {
      const m = byId.get(i.menuItemId);
      if (!m) throw AppException.badRequest(`Menu item ${i.menuItemId} is not on this menu`);
      if (!m.isAvailable) throw unavailable(`${t(m.nameI18n, 'en')} is not available right now`);
      if (!Number.isInteger(i.quantity) || i.quantity < 1 || i.quantity > MAX_QTY)
        throw AppException.badRequest(`Quantity must be 1-${MAX_QTY}`);
      return {
        menuItemId: m.id,
        name: t(m.nameI18n, 'en'),
        quantity: i.quantity,
        unitPricePaise: m.pricePaise,
        totalPaise: m.pricePaise * i.quantity,
      };
    });
    return { restaurant, lines, subtotalPaise: lines.reduce((s, l) => s + l.totalPaise, 0) };
  }

  private async toResponse(
    r: Restaurant,
    lang: Lang,
    menu: (MenuItem & { media: Parameters<FilesFacade['url']>[0] | null })[] | null,
  ): Promise<RestaurantResponse> {
    return {
      id: r.id,
      vendorId: r.vendorId,
      cityId: r.cityId,
      name: t(r.nameI18n, lang),
      lat: r.lat,
      lng: r.lng,
      address: r.address,
      isPureVeg: r.isPureVeg,
      isSatvik: r.isSatvik,
      openingHours: r.openingHours,
      externalLinks:
        typeof r.externalLinks === 'object' &&
        r.externalLinks !== null &&
        !Array.isArray(r.externalLinks)
          ? r.externalLinks
          : {},
      acceptsOrders: r.acceptsOrders,
      isPublished: r.isPublished,
      ...('distanceKm' in r
        ? { distanceKm: (r as Restaurant & { distanceKm: number }).distanceKm }
        : {}),
      ...(menu ? { menu: await Promise.all(menu.map((m) => this.menuResponse(m, lang))) } : {}),
    };
  }

  private async menuResponse(
    m: MenuItem & { media: Parameters<FilesFacade['url']>[0] | null },
    lang: Lang,
  ): Promise<MenuItemResponse> {
    return {
      id: m.id,
      name: t(m.nameI18n, lang),
      category: m.category,
      pricePaise: m.pricePaise,
      isAvailable: m.isAvailable,
      isJain: m.isJain,
      imageUrl:
        m.media && m.media.status === 'ready' ? await this.files.url(m.media, 'thumb') : null,
    };
  }
}

const unavailable = (msg: string) =>
  new AppException(ERROR_CODES.INVENTORY_UNAVAILABLE, HttpStatus.CONFLICT, msg);
