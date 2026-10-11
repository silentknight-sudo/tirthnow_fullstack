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

interface MuxEvent {
  type: string;
  data: {
    id: string;
    playback_ids?: { id: string; policy: string }[];
    duration?: number;
    errors?: { messages?: string[] };
  };
}

/** Mux Video: asset from URL, public playback ids, `mux-signature` HMAC. */
@Injectable()
export class MuxVideoAdapter implements VideoProvider {
  readonly name = 'mux' as const;
  private readonly auth: string;
  private readonly webhookSecret: string;

  constructor(@Inject(APP_CONFIG) config: AppConfig) {
    const { muxTokenId, muxTokenSecret, muxWebhookSecret } = config.video;
    if (!muxTokenId || !muxTokenSecret || !muxWebhookSecret)
      throw new Error('Mux is not configured');
    this.auth = `Basic ${Buffer.from(`${muxTokenId}:${muxTokenSecret}`).toString('base64')}`;
    this.webhookSecret = muxWebhookSecret;
  }

  async ingest(input: { sourceUrl: string; externalId: string }): Promise<IngestResult> {
    const res = await callWithPolicy(
      'mux',
      async () =>
        readJsonOrThrow<{ data: { id: string } }>(
          'mux',
          await fetch('https://api.mux.com/video/v1/assets', {
            method: 'POST',
            headers: { authorization: this.auth, 'content-type': 'application/json' },
            body: JSON.stringify({
              input: [{ url: input.sourceUrl }],
              playback_policy: ['public'],
              passthrough: input.externalId,
              video_quality: 'basic',
            }),
          }),
        ),
      { retries: 1 },
    );
    return { providerAssetId: res.data.id, status: 'processing', playback: null };
  }

  verifyWebhook(rawBody: Buffer, headers: Record<string, string | undefined>): boolean {
    const sig = parseSignatureHeader(headers['mux-signature']);
    if (!sig.t || !sig.v1 || !freshTimestamp(sig.t)) return false;
    return safeEqual(hmacHex(this.webhookSecret, `${sig.t}.${rawBody.toString('utf8')}`), sig.v1);
  }

  parseWebhook(rawBody: Buffer): VideoWebhookEvent {
    return muxEvent(JSON.parse(rawBody.toString('utf8')) as MuxEvent);
  }

  async remove(providerAssetId: string): Promise<void> {
    await callWithPolicy('mux', async () => {
      const res = await fetch(`https://api.mux.com/video/v1/assets/${providerAssetId}`, {
        method: 'DELETE',
        headers: { authorization: this.auth },
      });
      if (!res.ok && res.status !== 404) await readJsonOrThrow('mux', res);
    });
  }
}

export function muxEvent(e: MuxEvent): VideoWebhookEvent {
  if (e.type === 'video.asset.ready') {
    const pid = e.data.playback_ids?.find((p) => p.policy === 'public')?.id;
    if (!pid)
      return { kind: 'errored', providerAssetId: e.data.id, reason: 'no public playback id' };
    return {
      kind: 'ready',
      providerAssetId: e.data.id,
      playback: {
        playbackUrl: `https://stream.mux.com/${pid}.m3u8`,
        posterUrl: `https://image.mux.com/${pid}/thumbnail.jpg`,
        durationMs: e.data.duration ? Math.round(e.data.duration * 1000) : null,
      },
    };
  }
  if (e.type === 'video.asset.errored') {
    return {
      kind: 'errored',
      providerAssetId: e.data.id,
      reason: e.data.errors?.messages?.join('; ') ?? 'transcode failed',
    };
  }
  return { kind: 'ignored', type: e.type };
}
