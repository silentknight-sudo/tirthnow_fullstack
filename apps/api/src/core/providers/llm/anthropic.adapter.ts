import Anthropic from '@anthropic-ai/sdk';
import { Inject, Injectable, Logger } from '@nestjs/common';
import { APP_CONFIG, type AppConfig } from '../../config';
import { ProviderUnavailableError } from '../call-policy';
import {
  type LlmMessage,
  type LlmProvider,
  type LlmRequest,
  type LlmResult,
  type LlmStopReason,
  type LlmTier,
} from './llm.provider';

type Params = Anthropic.Beta.Messages.MessageCreateParamsNonStreaming;

/** Models that accept the server-side refusal fallback (`fallbacks: "default"`). */
const FALLBACK_MODELS = new Set([
  'claude-fable-5-1',
  'claude-opus-5-5',
  'claude-opus-5',
  'claude-sonnet-5-5',
]);
const FALLBACK_BETA = 'server-side-fallback-2026-07-01';

/** Claude Messages API via the official SDK (adaptive thinking, effort, tool use, structured output). */
@Injectable()
export class AnthropicLlmAdapter implements LlmProvider {
  readonly name = 'anthropic';
  private readonly logger = new Logger(AnthropicLlmAdapter.name);
  private readonly client: Anthropic;
  private readonly models: Record<LlmTier, string>;

  constructor(@Inject(APP_CONFIG) config: AppConfig) {
    if (!config.ai.anthropicApiKey) throw new Error('ANTHROPIC_API_KEY is not configured');
    // The SDK retries 408/409/429/5xx and connection errors itself.
    this.client = new Anthropic({
      apiKey: config.ai.anthropicApiKey,
      maxRetries: 2,
      timeout: 120_000,
    });
    this.models = { default: config.ai.modelDefault, cheap: config.ai.modelCheap };
  }

  modelFor(tier: LlmTier): string {
    return this.models[tier];
  }

  async complete(req: LlmRequest): Promise<LlmResult> {
    const params = this.params(req);
    try {
      return this.toResult(await this.client.beta.messages.create(params));
    } catch (err) {
      throw this.wrap(err);
    }
  }

  async stream(req: LlmRequest, onText: (delta: string) => void): Promise<LlmResult> {
    try {
      const stream = this.client.beta.messages.stream(this.params(req));
      stream.on('text', (delta) => {
        onText(delta);
      });
      return this.toResult(await stream.finalMessage());
    } catch (err) {
      throw this.wrap(err);
    }
  }

  private params(req: LlmRequest): Params {
    const model = this.models[req.tier];
    const fallback = FALLBACK_MODELS.has(model);
    return {
      model,
      max_tokens: req.maxTokens ?? (req.tier === 'cheap' ? 2_000 : 16_000),
      system: [{ type: 'text', text: req.system, cache_control: { type: 'ephemeral' } }],
      messages: req.messages.map(toParam),
      ...(req.tools?.length
        ? {
            tools: req.tools.map((t) => ({
              name: t.name,
              description: t.description,
              input_schema: { type: 'object' as const, ...t.inputSchema },
              strict: true,
            })),
            tool_choice: { type: 'auto' as const },
          }
        : {}),
      output_config: {
        effort: req.effort ?? (req.tier === 'cheap' ? 'low' : 'medium'),
        ...(req.jsonSchema
          ? { format: { type: 'json_schema' as const, schema: req.jsonSchema } }
          : {}),
      },
      // A policy decline is retried server-side on a suitable model instead of failing.
      ...(fallback ? { betas: [FALLBACK_BETA], fallbacks: 'default' as const } : {}),
    };
  }

  private toResult(m: Anthropic.Beta.Messages.BetaMessage): LlmResult {
    let text = '';
    const toolCalls: LlmResult['toolCalls'] = [];
    for (const block of m.content) {
      if (block.type === 'text') text += block.text;
      else if (block.type === 'tool_use')
        toolCalls.push({ id: block.id, name: block.name, input: block.input });
    }
    const stop: LlmStopReason =
      m.stop_reason === 'tool_use'
        ? 'tool_use'
        : m.stop_reason === 'max_tokens'
          ? 'max_tokens'
          : m.stop_reason === 'refusal'
            ? 'refusal'
            : 'end';
    if (stop === 'refusal')
      this.logger.warn(
        { category: m.stop_details?.category ?? null, model: m.model },
        'model declined the request',
      );
    return {
      text,
      toolCalls,
      stopReason: stop,
      raw: m.content,
      model: m.model,
      usage: { inputTokens: m.usage.input_tokens, outputTokens: m.usage.output_tokens },
    };
  }

  /** Rate limits and outages surface as 503 PROVIDER_UNAVAILABLE; everything else is a bug. */
  private wrap(err: unknown): unknown {
    if (
      err instanceof Anthropic.RateLimitError ||
      err instanceof Anthropic.InternalServerError ||
      err instanceof Anthropic.APIConnectionError
    ) {
      this.logger.warn({ err }, 'Claude API unavailable');
      return new ProviderUnavailableError('anthropic');
    }
    return err;
  }
}

function toParam(m: LlmMessage): Anthropic.Beta.Messages.BetaMessageParam {
  if (m.role === 'assistant') {
    return 'raw' in m
      ? { role: 'assistant', content: m.raw as Anthropic.Beta.Messages.BetaContentBlockParam[] }
      : { role: 'assistant', content: m.text };
  }
  if ('toolResults' in m) {
    return {
      role: 'user',
      content: m.toolResults.map((r) => ({
        type: 'tool_result' as const,
        tool_use_id: r.toolCallId,
        content: r.content,
        ...(r.isError ? { is_error: true } : {}),
      })),
    };
  }
  return { role: 'user', content: m.text };
}
