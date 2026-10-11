import { randomUUID } from 'node:crypto';
import { HttpStatus, Inject, Injectable } from '@nestjs/common';
import { InjectQueue } from '@nestjs/bullmq';
import { type MediaAsset, type MediaKind, type Prisma } from '@prisma/client';
import { ADMIN_ROLES, ERROR_CODES } from '@tirth-now/shared-types';
import { type Queue } from 'bullmq';
import { type AuthPrincipal } from '../../../core/auth';
import { APP_CONFIG, type AppConfig } from '../../../core/config';
import { AppException } from '../../../core/http';
import { PrismaService } from '../../../core/prisma';
import { type Bucket, STORAGE_PROVIDER, type StorageProvider } from '../../../core/providers';
import { QUEUES } from '../../../core/queue';
import {
  type MediaAssetResponse,
  type PresignUploadDto,
  type PresignUploadResponse,
} from '../dto/files.dto';
import {
  bucketOfKey,
  extensionFor,
  PURPOSE_RULES,
  purposeOfKey,
  STAFF_PURPOSES,
  type UploadPurpose,
} from './upload-policy';

const UPLOAD_URL_TTL = 15 * 60;
const SIGNED_GET_TTL = 10 * 60;

export const PROCESS_UPLOAD_JOB = 'process-upload';

export interface MediaJobData {
  mediaId: string;
}

const isStaff = (p: AuthPrincipal) =>
  p.roles.some((r) => r === 'vendor_owner' || r === 'vendor_staff' || ADMIN_ROLES.includes(r));
const isAdmin = (p: AuthPrincipal) => p.roles.some((r) => ADMIN_ROLES.includes(r));

@Injectable()
export class FilesService {
  constructor(
    private readonly prisma: PrismaService,
    @Inject(STORAGE_PROVIDER) private readonly storage: StorageProvider,
    @Inject(APP_CONFIG) private readonly config: AppConfig,
    @InjectQueue(QUEUES.media) private readonly mediaQueue: Queue<MediaJobData>,
  ) {}

  async presign(user: AuthPrincipal, dto: PresignUploadDto): Promise<PresignUploadResponse> {
    const rule = PURPOSE_RULES[dto.purpose];
    if (STAFF_PURPOSES.has(dto.purpose) && !isStaff(user)) throw AppException.forbidden();
    if (!rule.mimeTypes.includes(dto.mimeType)) {
      throw this.invalid(`${dto.purpose} accepts ${rule.mimeTypes.join(', ')}`);
    }
    const maxBytes = rule.maxBytes(this.config);
    if (dto.sizeBytes > maxBytes)
      throw this.invalid(`File is larger than ${Math.floor(maxBytes / 1024 / 1024)} MB`);

    const now = new Date();
    const month = String(now.getUTCMonth() + 1).padStart(2, '0');
    const storageKey = `${dto.purpose}/${now.getUTCFullYear()}/${month}/${randomUUID()}.${extensionFor(dto.mimeType)}`;
    const asset = await this.prisma.mediaAsset.create({
      data: {
        ownerUserId: user.userId,
        kind: rule.kind,
        storageKey,
        mimeType: dto.mimeType,
        sizeBytes: dto.sizeBytes,
        status: 'pending_upload',
      },
    });
    const upload = await this.storage.presignPut(
      rule.bucket,
      storageKey,
      dto.mimeType,
      UPLOAD_URL_TTL,
    );
    return {
      mediaId: asset.id,
      uploadUrl: upload.url,
      method: upload.method,
      headers: upload.headers,
      expiresAt: upload.expiresAt.toISOString(),
    };
  }

  /** Client confirms the PUT finished; verification and processing happen on the media queue. */
  async complete(user: AuthPrincipal, mediaId: string): Promise<MediaAssetResponse> {
    const asset = await this.ownedAsset(user, mediaId);
    if (asset.status !== 'pending_upload') return this.toResponse(asset);
    const info = await this.storage.head(bucketOfKey(asset.storageKey), asset.storageKey);
    if (!info) throw this.invalid('The file has not been uploaded yet');
    if (asset.sizeBytes !== null && info.sizeBytes !== asset.sizeBytes) {
      await this.fail(asset, 'size mismatch');
      throw this.invalid('Uploaded file size does not match the declared size');
    }
    const updated = await this.prisma.mediaAsset.update({
      where: { id: asset.id },
      data: { status: 'uploaded' },
    });
    await this.mediaQueue.add(
      PROCESS_UPLOAD_JOB,
      { mediaId: asset.id },
      { jobId: `process-${asset.id}`, attempts: 3 },
    );
    return this.toResponse(updated);
  }

  async get(user: AuthPrincipal, mediaId: string): Promise<MediaAssetResponse> {
    const asset = await this.prisma.mediaAsset.findFirst({
      where: { id: mediaId, deletedAt: null },
    });
    if (!asset) throw AppException.notFound('File not found');
    const isPublic = bucketOfKey(asset.storageKey) === 'public';
    if (!isPublic && asset.ownerUserId !== user.userId && !isAdmin(user))
      throw AppException.notFound('File not found');
    return this.toResponse(asset);
  }

  // ───────────── used by the facade ─────────────

  async requireReady(
    mediaId: string,
    opts: {
      ownerUserId?: string;
      purposes?: UploadPurpose[];
      kinds?: MediaKind[];
      allowProcessing?: boolean;
    },
  ): Promise<MediaAsset> {
    const asset = await this.prisma.mediaAsset.findFirst({
      where: { id: mediaId, deletedAt: null },
    });
    const okStatus =
      asset &&
      (asset.status === 'ready' ||
        (opts.allowProcessing && ['uploaded', 'processing'].includes(asset.status)));
    if (
      !asset ||
      !okStatus ||
      (opts.ownerUserId && asset.ownerUserId !== opts.ownerUserId) ||
      (opts.kinds && !opts.kinds.includes(asset.kind)) ||
      (opts.purposes && !opts.purposes.includes(purposeOfKey(asset.storageKey) as UploadPurpose))
    ) {
      throw this.invalid(`Media ${mediaId} is not a usable upload`);
    }
    return asset;
  }

  async url(asset: MediaAsset, variant?: string): Promise<string> {
    const key = (variant && this.variantKeys(asset)[variant]) || asset.storageKey;
    const bucket = bucketOfKey(asset.storageKey);
    return bucket === 'public'
      ? this.storage.publicUrl(key)
      : this.storage.presignGet(bucket, key, SIGNED_GET_TTL);
  }

  async read(asset: MediaAsset, maxBytes?: number): Promise<Buffer> {
    return this.storage.read(bucketOfKey(asset.storageKey), asset.storageKey, maxBytes);
  }

  /** Store a server-generated object (TTS audio, PDFs) and register it as ready. */
  async storeGenerated(opts: {
    ownerUserId: string | null;
    folder: string;
    body: Buffer;
    mimeType: string;
    kind: MediaKind;
    bucket: Bucket;
  }): Promise<MediaAsset> {
    const storageKey = `generated-${opts.bucket}/${opts.folder}/${randomUUID()}.${extensionFor(opts.mimeType)}`;
    await this.storage.put(opts.bucket, storageKey, opts.body, opts.mimeType);
    return this.prisma.mediaAsset.create({
      data: {
        ownerUserId: opts.ownerUserId,
        kind: opts.kind,
        storageKey,
        mimeType: opts.mimeType,
        sizeBytes: opts.body.length,
        status: 'ready',
      },
    });
  }

  async fail(asset: MediaAsset, reason: string): Promise<void> {
    await this.prisma.mediaAsset.update({
      where: { id: asset.id },
      data: { status: 'failed', variants: { ...this.variantKeys(asset), error: reason } },
    });
  }

  variantKeys(asset: MediaAsset): Record<string, string> {
    const v = asset.variants;
    if (typeof v !== 'object' || v === null || Array.isArray(v)) return {};
    return Object.fromEntries(
      Object.entries(v).filter((e): e is [string, string] => typeof e[1] === 'string'),
    );
  }

  async toResponse(asset: MediaAsset): Promise<MediaAssetResponse> {
    const ready = asset.status === 'ready';
    const variants: Record<string, string> = {};
    if (ready) {
      for (const [name, key] of Object.entries(this.variantKeys(asset))) {
        if (name === 'error') continue;
        variants[name] = key.startsWith('http') ? key : await this.url(asset, name);
      }
    }
    return {
      id: asset.id,
      kind: asset.kind,
      status: asset.status,
      mimeType: asset.mimeType,
      sizeBytes: asset.sizeBytes,
      width: asset.width,
      height: asset.height,
      url: ready ? await this.url(asset) : null,
      variants,
    };
  }

  private async ownedAsset(user: AuthPrincipal, mediaId: string): Promise<MediaAsset> {
    const asset = await this.prisma.mediaAsset.findFirst({
      where: { id: mediaId, deletedAt: null },
    });
    if (!asset || asset.ownerUserId !== user.userId) throw AppException.notFound('File not found');
    return asset;
  }

  private invalid(message: string): AppException {
    return new AppException(ERROR_CODES.UPLOAD_INVALID, HttpStatus.BAD_REQUEST, message);
  }

  /** Update after processing. */
  async markReady(mediaId: string, data: Prisma.MediaAssetUpdateInput): Promise<void> {
    await this.prisma.mediaAsset.update({
      where: { id: mediaId },
      data: { ...data, status: 'ready' },
    });
  }
}
