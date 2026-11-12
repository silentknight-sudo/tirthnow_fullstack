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
  type LlmToolCall,
} from './llm.provider';

const BASE = 'https://generativelanguage.googleapis.com/v1beta/models';

interface GeminiPart {
  text?: string;
  thought?: boolean;
  functionCall?: { id?: string; name: string; args?: unknown };
  functionResponse?: { id?: string; name: string; response: Record<string, unknown> };
  thoughtSignature?: string;
}
interface GeminiContent {
  role: 'user' | 'model';
  parts: GeminiPart[];
}
interface GeminiResponse {
  candidates?: { content?: GeminiContent; finishReason?: string }[];
  promptFeedback?: { blockReason?: string };
  usageMetadata?: { promptTokenCount?: number; candidatesTokenCount?: number };
  modelVersion?: string;
}

/** Tool call ids carry the function name, because Gemini function responses are matched by name. */
const toolId = (name: string, i: number): string => `${name}#${String(i)}`;
const toolName = (id: string): string => id.split('#')[0] ?? id;

/**
 * Google Gemini (generateContent REST API, AI Studio key): tool use via function calling,
 * structured output via responseJsonSchema, SSE streaming.
 */
@Injectable()
export class GeminiLlmAdapter implements LlmProvider {
  readonly name = 'gemini';
  private readonly logger = new Logger(GeminiLlmAdapter.name);
  private readonly apiKey: string;
  private readonly models: Record<LlmTier, string>;

  constructor(@Inject(APP_CONFIG) config: AppConfig) {
    if (!config.ai.geminiApiKey) throw new Error('GEMINI_API_KEY is not configured');
    this.apiKey = config.ai.geminiApiKey;
    this.models = { default: config.ai.geminiModelDefault, cheap: config.ai.geminiModelCheap };
  }

  modelFor(tier: LlmTier): string {
    return this.models[tier];
  }

  async complete(req: LlmRequest): Promise<LlmResult> {
    const model = this.models[req.tier];
    const res = await this.post(`${model}:generateContent`, req);
    return this.toResult((await res.json()) as GeminiResponse, model);
  }

  async stream(req: LlmRequest, onText: (delta: string) => void): Promise<LlmResult> {
    const model = this.models[req.tier];
    const res = await this.post(`${model}:streamGenerateContent?alt=sse`, req);
    if (!res.body) return this.complete(req);
    const parts: GeminiPart[] = [];
    let last: GeminiResponse = {};
    const decoder = new TextDecoder();
    let buf = '';
    const reader = res.body.getReader();
    for (;;) {
      const chunk = (await reader.read()) as { done: boolean; value?: Uint8Array };
      if (chunk.done) break;
      const value = chunk.value ?? new Uint8Array();
      buf += decoder.decode(value, { stream: true });
      let nl: number;
      while ((nl = buf.indexOf('\n')) >= 0) {
        const line = buf.slice(0, nl).trim();
        buf = buf.slice(nl + 1);
        if (!line.startsWith('data:')) continue;
        const data = JSON.parse(line.slice(5)) as GeminiResponse;
        last = data;
        for (const p of data.candidates?.[0]?.content?.parts ?? []) {
          if (p.text && !p.thought) onText(p.text);
          parts.push(p);
        }
      }
    }
    const cand = last.candidates?.[0];
    return this.toResult(
      {
        ...last,
        candidates: [
          {
            content: { role: 'model', parts },
            ...(cand?.finishReason ? { finishReason: cand.finishReason } : {}),
          },
        ],
      },
      model,
    );
  }

  private async post(path: string, req: LlmRequest): Promise<Response> {
    let res: Response;
    try {
      res = await fetch(`${BASE}/${path}`, {
        method: 'POST',
        headers: { 'content-type': 'application/json', 'x-goog-api-key': this.apiKey },
        body: JSON.stringify(this.body(req)),
        signal: AbortSignal.timeout(120_000),
      });
    } catch (err) {
      this.logger.warn({ err }, 'Gemini API unreachable');
      throw new ProviderUnavailableError('gemini');
    }
    if (res.status === 429 || res.status >= 500) {
      this.logger.warn({ status: res.status }, 'Gemini API unavailable');
      throw new ProviderUnavailableError('gemini');
    }
    if (!res.ok) throw new Error(`Gemini API ${String(res.status)}: ${await res.text()}`);
    return res;
  }

  private body(req: LlmRequest): Record<string, unknown> {
    return {
      systemInstruction: { parts: [{ text: req.system }] },
      contents: req.messages.map(toContent),
      ...(req.tools?.length
        ? {
            tools: [
              {
                functionDeclarations: req.tools.map((t) => ({
                  name: t.name,
                  description: t.description,
                  parametersJsonSchema: { type: 'object', ...t.inputSchema },
                })),
              },
            ],
          }
        : {}),
      generationConfig: {
        maxOutputTokens: req.maxTokens ?? (req.tier === 'cheap' ? 2_000 : 16_000),
        ...(req.jsonSchema
          ? { responseMimeType: 'application/json', responseJsonSchema: req.jsonSchema }
          : {}),
      },
    };
  }

  private toResult(r: GeminiResponse, model: string): LlmResult {
    const cand = r.candidates?.[0];
    const parts = cand?.content?.parts ?? [];
    let text = '';
    const toolCalls: LlmToolCall[] = [];
    parts.forEach((p, i) => {
      if (p.text && !p.thought) text += p.text;
      if (p.functionCall)
        toolCalls.push({
          id: toolId(p.functionCall.name, i),
          name: p.functionCall.name,
          input: p.functionCall.args ?? {},
        });
    });
    const reason = cand?.finishReason;
    const refused =
      Boolean(r.promptFeedback?.blockReason) ||
      reason === 'SAFETY' ||
      reason === 'PROHIBITED_CONTENT' ||
      reason === 'BLOCKLIST';
    const stopReason: LlmStopReason = toolCalls.length
      ? 'tool_use'
      : refused
        ? 'refusal'
        : reason === 'MAX_TOKENS'
          ? 'max_tokens'
          : 'end';
    if (refused) this.logger.warn({ reason, model }, 'model declined the request');
    return {
      text,
      toolCalls,
      stopReason,
      raw: { role: 'model', parts } satisfies GeminiContent,
      model: r.modelVersion ?? model,
      usage: {
        inputTokens: r.usageMetadata?.promptTokenCount ?? 0,
        outputTokens: r.usageMetadata?.candidatesTokenCount ?? 0,
      },
    };
  }
}

function toContent(m: LlmMessage): GeminiContent {
  if (m.role === 'assistant') {
    return 'raw' in m ? (m.raw as GeminiContent) : { role: 'model', parts: [{ text: m.text }] };
  }
  if ('toolResults' in m) {
    return {
      role: 'user',
      parts: m.toolResults.map((r) => ({
        functionResponse: {
          name: toolName(r.toolCallId),
          response: r.isError ? { error: r.content } : { result: r.content },
        },
      })),
    };
  }
  return { role: 'user', parts: [{ text: m.text }] };
}
