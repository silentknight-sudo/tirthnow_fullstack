import { Inject, Injectable } from '@nestjs/common';
import { APP_CONFIG, type AppConfig } from '../../config';
import { callWithPolicy } from '../call-policy';
import { readJsonOrThrow } from '../http-error';
import { hmacHex, safeEqual } from '../payment/mock.adapter';
import {
  freshTimestamp,
  type IngestResult,
  parseSignatureHeader,
  type VideoProvider,
  type VideoWebhookEvent,
} from './video.provider';

interface CfVideo {
  uid: string;
  readyToStream?: boolean;
  status?: { state?: string; errReasonText?: string };
  playback?: { hls?: string };
  thumbnail?: string;
  duration?: number;
}

/** Cloudflare Stream: copy-from-URL ingest, HLS playback, `Webhook-Signature` HMAC. */
@Injectable()
export class CloudflareStreamAdapter implements VideoProvider {
  readonly name = 'cloudflare_stream' as const;
  private readonly base: string;
  private readonly token: string;
  private readonly webhookSecret: string;

  constructor(@Inject(APP_CONFIG) config: AppConfig) {
    const { cfAccountId, cfApiToken, cfWebhookSecret } = config.video;
    if (!cfAccountId || !cfApiToken || !cfWebhookSecret)
      throw new Error('Cloudflare Stream is not configured');
    this.base = `https://api.cloudflare.com/client/v4/accounts/${cfAccountId}/stream`;
    this.token = cfApiToken;
    this.webhookSecret = cfWebhookSecret;
  }

  async ingest(input: { sourceUrl: string; externalId: string }): Promise<IngestResult> {
    const res = await callWithPolicy(
      'cloudflare-stream',
      async () =>
        readJsonOrThrow<{ result: CfVideo }>(
          'cloudflare-stream',
          await fetch(`${this.base}/copy`, {
            method: 'POST',
            headers: { authorization: `Bearer ${this.token}`, 'content-type': 'application/json' },
            body: JSON.stringify({
              url: input.sourceUrl,
              meta: { name: input.externalId },
              requireSignedURLs: false,
            }),
          }),
        ),
      { retries: 1 },
    );
    return { providerAssetId: res.result.uid, status: 'processing', playback: null };
  }

  verifyWebhook(rawBody: Buffer, headers: Record<string, string | undefined>): boolean {
    const sig = parseSignatureHeader(headers['webhook-signature']);
    if (!sig.time || !sig.sig1 || !freshTimestamp(sig.time)) return false;
    return safeEqual(
      hmacHex(this.webhookSecret, `${sig.time}.${rawBody.toString('utf8')}`),
      sig.sig1,
    );
  }

  parseWebhook(rawBody: Buffer): VideoWebhookEvent {
    return cfEvent(JSON.parse(rawBody.toString('utf8')) as CfVideo);
  }

  async remove(providerAssetId: string): Promise<void> {
    await callWithPolicy('cloudflare-stream', async () => {
      const res = await fetch(`${this.base}/${providerAssetId}`, {
        method: 'DELETE',
        headers: { authorization: `Bearer ${this.token}` },
      });
      if (!res.ok && res.status !== 404) await readJsonOrThrow('cloudflare-stream', res);
    });
  }
}

export function cfEvent(v: CfVideo): VideoWebhookEvent {
  if (v.status?.state === 'error')
    return {
      kind: 'errored',
      providerAssetId: v.uid,
      reason: v.status.errReasonText ?? 'transcode failed',
    };
  if (v.readyToStream && v.playback?.hls) {
    return {
      kind: 'ready',
      providerAssetId: v.uid,
      playback: {
        playbackUrl: v.playback.hls,
        posterUrl: v.thumbnail ?? null,
        durationMs: v.duration ? Math.round(v.duration * 1000) : null,
      },
    };
  }
  return { kind: 'ignored', type: v.status?.state ?? 'unknown' };
}
