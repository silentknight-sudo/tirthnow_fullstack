import type Anthropic from '@anthropic-ai/sdk';
import { loadConfig } from '../../../config';
import { AnthropicLlmAdapter } from '../anthropic.adapter';

const base = {
  DATABASE_URL: 'postgresql://u:p@localhost:5432/db',
  REDIS_URL: 'redis://localhost:6379',
  JWT_ACCESS_SECRET: 'x'.repeat(40),
  DATA_ENCRYPTION_KEY: Buffer.alloc(32, 2).toString('base64'),
  LLM_PROVIDER: 'anthropic',
  ANTHROPIC_API_KEY: 'sk-ant-test',
};

function stubbed() {
  const adapter = new AnthropicLlmAdapter(loadConfig(base));
  const client = Reflect.get(adapter, 'client') as Anthropic;
  const reply = {
    id: 'msg_1',
    model: 'claude-opus-5-5',
    stop_reason: 'tool_use',
    stop_details: null,
    content: [
      { type: 'thinking', thinking: '', signature: 'sig' },
      {
        type: 'tool_use',
        id: 'toolu_1',
        name: 'get_aarti_schedule',
        input: { templeId: 't1', date: null },
      },
    ],
    usage: { input_tokens: 120, output_tokens: 30 },
  };
  const create = jest.spyOn(client.beta.messages, 'create').mockResolvedValue(reply as never);
  return { adapter, create, reply };
}

describe('AnthropicLlmAdapter', () => {
  it('uses the configured models, effort, strict tools and the refusal fallback on Opus', async () => {
    const { adapter, create } = stubbed();
    expect([adapter.modelFor('default'), adapter.modelFor('cheap')]).toEqual([
      'claude-opus-5-5',
      'claude-haiku-5-5',
    ]);
    const res = await adapter.complete({
      tier: 'default',
      system: 'sys',
      messages: [{ role: 'user', text: 'When is aarti?' }],
      tools: [
        {
          name: 'get_aarti_schedule',
          description: 'd',
          inputSchema: { properties: {}, required: [], additionalProperties: false },
        },
      ],
    });
    const params = create.mock.calls[0]?.[0] as unknown as Record<string, unknown>;
    expect(params).toMatchObject({
      model: 'claude-opus-5-5',
      max_tokens: 16_000,
      output_config: { effort: 'medium' },
      betas: ['server-side-fallback-2026-07-01'],
      fallbacks: 'default',
      tool_choice: { type: 'auto' },
      system: [{ type: 'text', text: 'sys', cache_control: { type: 'ephemeral' } }],
    });
    expect(params.tools).toEqual([
      {
        name: 'get_aarti_schedule',
        description: 'd',
        input_schema: { type: 'object', properties: {}, required: [], additionalProperties: false },
        strict: true,
      },
    ]);
    expect(params).not.toHaveProperty('thinking');
    expect(res).toMatchObject({
      stopReason: 'tool_use',
      toolCalls: [{ id: 'toolu_1', name: 'get_aarti_schedule' }],
      usage: { inputTokens: 120, outputTokens: 30 },
    });
  });

  it('replays assistant content verbatim and sends tool results; cheap tier has no fallback', async () => {
    const { adapter, create, reply } = stubbed();
    await adapter.complete({
      tier: 'cheap',
      system: 's',
      jsonSchema: { type: 'object' },
      messages: [
        { role: 'user', text: 'q' },
        { role: 'assistant', raw: reply.content },
        {
          role: 'user',
          toolResults: [{ toolCallId: 'toolu_1', content: 'Mangala Arati: 04:30', isError: false }],
        },
      ],
    });
    const params = create.mock.calls[0]?.[0] as unknown as Record<string, unknown>;
    expect(params).toMatchObject({
      model: 'claude-haiku-5-5',
      max_tokens: 2_000,
      output_config: { effort: 'low', format: { type: 'json_schema', schema: { type: 'object' } } },
    });
    expect(params).not.toHaveProperty('fallbacks');
    expect(params.messages).toEqual([
      { role: 'user', content: 'q' },
      { role: 'assistant', content: reply.content },
      {
        role: 'user',
        content: [{ type: 'tool_result', tool_use_id: 'toolu_1', content: 'Mangala Arati: 04:30' }],
      },
    ]);
  });
});
