import { createHmac } from 'node:crypto';
import { loadConfig } from '../../config';
import { MockModerationAdapter } from '../moderation/mock.adapter';
import { CloudflareStreamAdapter, cfEvent } from '../video/cloudflare-stream.adapter';
import { muxEvent, MuxVideoAdapter } from '../video/mux.adapter';
import { freshTimestamp, parseSignatureHeader } from '../video/video.provider';

const base = {
  DATABASE_URL: 'postgresql://u:p@localhost:5432/db',
  REDIS_URL: 'redis://localhost:6379',
  JWT_ACCESS_SECRET: 'x'.repeat(40),
  DATA_ENCRYPTION_KEY: Buffer.alloc(32, 2).toString('base64'),
};
const sign = (secret: string, data: string) =>
  createHmac('sha256', secret).update(data).digest('hex');

describe('video webhooks', () => {
  const now = String(Math.floor(Date.now() / 1000));
  const body = Buffer.from('{"uid":"abc"}');

  it('verifies Cloudflare Stream signatures with timestamp freshness', () => {
    const cf = new CloudflareStreamAdapter(
      loadConfig({
        ...base,
        VIDEO_PROVIDER: 'cloudflare_stream',
        CF_STREAM_ACCOUNT_ID: 'acc',
        CF_STREAM_API_TOKEN: 'tok',
        CF_STREAM_WEBHOOK_SECRET: 'cf-secret',
      }),
    );
    const good = `time=${now},sig1=${sign('cf-secret', `${now}.${body.toString()}`)}`;
    expect(cf.verifyWebhook(body, { 'webhook-signature': good })).toBe(true);
    expect(cf.verifyWebhook(Buffer.from('{"uid":"abd"}'), { 'webhook-signature': good })).toBe(
      false,
    );
    const stale = '1000000000';
    expect(
      cf.verifyWebhook(body, {
        'webhook-signature': `time=${stale},sig1=${sign('cf-secret', `${stale}.${body.toString()}`)}`,
      }),
    ).toBe(false);
    expect(cf.verifyWebhook(body, {})).toBe(false);
  });

  it('verifies Mux signatures', () => {
    const mux = new MuxVideoAdapter(
      loadConfig({
        ...base,
        VIDEO_PROVIDER: 'mux',
        MUX_TOKEN_ID: 'id',
        MUX_TOKEN_SECRET: 'sec',
        MUX_WEBHOOK_SECRET: 'mux-secret',
      }),
    );
    expect(
      mux.verifyWebhook(body, {
        'mux-signature': `t=${now},v1=${sign('mux-secret', `${now}.${body.toString()}`)}`,
      }),
    ).toBe(true);
    expect(mux.verifyWebhook(body, { 'mux-signature': `t=${now},v1=${'0'.repeat(64)}` })).toBe(
      false,
    );
  });

  it('maps provider payloads to ready / errored / ignored', () => {
    expect(
      cfEvent({
        uid: 'u1',
        readyToStream: true,
        playback: { hls: 'https://cf/u1.m3u8' },
        thumbnail: 'https://cf/u1.jpg',
        duration: 12.5,
      }),
    ).toEqual({
      kind: 'ready',
      providerAssetId: 'u1',
      playback: {
        playbackUrl: 'https://cf/u1.m3u8',
        posterUrl: 'https://cf/u1.jpg',
        durationMs: 12_500,
      },
    });
    expect(cfEvent({ uid: 'u2', status: { state: 'error', errReasonText: 'bad codec' } })).toEqual({
      kind: 'errored',
      providerAssetId: 'u2',
      reason: 'bad codec',
    });
    expect(
      muxEvent({
        type: 'video.asset.ready',
        data: { id: 'a1', playback_ids: [{ id: 'p1', policy: 'public' }], duration: 9 },
      }),
    ).toMatchObject({
      kind: 'ready',
      playback: { playbackUrl: 'https://stream.mux.com/p1.m3u8', durationMs: 9_000 },
    });
    expect(muxEvent({ type: 'video.asset.created', data: { id: 'a1' } })).toEqual({
      kind: 'ignored',
      type: 'video.asset.created',
    });
  });

  it('parses signature headers', () => {
    expect(parseSignatureHeader('t=1, v1=abc,bad')).toEqual({ t: '1', v1: 'abc' });
    expect(freshTimestamp('nope')).toBe(false);
  });
});

describe('MockModerationAdapter', () => {
  const m = new MockModerationAdapter();
  it('flags blocklisted words and contact spam, passes devotional text', async () => {
    await expect(m.moderateText('Radhe Radhe, beautiful aarti')).resolves.toMatchObject({
      flagged: false,
    });
    await expect(m.moderateText('what an IDIOT')).resolves.toMatchObject({
      flagged: true,
      categories: ['abuse'],
    });
    await expect(m.moderateText('WhatsApp +91 9876543210 for VIP darshan')).resolves.toMatchObject({
      flagged: true,
      categories: ['spam'],
    });
    // "skill" contains "kill" but is not a match.
    await expect(m.moderateText('Great skill on the flute')).resolves.toMatchObject({
      flagged: false,
    });
  });
});
