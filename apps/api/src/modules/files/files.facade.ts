import { Injectable } from '@nestjs/common';
import { type MediaAsset, type MediaKind } from '@prisma/client';
import { type Job } from 'bullmq';
import { type Bucket } from '../../core/providers';
import { type MediaAssetResponse } from './dto/files.dto';
import { MediaProcessor } from './processors/media.processor';
import { FilesService } from './services/files.service';
import { type UploadPurpose } from './services/upload-policy';

/** Public surface of the files module. */
@Injectable()
export class FilesFacade {
  constructor(private readonly files: FilesService) {}

  /** Throws UPLOAD_INVALID unless the media exists, is ready and matches the constraints. */
  requireReady(
    mediaId: string,
    opts: {
      ownerUserId?: string;
      purposes?: UploadPurpose[];
      kinds?: MediaKind[];
      allowProcessing?: boolean;
    } = {},
  ): Promise<MediaAsset> {
    return this.files.requireReady(mediaId, opts);
  }

  async requireAllReady(
    mediaIds: string[],
    opts: { ownerUserId?: string; purposes?: UploadPurpose[] } = {},
  ): Promise<void> {
    for (const id of mediaIds) await this.files.requireReady(id, opts);
  }

  url(asset: MediaAsset, variant?: string): Promise<string> {
    return this.files.url(asset, variant);
  }

  describe(asset: MediaAsset): Promise<MediaAssetResponse> {
    return this.files.toResponse(asset);
  }

  read(asset: MediaAsset, maxBytes?: number): Promise<Buffer> {
    return this.files.read(asset, maxBytes);
  }

  storeGenerated(opts: {
    ownerUserId: string | null;
    folder: string;
    body: Buffer;
    mimeType: string;
    kind: MediaKind;
    bucket: Bucket;
  }): Promise<MediaAsset> {
    return this.files.storeGenerated(opts);
  }

  variantKeys(asset: MediaAsset): Record<string, string> {
    return this.files.variantKeys(asset);
  }

  /** Let another module process its own job names on the media queue. */
  registerMediaHandler(jobName: string, handler: (job: Job) => Promise<unknown>): void {
    MediaProcessor.registerHandler(jobName, handler);
  }
}
