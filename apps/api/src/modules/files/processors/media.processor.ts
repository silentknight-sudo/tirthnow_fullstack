import { Inject, Logger } from '@nestjs/common';
import { Processor } from '@nestjs/bullmq';
import { EventEmitter2 } from '@nestjs/event-emitter';
import { type MediaAsset } from '@prisma/client';
import { type Job } from 'bullmq';
import sharp from 'sharp';
import { PrismaService } from '../../../core/prisma';
import { STORAGE_PROVIDER, type StorageProvider } from '../../../core/providers';
import { QUEUES, RoleAwareProcessor } from '../../../core/queue';
import { FILES_EVENTS, type MediaReadyEvent } from '../events';
import { FilesService, type MediaJobData, PROCESS_UPLOAD_JOB } from '../services/files.service';
import { mimeMatches, sniffMimeType } from '../services/sniff';
import { bucketOfKey, purposeOfKey } from '../services/upload-policy';

const IMAGE_VARIANTS = [
  { name: 'thumb', width: 320 },
  { name: 'medium', width: 1080 },
] as const;

/**
 * media queue: verifies uploads by content (magic bytes), records image dimensions and
 * writes WebP variants. Other job names on this queue are dispatched to handlers that
 * modules register (e.g. reels registers video transcoding) to keep module boundaries.
 */
@Processor(QUEUES.media, { autorun: false, concurrency: 4 })
export class MediaProcessor extends RoleAwareProcessor {
  private readonly logger = new Logger(MediaProcessor.name);
  private static readonly handlers = new Map<string, (job: Job) => Promise<unknown>>();

  constructor(
    private readonly files: FilesService,
    private readonly prisma: PrismaService,
    private readonly events: EventEmitter2,
    @Inject(STORAGE_PROVIDER) private readonly storage: StorageProvider,
  ) {
    super();
  }

  /** Register a handler for another job name on the media queue. */
  static registerHandler(jobName: string, handler: (job: Job) => Promise<unknown>): void {
    MediaProcessor.handlers.set(jobName, handler);
  }

  async process(job: Job): Promise<unknown> {
    if (job.name === PROCESS_UPLOAD_JOB)
      return this.processUpload((job as Job<MediaJobData>).data.mediaId);
    const handler = MediaProcessor.handlers.get(job.name);
    if (!handler) throw new Error(`No media handler for job ${job.name}`);
    return handler(job);
  }

  async processUpload(mediaId: string): Promise<string> {
    const asset = await this.prisma.mediaAsset.findUnique({ where: { id: mediaId } });
    if (!asset || asset.status === 'ready' || asset.status === 'failed') return 'skipped';
    await this.prisma.mediaAsset.update({
      where: { id: asset.id },
      data: { status: 'processing' },
    });

    const head = await this.files.read(asset, 64);
    const sniffed = sniffMimeType(head);
    if (!mimeMatches(asset.mimeType, sniffed)) {
      await this.files.fail(
        asset,
        `content is ${sniffed ?? 'unknown'}, declared ${asset.mimeType}`,
      );
      this.logger.warn(
        { mediaId, declared: asset.mimeType, sniffed },
        'upload rejected by content sniffing',
      );
      await this.announce(FILES_EVENTS.rejected, {
        mediaId: asset.id,
        kind: asset.kind,
        purpose: purposeOfKey(asset.storageKey),
      });
      return 'rejected';
    }

    if (asset.kind === 'image' && asset.mimeType !== 'image/heic') {
      await this.processImage(asset);
    } else {
      await this.files.markReady(asset.id, {});
    }
    const event: MediaReadyEvent = {
      mediaId: asset.id,
      kind: asset.kind,
      purpose: purposeOfKey(asset.storageKey),
    };
    await this.announce(FILES_EVENTS.uploaded, event);
    return 'ready';
  }

  /** Listeners run before the job completes (they usually queue follow-up work). */
  private async announce(name: string, event: MediaReadyEvent): Promise<void> {
    try {
      await this.events.emitAsync(name, event);
    } catch (err) {
      this.logger.error(
        { err, event: name, mediaId: event.mediaId },
        'media event listener failed',
      );
    }
  }

  private async processImage(asset: MediaAsset): Promise<void> {
    const bucket = bucketOfKey(asset.storageKey);
    const original = await this.files.read(asset);
    try {
      const meta = await sharp(original).metadata();
      const variants: Record<string, string> = {};
      for (const v of IMAGE_VARIANTS) {
        if (meta.width <= v.width && v.name !== 'thumb') continue;
        const body = await sharp(original)
          .rotate()
          .resize({ width: v.width, withoutEnlargement: true })
          .webp({ quality: 80 })
          .toBuffer();
        const key = `${asset.storageKey}.${v.name}.webp`;
        await this.storage.put(bucket, key, body, 'image/webp');
        variants[v.name] = key;
      }
      await this.files.markReady(asset.id, { width: meta.width, height: meta.height, variants });
    } catch (err) {
      await this.files.fail(asset, 'image could not be decoded');
      this.logger.warn({ err, mediaId: asset.id }, 'image processing failed');
    }
  }
}
