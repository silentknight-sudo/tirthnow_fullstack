import { Injectable } from '@nestjs/common';
import { MockModerationAdapter } from '../moderation/mock.adapter';
import {
  type LlmMessage,
  type LlmProvider,
  type LlmRequest,
  type LlmResult,
  type LlmTier,
} from './llm.provider';

const OFF_TOPIC =
  /\b(bitcoin|crypto|stock market|election|write (?:me )?code|python script|homework|cricket score)\b/i;
const AARTI = /(aarti|arati|आरती|darshan time|timing|kab khul|what time)/i;

/** Mock-only: last user text in the conversation. */
function lastUserText(messages: LlmMessage[]): string {
  for (let i = messages.length - 1; i >= 0; i--) {
    const m = messages[i];
    if (m?.role === 'user' && 'text' in m) return m.text;
  }
  return '';
}

function toolResultsAfterLastUserText(messages: LlmMessage[]): string[] {
  const out: string[] = [];
  for (let i = messages.length - 1; i >= 0; i--) {
    const m = messages[i];
    if (!m) continue;
    if (m.role === 'user' && 'text' in m) break;
    if (m.role === 'user' && 'toolResults' in m)
      out.unshift(...m.toolResults.map((r) => r.content));
  }
  return out;
}

/**
 * Deterministic stand-in for Claude (docs/INTEGRATIONS.md). AI services tag their system
 * prompt with `[task:<name>]`; the mock answers each task from the data in the prompt, so
 * everything works offline and tests are stable. It never invents aarti times: those only
 * appear when a tool result supplied them.
 */
@Injectable()
export class MockLlmAdapter implements LlmProvider {
  readonly name = 'mock';
  private readonly moderation = new MockModerationAdapter();
  /** Requests seen, newest last (tests assert on prompts). */
  readonly calls: LlmRequest[] = [];

  modelFor(tier: LlmTier): string {
    return tier === 'cheap' ? 'mock-cheap' : 'mock-default';
  }

  async complete(req: LlmRequest): Promise<LlmResult> {
    this.calls.push(req);
    if (this.calls.length > 200) this.calls.shift();
    const task = /^\[task:([a-z_]+)\]/.exec(req.system)?.[1] ?? 'chat';
    const user = lastUserText(req.messages);
    switch (task) {
      case 'classify':
        return this.json(req, {
          onTopic: !OFF_TOPIC.test(user),
          reason: OFF_TOPIC.test(user)
            ? 'not about pilgrimage or travel in Braj'
            : 'travel question',
        });
      case 'moderate': {
        const r = await this.moderation.moderateText(user);
        return this.json(req, { flagged: r.flagged, categories: r.categories });
      }
      case 'summarize':
        return this.text(req, `Earlier the traveller asked about: ${user.slice(0, 200)}`);
      case 'plan':
        return this.json(req, mockPlan(user));
      default:
        return this.chat(req, user);
    }
  }

  async stream(req: LlmRequest, onText: (delta: string) => void): Promise<LlmResult> {
    const result = await this.complete(req);
    for (const word of result.text.match(/\S+\s*/g) ?? []) onText(word);
    return result;
  }

  private chat(req: LlmRequest, user: string): LlmResult {
    const results = toolResultsAfterLastUserText(req.messages);
    const aartiTool = req.tools?.find((t) => t.name === 'get_aarti_schedule');
    if (aartiTool && AARTI.test(user) && results.length === 0) {
      // Pick the temple the user named (from the KNOWN TEMPLES list in the prompt), else the first.
      const temples = [...req.system.matchAll(/^- (.+?) \(id: ([0-9a-f-]{36})\)$/gm)].map((m) => ({
        name: m[1] ?? '',
        id: m[2] ?? '',
      }));
      const lower = user.toLowerCase();
      const named =
        temples.find((t) =>
          t.name
            .toLowerCase()
            .split(/\s+/)
            .some((w) => w.length > 4 && lower.includes(w)),
        ) ?? temples[0];
      if (named) {
        const call = {
          id: `toolu_mock_${String(this.calls.length)}`,
          name: 'get_aarti_schedule',
          input: { templeId: named.id, date: null },
        };
        return {
          text: '',
          toolCalls: [call],
          stopReason: 'tool_use',
          raw: [{ type: 'tool_use', ...call }],
          model: this.modelFor(req.tier),
          usage: usage(req, 20),
        };
      }
    }
    const sources = [...req.system.matchAll(/^\[(\d+)\] (.+)$/gm)].map((m) => ({
      n: m[1] ?? '',
      title: m[2] ?? '',
    }));
    const parts: string[] = [];
    if (results.length) parts.push(`From the temple's published schedule: ${results.join(' ')}`);
    if (sources[0]) parts.push(`${sources[0].title} [${sources[0].n}].`);
    if (parts.length === 0)
      parts.push(
        'I could not find that in my Braj guide yet. Please check with the temple office.',
      );
    return this.text(req, `Radhe Radhe! ${parts.join(' ')}`);
  }

  private text(req: LlmRequest, text: string): LlmResult {
    return {
      text,
      toolCalls: [],
      stopReason: 'end',
      raw: [{ type: 'text', text }],
      model: this.modelFor(req.tier),
      usage: usage(req, Math.ceil(text.length / 4)),
    };
  }

  private json(req: LlmRequest, value: unknown): LlmResult {
    return this.text(req, JSON.stringify(value));
  }
}

function usage(req: LlmRequest, output: number) {
  const input =
    req.system.length + req.messages.reduce((n, m) => n + ('text' in m ? m.text.length : 50), 0);
  return { inputTokens: Math.ceil(input / 4), outputTokens: output };
}

interface Candidate {
  ref: string;
  dayIndex: number;
  kind: string;
  title: string;
}

/** Planner mock: keeps every offered candidate in order (the planner validates refs). */
function mockPlan(user: string): unknown {
  const marker = user.indexOf('CANDIDATES_JSON:');
  if (marker < 0) return { title: 'Braj yatra', days: [] };
  const parsed = JSON.parse(user.slice(marker + 'CANDIDATES_JSON:'.length)) as {
    title?: string;
    days: { dayIndex: number; candidates: Candidate[] }[];
  };
  return {
    title: parsed.title ?? 'Braj yatra',
    days: parsed.days.map((d) => ({
      dayIndex: d.dayIndex,
      note: `Day ${String(d.dayIndex + 1)}: start early to beat the crowds.`,
      items: d.candidates.map((c) => ({ ref: c.ref, note: null })),
    })),
  };
}
