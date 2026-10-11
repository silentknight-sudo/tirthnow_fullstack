import { Injectable } from '@nestjs/common';
import { EventEmitter2 } from '@nestjs/event-emitter';
import { type Prisma, type VendorKycDocument } from '@prisma/client';
import { ERROR_CODES } from '@tirth-now/shared-types';
import { AuditService } from '../../../core/audit';
import { type AuthPrincipal } from '../../../core/auth';
import { AppException } from '../../../core/http';
import { PrismaService } from '../../../core/prisma';
import { FilesFacade } from '../../files';
import { IdentityFacade } from '../../identity';
import {
  type AddKycDocumentDto,
  type CreateVendorDto,
  type KycDocumentResponse,
  type UpdateVendorDto,
  type VendorResponse,
} from '../dto/vendors.dto';
import { VENDOR_EVENTS, type VendorStatusEvent } from '../events';
import { missingDocuments } from './kyc-rules';
import { type VendorAccess, VendorAccessService } from './vendor-access.service';

type VendorWithDocs = Prisma.VendorGetPayload<{
  include: { kycDocuments: { include: { media: true } } };
}>;

const EDITABLE_LEGAL = new Set(['draft', 'kyc_rejected']);

@Injectable()
export class VendorsService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly identity: IdentityFacade,
    private readonly files: FilesFacade,
    private readonly access: VendorAccessService,
    private readonly audit: AuditService,
    private readonly events: EventEmitter2,
  ) {}

  async create(user: AuthPrincipal, dto: CreateVendorDto): Promise<VendorResponse> {
    const vendor = await this.prisma.vendor.create({
      data: {
        ownerUserId: user.userId,
        type: dto.type,
        legalName: dto.legalName,
        displayName: dto.displayName,
        cityId: dto.cityId ?? null,
        gstin: dto.gstin ?? null,
        pan: dto.pan ?? null,
        status: 'draft',
      },
    });
    // The role appears in the access token after the next /auth/refresh.
    await this.identity.grantVendorRole(user.userId, 'vendor_owner', vendor.id);
    await this.audit.record({
      actor: user,
      action: 'vendor.create',
      entityType: 'vendor',
      entityId: vendor.id,
      after: vendor,
    });
    return this.detail(user, vendor.id);
  }

  async mine(user: AuthPrincipal): Promise<VendorResponse[]> {
    const rows = await this.prisma.vendor.findMany({
      where: {
        deletedAt: null,
        OR: [
          { ownerUserId: user.userId },
          { staff: { some: { userId: user.userId, isActive: true } } },
        ],
      },
      orderBy: { createdAt: 'asc' },
      select: { id: true },
    });
    return Promise.all(rows.map((r) => this.detail(user, r.id)));
  }

  async detail(
    user: AuthPrincipal,
    vendorId: string,
    access?: VendorAccess,
  ): Promise<VendorResponse> {
    const a = access ?? (await this.access.resolve(user, vendorId));
    const vendor = await this.load(vendorId);
    return this.toResponse(vendor, a, true);
  }

  async update(
    user: AuthPrincipal,
    vendorId: string,
    dto: UpdateVendorDto,
  ): Promise<VendorResponse> {
    const before = await this.load(vendorId);
    const legalChange =
      dto.legalName !== undefined || dto.gstin !== undefined || dto.pan !== undefined;
    if (legalChange && !EDITABLE_LEGAL.has(before.status)) {
      throw new AppException(
        ERROR_CODES.VENDOR_INVALID_STATE,
        409,
        'Legal details can only change before approval; contact support',
      );
    }
    await this.prisma.vendor.update({ where: { id: vendorId }, data: dto });
    await this.audit.record({
      actor: user,
      action: 'vendor.update',
      entityType: 'vendor',
      entityId: vendorId,
      before,
      after: dto,
    });
    return this.detail(user, vendorId);
  }

  // ───────────── KYC ─────────────

  async addKycDocument(
    user: AuthPrincipal,
    vendorId: string,
    dto: AddKycDocumentDto,
  ): Promise<KycDocumentResponse> {
    const vendor = await this.load(vendorId);
    if (!EDITABLE_LEGAL.has(vendor.status)) {
      throw new AppException(
        ERROR_CODES.VENDOR_INVALID_STATE,
        409,
        'Documents can be added only while the application is in draft or was rejected',
      );
    }
    const media = await this.files.requireReady(dto.mediaId, {
      ownerUserId: user.userId,
      purposes: ['kyc_document'],
    });
    const doc = await this.prisma.vendorKycDocument.create({
      data: { vendorId, docType: dto.docType, mediaId: media.id, status: 'pending' },
      include: { media: true },
    });
    await this.audit.record({
      actor: user,
      action: 'vendor.kyc_add',
      entityType: 'vendor',
      entityId: vendorId,
      after: { docType: dto.docType, docId: doc.id },
    });
    return this.docResponse(doc, true);
  }

  async removeKycDocument(user: AuthPrincipal, vendorId: string, docId: string): Promise<void> {
    const vendor = await this.load(vendorId);
    if (!EDITABLE_LEGAL.has(vendor.status)) {
      throw new AppException(
        ERROR_CODES.VENDOR_INVALID_STATE,
        409,
        'Documents are locked while under review',
      );
    }
    const res = await this.prisma.vendorKycDocument.deleteMany({
      where: { id: docId, vendorId, status: { not: 'approved' } },
    });
    if (res.count === 0) throw AppException.notFound('Document not found');
    await this.audit.record({
      actor: user,
      action: 'vendor.kyc_remove',
      entityType: 'vendor',
      entityId: vendorId,
      after: { docId },
    });
  }

  async submit(user: AuthPrincipal, vendorId: string): Promise<VendorResponse> {
    const vendor = await this.load(vendorId);
    if (!EDITABLE_LEGAL.has(vendor.status)) {
      throw new AppException(
        ERROR_CODES.VENDOR_INVALID_STATE,
        409,
        `Cannot submit from status ${vendor.status}`,
      );
    }
    const missing = missingDocuments(vendor.type, vendor.gstin !== null, vendor.kycDocuments);
    if (missing.length > 0) {
      throw new AppException(
        ERROR_CODES.KYC_INCOMPLETE,
        400,
        `Missing documents: ${missing.join(', ')}`,
        { missing },
      );
    }
    if (!vendor.pan)
      throw new AppException(ERROR_CODES.KYC_INCOMPLETE, 400, 'PAN number is required', {
        missing: ['pan_number'],
      });
    await this.prisma.vendor.update({ where: { id: vendorId }, data: { status: 'kyc_pending' } });
    await this.audit.record({
      actor: user,
      action: 'vendor.submit',
      entityType: 'vendor',
      entityId: vendorId,
    });
    const event: VendorStatusEvent = { vendorId, ownerUserId: vendor.ownerUserId };
    this.events.emit(VENDOR_EVENTS.submitted, event);
    return this.detail(user, vendorId);
  }

  // ───────────── helpers ─────────────

  async load(vendorId: string): Promise<VendorWithDocs> {
    const vendor = await this.prisma.vendor.findFirst({
      where: { id: vendorId, deletedAt: null },
      include: { kycDocuments: { include: { media: true }, orderBy: { createdAt: 'asc' } } },
    });
    if (!vendor) throw AppException.notFound('Vendor not found');
    return vendor;
  }

  async docResponse(
    doc: VendorKycDocument & { media: Parameters<FilesFacade['url']>[0] },
    withUrl: boolean,
  ): Promise<KycDocumentResponse> {
    return {
      id: doc.id,
      docType: doc.docType,
      status: doc.status,
      reviewerNote: doc.reviewerNote,
      mediaId: doc.mediaId,
      ...(withUrl ? { url: await this.files.url(doc.media) } : {}),
    };
  }

  async toResponse(
    vendor: VendorWithDocs,
    access: VendorAccess,
    withUrls: boolean,
  ): Promise<VendorResponse> {
    return {
      id: vendor.id,
      type: vendor.type,
      legalName: vendor.legalName,
      displayName: vendor.displayName,
      cityId: vendor.cityId,
      gstin: vendor.gstin,
      pan: vendor.pan,
      status: vendor.status,
      approvedAt: vendor.approvedAt?.toISOString() ?? null,
      myRole: access.role,
      myPermissions: access.permissions,
      kycDocuments: await Promise.all(
        vendor.kycDocuments.map((d) => this.docResponse(d, withUrls && access.role !== 'staff')),
      ),
      missingDocuments: missingDocuments(vendor.type, vendor.gstin !== null, vendor.kycDocuments),
    };
  }
}
