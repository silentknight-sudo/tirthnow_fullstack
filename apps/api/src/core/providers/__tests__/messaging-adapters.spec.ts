import { loadConfig } from '../../config';
import { resetCircuits } from '../call-policy';
import { Msg91SmsAdapter } from '../sms/msg91.adapter';
import { SmsRejectedError } from '../sms/sms.provider';
import { MockTransitAdapter } from '../transit/mock.adapter';
import { MockWeatherAdapter } from '../weather/mock.adapter';
import { OpenWeatherAdapter } from '../weather/openweather.adapter';
import { MetaWhatsAppAdapter } from '../whatsapp/meta.adapter';

const base = {
  DATABASE_URL: 'postgresql://u:p@localhost:5432/db',
  REDIS_URL: 'redis://localhost:6379',
  JWT_ACCESS_SECRET: 'x'.repeat(40),
  DATA_ENCRYPTION_KEY: Buffer.alloc(32, 2).toString('base64'),
};

type FetchArgs = [string, RequestInit | undefined];
function mockFetch(...bodies: { status?: number; json: unknown }[]): jest.SpyInstance {
  const spy = jest.spyOn(global, 'fetch');
  for (const b of bodies) {
    spy.mockResolvedValueOnce(
      new Response(JSON.stringify(b.json), {
        status: b.status ?? 200,
        headers: { 'content-type': 'application/json' },
      }),
    );
  }
  return spy;
}
const call = (spy: jest.SpyInstance, i = 0) => spy.mock.calls[i] as FetchArgs;

afterEach(() => {
  jest.restoreAllMocks();
  resetCircuits();
});

describe('Msg91SmsAdapter', () => {
  const adapter = new Msg91SmsAdapter(
    loadConfig({
      ...base,
      SMS_PROVIDER: 'msg91',
      MSG91_AUTH_KEY: 'auth-key',
      MSG91_SENDER_ID: 'TIRTHN',
    }),
  );
  const msg = {
    to: '+919812345678',
    text: 'hello',
    templateId: 'dlt-123',
    variables: { name: 'Radha' },
    tag: 'sos_alert',
  };

  it('sends a DLT flow with variables and returns the request id', async () => {
    const spy = mockFetch({ json: { type: 'success', message: 'req-1' } });
    await expect(adapter.send(msg)).resolves.toEqual({ messageId: 'req-1' });
    const [url, init] = call(spy);
    expect(url).toBe('https://control.msg91.com/api/v5/flow');
    expect(init?.headers).toMatchObject({ authkey: 'auth-key' });
    expect(JSON.parse(init?.body as string)).toEqual({
      template_id: 'dlt-123',
      short_url: '0',
      recipients: [{ mobiles: '919812345678', name: 'Radha' }],
    });
  });

  it('refuses templates without a DLT id and gateway rejections permanently', async () => {
    await expect(adapter.send({ ...msg, templateId: null })).rejects.toBeInstanceOf(
      SmsRejectedError,
    );
    mockFetch({ json: { type: 'error', message: 'Invalid template' } });
    await expect(adapter.send(msg)).rejects.toThrow('Invalid template');
  });

  it('retries a 5xx once, then surfaces the error for the queue to retry', async () => {
    const spy = mockFetch({ status: 503, json: {} }, { status: 503, json: {} });
    await expect(adapter.send(msg)).rejects.toMatchObject({ status: 503 });
    expect(spy).toHaveBeenCalledTimes(2);
  });
});

describe('MetaWhatsAppAdapter', () => {
  it('sends an approved template with ordered body parameters', async () => {
    const adapter = new MetaWhatsAppAdapter(
      loadConfig({
        ...base,
        WHATSAPP_PROVIDER: 'meta',
        WHATSAPP_PHONE_NUMBER_ID: '1099',
        WHATSAPP_ACCESS_TOKEN: 'tok',
      }),
    );
    const spy = mockFetch({ json: { messages: [{ id: 'wamid.1' }] } });
    await expect(
      adapter.sendTemplate({
        to: '+919812345678',
        templateName: 'sos_alert',
        lang: 'hi',
        params: ['Radha', 'https://x/s/abc'],
        text: '',
      }),
    ).resolves.toEqual({ messageId: 'wamid.1' });
    const [url, init] = call(spy);
    expect(url).toBe('https://graph.facebook.com/v21.0/1099/messages');
    expect(init?.headers).toMatchObject({ authorization: 'Bearer tok' });
    expect(JSON.parse(init?.body as string)).toEqual({
      messaging_product: 'whatsapp',
      to: '919812345678',
      type: 'template',
      template: {
        name: 'sos_alert',
        language: { code: 'hi' },
        components: [
          {
            type: 'body',
            parameters: [
              { type: 'text', text: 'Radha' },
              { type: 'text', text: 'https://x/s/abc' },
            ],
          },
        ],
      },
    });
  });
});

describe('weather adapters', () => {
  it('maps OpenWeather current conditions', async () => {
    const adapter = new OpenWeatherAdapter(
      loadConfig({ ...base, WEATHER_PROVIDER: 'openweather', OPENWEATHER_API_KEY: 'ow' }),
    );
    mockFetch(
      {
        json: {
          dt: 1_790_000_000,
          weather: [{ main: 'Haze', description: 'haze' }],
          main: { temp: 33.26, feels_like: 37.9, humidity: 58 },
          wind: { speed: 2.5 },
          sys: { sunrise: 1_789_960_000, sunset: 1_790_002_000 },
        },
      },
      { json: { list: [] } },
    );
    const r = await adapter.report({ lat: 27.57, lng: 77.66 });
    expect(r.now).toMatchObject({
      tempC: 33.3,
      feelsLikeC: 37.9,
      humidityPct: 58,
      windKph: 9,
      condition: 'haze',
      description: 'haze',
    });
    expect(r.daily).toEqual([]);
  });

  it('mock weather follows the Braj seasons', async () => {
    const mock = new MockWeatherAdapter();
    const may = await mock.report({ lat: 27.57, lng: 77.66 }, new Date('2026-05-15T09:00:00Z'));
    const jan = await mock.report({ lat: 27.57, lng: 77.66 }, new Date('2026-01-15T00:30:00Z'));
    expect(may.daily[0]?.maxC).toBeGreaterThanOrEqual(40);
    expect(jan.daily[0]?.condition).toBe('fog');
    expect(jan.now.tempC).toBeLessThan(may.now.tempC);
  });
});

describe('MockTransitAdapter', () => {
  const transit = new MockTransitAdapter();
  it('finds stations by code, name or city', async () => {
    expect((await transit.stations('MTJ')).map((s) => s.code)).toEqual(['MTJ']);
    expect((await transit.stations('delhi')).map((s) => s.code)).toEqual(['NDLS', 'NZM']);
  });

  it('honours running days and computes overnight arrivals', async () => {
    // 2026-10-12 is a Monday; the Chambal Express runs Tue/Fri only.
    expect(await transit.search('AGC', 'MTJ', '2026-10-12')).toEqual([]);
    expect((await transit.search('AGC', 'MTJ', '2026-10-13')).map((t) => t.number)).toEqual([
      '12176',
    ]);
    const [rajdhani] = await transit.search('BCT', 'MTJ', '2026-10-12');
    expect(rajdhani).toMatchObject({ arrivalDayOffset: 1, durationMin: 893 });
  });
});
