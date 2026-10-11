import { HttpStatus, Injectable } from '@nestjs/common';
import { EventEmitter2 } from '@nestjs/event-emitter';
import { type VendorStatus } from '@prisma/client';
import { ERROR_CODES } from '@tirth-now/shared-types';
import { AuditService } from '../../../core/audit';
import { type AuthPrincipal } from '../../../core/auth';
import { CacheService } from '../../../core/cache';
import {
  AppException,
  afterCursor,
  NEWEST_FIRST,
  type Page,
  pageSize,
  toPage,
} from '../../../core/http';
import { PrismaService } from '../../../core/prisma';
import {
  type AdminVendorQueryDto,
  type ReviewKycDto,
  type VendorResponse,
} from '../dto/vendors.dto';
import { VENDOR_EVENTS, type VendorStatusEvent } from '../events';
import { requiredDocuments } from './kyc-rules';
import { VendorsService } from './vendors.service';

export const ACTIVE_VENDORS_CACHE_KEY = 'vendors:active-ids';

const invalidState = (msg: string) =>
  new AppException(ERROR_CODES.VENDOR_INVALID_STATE, HttpStatus.CONFLICT, msg);

@Injectable()
export class VendorAdminService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly vendors: VendorsService,
    private readonly audit: AuditService,
    private readonly cache: CacheService,
    private readonly events: EventEmitter2,
  ) {}

  async list(_admin: AuthPrincipal, q: AdminVendorQueryDto): Promise<Page<VendorResponse>> {
    const limit = pageSize(q.limit);
    const rows = await this.prisma.vendor.findMany({
      where: {
        deletedAt: null,
        ...(q.status ? { status: q.status } : {}),
        ...afterCursor(q.cursor),
      },
      orderBy: NEWEST_FIRST,
      take: limit + 1,
      include: { kycDocuments: { include: { media: true } } },
    });
    const page = toPage(rows, limit);
    return {
      nextCursor: page.nextCursor,
      data: await Promise.all(
        page.data.map((v) =>
          this.vendors.toResponse(v, { vendorId: v.id, role: 'admin', permissions: [] }, false),
        ),
      ),
    };
  }

  detail(admin: AuthPrincipal, vendorId: string): Promise<VendorResponse> {
    return this.vendors.detail(admin, vendorId, { vendorId, role: 'admin', permissions: [] });
  }

  async reviewDocument(
    admin: AuthPrincipal,
    vendorId: string,
    docId: string,
    dto: ReviewKycDto,
  ): Promise<VendorResponse> {
    const doc = await this.prisma.vendorKycDocument.findFirst({ where: { id: docId, vendorId } });
    if (!doc) throw AppException.notFound('Document not found');
    if (dto.decision === 'rejected' && !dto.note)
      throw AppException.badRequest('A note is required when rejecting');
    await this.prisma.vendorKycDocument.update({
      where: { id: docId },
      data: {
        status: dto.decision,
        reviewerNote: dto.note ?? null,
        reviewedById: admin.userId,
        reviewedAt: new Date(),
      },
    });
    await this.audit.record({
      actor: admin,
      action: `vendor.kyc_${dto.decision}`,
      entityType: 'vendor_kyc_document',
      entityId: docId,
      before: doc,
      after: dto,
    });
    return this.detail(admin, vendorId);
  }

  async approve(admin: AuthPrincipal, vendorId: string): Promise<VendorResponse> {
    const vendor = await this.vendors.load(vendorId);
    if (vendor.status !== 'kyc_pending')
      throw invalidState(`Only submitted applications can be approved (status: ${vendor.status})`);
    const approved = new Set(
      vendor.kycDocuments.filter((d) => d.status === 'approved').map((d) => d.docType),
    );
    const notApproved = requiredDocuments(vendor.type, vendor.gstin !== null).filter(
      (d) => !approved.has(d),
    );
    if (notApproved.length > 0) {
      throw new AppException(
        ERROR_CODES.KYC_INCOMPLETE,
        HttpStatus.BAD_REQUEST,
        `Approve these documents first: ${notApproved.join(', ')}`,
        { notApproved },
      );
    }
    await this.setStatus(admin, vendorId, 'active', 'vendor.approve', {
      approvedAt: new Date(),
      approvedById: admin.userId,
    });
    this.emit(VENDOR_EVENTS.approved, { vendorId, ownerUserId: vendor.ownerUserId });
    return this.detail(admin, vendorId);
  }

  async reject(admin: AuthPrincipal, vendorId: string, reason: string): Promise<VendorResponse> {
    const vendor = await this.vendors.load(vendorId);
    if (vendor.status !== 'kyc_pending')
      throw invalidState(`Only submitted applications can be rejected (status: ${vendor.status})`);
    await this.setStatus(admin, vendorId, 'kyc_rejected', 'vendor.reject', {}, reason);
    this.emit(VENDOR_EVENTS.rejected, { vendorId, ownerUserId: vendor.ownerUserId, reason });
    return this.detail(admin, vendorId);
  }

  async suspend(admin: AuthPrincipal, vendorId: string, reason: string): Promise<VendorResponse> {
    const vendor = await this.vendors.load(vendorId);
    if (vendor.status !== 'active') throw invalidState('Only active vendors can be suspended');
    await this.setStatus(admin, vendorId, 'suspended', 'vendor.suspend', {}, reason);
    this.emit(VENDOR_EVENTS.suspended, { vendorId, ownerUserId: vendor.ownerUserId, reason });
    return this.detail(admin, vendorId);
  }

  async reinstate(admin: AuthPrincipal, vendorId: string): Promise<VendorResponse> {
    const vendor = await this.vendors.load(vendorId);
    if (vendor.status !== 'suspended')
      throw invalidState('Only suspended vendors can be reinstated');
    await this.setStatus(admin, vendorId, 'active', 'vendor.reinstate');
    this.emit(VENDOR_EVENTS.reinstated, { vendorId, ownerUserId: vendor.ownerUserId });
    return this.detail(admin, vendorId);
  }

  private async setStatus(
    admin: AuthPrincipal,
    vendorId: string,
    status: VendorStatus,
    action: string,
    extra: { approvedAt?: Date; approvedById?: string } = {},
    reason?: string,
  ): Promise<void> {
    const before = await this.prisma.vendor.findUniqueOrThrow({
      where: { id: vendorId },
      select: { status: true },
    });
    await this.prisma.vendor.update({ where: { id: vendorId }, data: { status, ...extra } });
    await this.audit.record({
      actor: admin,
      action,
      entityType: 'vendor',
      entityId: vendorId,
      before,
      after: { status, reason },
    });
    await this.cache.del(ACTIVE_VENDORS_CACHE_KEY);
  }

  private emit(name: string, event: VendorStatusEvent): void {
    this.events.emit(name, event);
  }
}
