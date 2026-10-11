import { randomUUID } from 'node:crypto';
import { Inject, Injectable } from '@nestjs/common';
import { APP_CONFIG, type AppConfig } from '../../config';
import { hmacHex, safeEqual } from '../payment/mock.adapter';
import { type IngestResult, type VideoProvider, type VideoWebhookEvent } from './video.provider';

/**
 * Plays the uploaded file directly (no transcoding). Ready immediately unless `holdAssets` is
 * set, in which case tests finish ingestion with a signed webhook (x-mock-signature).
 */
@Injectable()
export class MockVideoAdapter implements VideoProvider {
  readonly name = 'mock' as const;
  holdAssets = false;
  readonly removed: string[] = [];
  private readonly sources = new Map<string, string>();
  private readonly secret: string;

  constructor(@Inject(APP_CONFIG) config: AppConfig) {
    this.secret = config.video.mockSecret;
  }

  ingest(input: { sourceUrl: string; externalId: string }): Promise<IngestResult> {
    const providerAssetId = `vid_mock_${randomUUID().replace(/-/g, '').slice(0, 16)}`;
    this.sources.set(providerAssetId, input.sourceUrl);
    if (this.holdAssets)
      return Promise.resolve({ providerAssetId, status: 'processing', playback: null });
    return Promise.resolve({
      providerAssetId,
      status: 'ready',
      playback: { playbackUrl: input.sourceUrl, posterUrl: null, durationMs: null },
    });
  }

  verifyWebhook(rawBody: Buffer, headers: Record<string, string | undefined>): boolean {
    const sig = headers['x-mock-signature'];
    return typeof sig === 'string' && safeEqual(hmacHex(this.secret, rawBody), sig);
  }

  parseWebhook(rawBody: Buffer): VideoWebhookEvent {
    return JSON.parse(rawBody.toString('utf8')) as VideoWebhookEvent;
  }

  remove(providerAssetId: string): Promise<void> {
    this.removed.push(providerAssetId);
    return Promise.resolve();
  }

  /** Test helper: the signed webhook the provider would send. */
  webhook(
    providerAssetId: string,
    outcome: 'ready' | 'errored' = 'ready',
  ): { body: Buffer; signature: string } {
    const event: VideoWebhookEvent =
      outcome === 'ready'
        ? {
            kind: 'ready',
            providerAssetId,
            playback: {
              playbackUrl: this.sources.get(providerAssetId) ?? '',
              posterUrl: null,
              durationMs: 15_000,
            },
          }
        : { kind: 'errored', providerAssetId, reason: 'unsupported codec' };
    const body = Buffer.from(JSON.stringify(event));
    return { body, signature: hmacHex(this.secret, body) };
  }
}
