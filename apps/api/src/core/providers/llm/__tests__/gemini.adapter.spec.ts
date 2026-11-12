import { loadConfig } from '../../../config';
import { GeminiLlmAdapter } from '../gemini.adapter';

const base = {
  DATABASE_URL: 'postgresql://u:p@localhost:5432/db',
  REDIS_URL: 'redis://localhost:6379',
  JWT_ACCESS_SECRET: 'x'.repeat(40),
  DATA_ENCRYPTION_KEY: Buffer.alloc(32, 2).toString('base64'),
  LLM_PROVIDER: 'gemini',
  GEMINI_API_KEY: 'gemini-test',
};

function reply(body: unknown, status = 200): Response {
  return new Response(JSON.stringify(body), { status });
}

describe('GeminiLlmAdapter', () => {
  afterEach(() => {
    jest.restoreAllMocks();
  });

  it('sends tools and the key, and maps function calls back to tool calls', async () => {
    const adapter = new GeminiLlmAdapter(loadConfig(base));
    const fetchMock = jest.spyOn(global, 'fetch').mockResolvedValue(
      reply({
        candidates: [
          {
            content: {
              role: 'model',
              parts: [{ functionCall: { name: 'get_aarti_schedule', args: { templeId: 't1' } } }],
            },
            finishReason: 'STOP',
          },
        ],
        usageMetadata: { promptTokenCount: 50, candidatesTokenCount: 8 },
      }),
    );
    const res = await adapter.complete({
      tier: 'default',
      system: '[task:chat] guide',
      messages: [{ role: 'user', text: 'Aarti time?' }],
      tools: [{ name: 'get_aarti_schedule', description: 'd', inputSchema: { properties: {} } }],
    });
    const [url, init] = fetchMock.mock.calls[0] as [string, RequestInit];
    expect(url).toContain('gemini-2.5-pro:generateContent');
    expect((init.headers as Record<string, string>)['x-goog-api-key']).toBe('gemini-test');
    expect(res.stopReason).toBe('tool_use');
    expect(res.toolCalls).toEqual([
      { id: 'get_aarti_schedule#0', name: 'get_aarti_schedule', input: { templeId: 't1' } },
    ]);
    expect(res.usage).toEqual({ inputTokens: 50, outputTokens: 8 });
  });

  it('turns rate limits into a provider-unavailable error', async () => {
    const adapter = new GeminiLlmAdapter(loadConfig(base));
    jest.spyOn(global, 'fetch').mockResolvedValue(reply({}, 429));
    await expect(
      adapter.complete({ tier: 'cheap', system: 's', messages: [{ role: 'user', text: 'x' }] }),
    ).rejects.toThrow();
  });

  it('requires the key', () => {
    expect(() => loadConfig({ ...base, GEMINI_API_KEY: '', NODE_ENV: 'production' })).toThrow();
  });
});
