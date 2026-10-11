export interface VideoPlayback {
  /** HLS manifest (or a progressive MP4 for the mock). */
  playbackUrl: string;
  posterUrl: string | null;
  durationMs: number | null;
}

export interface IngestResult {
  providerAssetId: string;
  /** `ready` when the provider finished synchronously (mock). */
  status: 'processing' | 'ready';
  playback: VideoPlayback | null;
}

export type VideoWebhookEvent =
  | { kind: 'ready'; providerAssetId: string; playback: VideoPlayback }
  | { kind: 'errored'; providerAssetId: string; reason: string }
  | { kind: 'ignored'; type: string };

/** Transcoding + HLS delivery (Cloudflare Stream or Mux). */
export interface VideoProvider {
  readonly name: 'mock' | 'cloudflare_stream' | 'mux';
  /** Pull the original from `sourceUrl` and start transcoding. */
  ingest(input: { sourceUrl: string; externalId: string }): Promise<IngestResult>;
  verifyWebhook(rawBody: Buffer, headers: Record<string, string | undefined>): boolean;
  parseWebhook(rawBody: Buffer): VideoWebhookEvent;
  remove(providerAssetId: string): Promise<void>;
}

export const VIDEO_PROVIDER = Symbol('VIDEO_PROVIDER');

/** `t=…,v1=…` / `time=…,sig1=…` style headers → map. */
export function parseSignatureHeader(header: string | undefined): Record<string, string> {
  if (!header) return {};
  return Object.fromEntries(
    header.split(',').flatMap((part) => {
      const i = part.indexOf('=');
      return i > 0 ? [[part.slice(0, i).trim(), part.slice(i + 1).trim()]] : [];
    }),
  );
}

/** Reject webhooks older than five minutes (replay protection). */
export function freshTimestamp(seconds: string | undefined, now = Date.now()): boolean {
  const t = Number(seconds);
  return Number.isFinite(t) && Math.abs(now / 1000 - t) <= 300;
}
