import { createHash } from 'node:crypto';
import { Inject, Injectable, Logger } from '@nestjs/common';
import { type ChatMessage, type ChatSession, type Prisma } from '@prisma/client';
import { type AiCitation, ERROR_CODES, type Lang } from '@tirth-now/shared-types';
import { type AuthPrincipal } from '../../../core/auth';
import { APP_CONFIG, type AppConfig } from '../../../core/config';
import { CacheService } from '../../../core/cache';
import { AppException, afterCursor, NEWEST_FIRST, pageSize, toPage } from '../../../core/http';
import { PrismaService } from '../../../core/prisma';
import {
  LLM_PROVIDER,
  type LlmMessage,
  type LlmProvider,
  MODERATION_PROVIDER,
  type ModerationProvider,
} from '../../../core/providers';
import { istDate } from '../../../core/time';
import { CatalogFacade } from '../../catalog';
import { type CreateChatSessionDto } from '../dto/ai.dto';
import { AI_TOOLS, AiToolsService } from './ai-tools';
import { KnowledgeService, type RetrievedChunk } from './knowledge.service';
import { QuotaService } from './quota.service';

const HISTORY_TURNS = 10;
const MAX_TOOL_ROUNDS = 4;
const SUMMARIZE_AFTER = 16;

export type ChatEmit = (event: 'token' | 'citation' | 'done' | 'error', data: object) => void;

interface Prepared {
  session: ChatSession;
  userMessage: ChatMessage;
  lang: Lang;
}

const REFUSAL: Record<Lang, string> = {
  en: 'I can help with temples, aarti times, festivals, parikrama, travel and safety in Braj. Could you ask me something about your yatra?',
  hi: 'मैं ब्रज के मंदिरों, आरती के समय, त्योहारों, परिक्रमा, यात्रा और सुरक्षा के बारे में मदद कर सकता हूँ। अपनी यात्रा से जुड़ा कुछ पूछिए।',
};
const UNSAFE: Record<Lang, string> = {
  en: 'Sorry, I could not answer that properly. Please try asking in a different way.',
  hi: 'क्षमा करें, मैं इसका सही उत्तर नहीं दे सका। कृपया दूसरे तरीके से पूछें।',
};

const CLASSIFY_SCHEMA = {
  type: 'object',
  properties: { onTopic: { type: 'boolean' }, reason: { type: 'string' } },
  required: ['onTopic', 'reason'],
  additionalProperties: false,
};

const CLASSIFY_SYSTEM = `[task:classify]
Decide whether a message to a pilgrimage travel guide for the Braj region (Mathura, Vrindavan, Govardhan, Barsana, Nandgaon, Gokul) is on topic.
On topic: temples, deities and their stories, aarti/darshan, festivals, rituals and etiquette, parikrama, food, stays, transport, weather, shopping, safety, and greetings or follow-ups in an ongoing chat.
Off topic: anything unrelated (coding, finance, politics, homework, general trivia). Reply with JSON only.`;

/** Normalised first-question cache key (answers that used tools are never cached: times change daily). */
const cacheKey = (text: string, cityId: string | null, lang: Lang) =>
  `ai-answer:${createHash('sha256')
    .update(
      `${text
        .toLowerCase()
        .replace(/[^\p{L}\p{M}\p{N}]+/gu, ' ')
        .trim()}|${cityId ?? ''}|${lang}`,
    )
    .digest('hex')}`;

interface CachedAnswer {
  text: string;
  citations: AiCitation[];
}

@Injectable()
export class ChatService {
  private readonly logger = new Logger(ChatService.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly knowledge: KnowledgeService,
    private readonly tools: AiToolsService,
    private readonly quota: QuotaService,
    private readonly catalog: CatalogFacade,
    private readonly cache: CacheService,
    @Inject(LLM_PROVIDER) private readonly llm: LlmProvider,
    @Inject(MODERATION_PROVIDER) private readonly moderation: ModerationProvider,
    @Inject(APP_CONFIG) private readonly config: AppConfig,
  ) {}

  // ───────────── sessions ─────────────

  async createSession(user: AuthPrincipal, dto: CreateChatSessionDto, lang: Lang) {
    const cityId = dto.city ? await this.catalog.cityIdBySlug(dto.city) : undefined;
    const s = await this.prisma.chatSession.create({
      data: { userId: user.userId, lang: dto.lang ?? lang, cityId: cityId ?? null },
    });
    return sessionResponse(s);
  }

  async listSessions(user: AuthPrincipal, q: { cursor?: string; limit?: number }) {
    const limit = pageSize(q.limit);
    const rows = await this.prisma.chatSession.findMany({
      where: { userId: user.userId, ...afterCursor(q.cursor) },
      orderBy: NEWEST_FIRST,
      take: limit + 1,
    });
    return toPage(rows, limit, sessionResponse);
  }

  async getSession(user: AuthPrincipal, id: string) {
    const s = await this.owned(user, id);
    const messages = await this.prisma.chatMessage.findMany({
      where: { sessionId: id, role: { in: ['user', 'assistant'] } },
      orderBy: { createdAt: 'asc' },
      take: 200,
    });
    return { ...sessionResponse(s), messages: messages.map(messageResponse) };
  }

  async deleteSession(user: AuthPrincipal, id: string): Promise<void> {
    await this.owned(user, id);
    await this.prisma.chatSession.delete({ where: { id } });
  }

  // ───────────── a turn ─────────────

  /** Checks that must fail as normal HTTP errors, before the SSE stream opens. */
  async prepare(user: AuthPrincipal, sessionId: string, content: string): Promise<Prepared> {
    const session = await this.owned(user, sessionId);
    await this.quota.consume(user);
    const userMessage = await this.prisma.chatMessage.create({
      data: { sessionId, role: 'user', content: content.trim() },
    });
    return { session, userMessage, lang: session.lang === 'hi' ? 'hi' : 'en' };
  }

  async run(user: AuthPrincipal, p: Prepared, emit: ChatEmit): Promise<void> {
    const started = Date.now();
    const question = p.userMessage.content;
    let inputTokens = 0;
    let outputTokens = 0;
    try {
      const verdict = await this.llm.complete({
        tier: 'cheap',
        system: CLASSIFY_SYSTEM,
        messages: [{ role: 'user', text: question }],
        jsonSchema: CLASSIFY_SCHEMA,
        maxTokens: 200,
        effort: 'low',
      });
      inputTokens += verdict.usage.inputTokens;
      outputTokens += verdict.usage.outputTokens;
      if (!this.onTopic(verdict.text)) {
        await this.finish(
          user,
          p,
          {
            text: REFUSAL[p.lang],
            citations: [],
            toolCalls: [],
            model: verdict.model,
            inputTokens,
            outputTokens,
            started,
            flagged: false,
          },
          emit,
          true,
        );
        return;
      }

      const priorCount = await this.prisma.chatMessage.count({
        where: { sessionId: p.session.id, id: { not: p.userMessage.id } },
      });
      const key = cacheKey(question, p.session.cityId, p.lang);
      if (priorCount === 0 && this.config.ai.responseCacheSeconds > 0) {
        const hit = await this.cache.get<CachedAnswer>(key);
        if (hit) {
          for (const word of hit.text.match(/\S+\s*/g) ?? []) emit('token', { text: word });
          await this.finish(
            user,
            p,
            {
              text: hit.text,
              citations: hit.citations,
              toolCalls: [],
              model: 'cache',
              inputTokens: 0,
              outputTokens: 0,
              started,
              flagged: false,
            },
            emit,
            false,
          );
          return;
        }
      }

      const sources = await this.knowledge.search(question, { cityId: p.session.cityId });
      const system = await this.systemPrompt(p.session, p.lang, sources);
      const history = await this.history(p.session.id, p.userMessage.id);
      const messages: LlmMessage[] = [...history, { role: 'user', text: question }];
      const toolLog: { name: string; input: unknown; output: string }[] = [];
      let text = '';
      let model = '';
      for (let round = 0; round <= MAX_TOOL_ROUNDS; round++) {
        const res = await this.llm.stream(
          {
            tier: 'default',
            system,
            messages,
            tools: round < MAX_TOOL_ROUNDS ? AI_TOOLS : [],
            maxTokens: 4_000,
          },
          (delta) => {
            emit('token', { text: delta });
          },
        );
        inputTokens += res.usage.inputTokens;
        outputTokens += res.usage.outputTokens;
        model = res.model;
        text += res.text;
        if (res.stopReason !== 'tool_use' || res.toolCalls.length === 0) {
          if (res.stopReason === 'refusal' && !text.trim()) text = UNSAFE[p.lang];
          break;
        }
        const results = await Promise.all(res.toolCalls.map((c) => this.tools.run(c, p.lang)));
        res.toolCalls.forEach((c, i) =>
          toolLog.push({ name: c.name, input: c.input, output: results[i]?.content ?? '' }),
        );
        messages.push({ role: 'assistant', raw: res.raw }, { role: 'user', toolResults: results });
      }

      const check = await this.moderation.moderateText(text);
      const flagged = check.flagged;
      if (flagged) text = UNSAFE[p.lang];
      const citations = flagged ? [] : citationsIn(text, sources);
      const answer = {
        text,
        citations,
        toolCalls: toolLog,
        model,
        inputTokens,
        outputTokens,
        started,
        flagged,
      };
      await this.finish(user, p, answer, emit, false);
      if (
        priorCount === 0 &&
        toolLog.length === 0 &&
        !flagged &&
        this.config.ai.responseCacheSeconds > 0
      ) {
        await this.cache.set(
          key,
          { text, citations } satisfies CachedAnswer,
          this.config.ai.responseCacheSeconds,
        );
      }
      if (priorCount + 2 >= SUMMARIZE_AFTER && (priorCount + 2) % 8 === 0)
        await this.summarize(p.session.id);
    } catch (err) {
      this.logger.error({ err, sessionId: p.session.id }, 'chat turn failed');
      const code = err instanceof AppException ? err.code : ERROR_CODES.PROVIDER_UNAVAILABLE;
      emit('error', {
        code,
        message: 'The guide is unavailable right now. Please try again shortly.',
      });
    }
  }

  private onTopic(json: string): boolean {
    try {
      return (JSON.parse(json) as { onTopic?: unknown }).onTopic !== false;
    } catch {
      return true; // a classifier hiccup must not block travellers
    }
  }

  private async finish(
    user: AuthPrincipal,
    p: Prepared,
    a: {
      text: string;
      citations: AiCitation[];
      toolCalls: unknown[];
      model: string;
      inputTokens: number;
      outputTokens: number;
      started: number;
      flagged: boolean;
    },
    emit: ChatEmit,
    streamText: boolean,
  ): Promise<void> {
    if (streamText) for (const word of a.text.match(/\S+\s*/g) ?? []) emit('token', { text: word });
    for (const c of a.citations) emit('citation', c);
    const saved = await this.prisma.chatMessage.create({
      data: {
        sessionId: p.session.id,
        role: 'assistant',
        content: a.text,
        citations: a.citations as unknown as Prisma.InputJsonArray,
        ...(a.toolCalls.length ? { toolCalls: a.toolCalls as Prisma.InputJsonArray } : {}),
        model: a.model,
        inputTokens: a.inputTokens,
        outputTokens: a.outputTokens,
        latencyMs: Date.now() - a.started,
        flagged: a.flagged,
      },
    });
    await this.prisma.chatSession.update({
      where: { id: p.session.id },
      data: {
        lastMessageAt: new Date(),
        ...(p.session.title ? {} : { title: p.userMessage.content.slice(0, 80) }),
      },
    });
    await this.quota.record(user.userId, {
      inputTokens: a.inputTokens,
      outputTokens: a.outputTokens,
    });
    const status = await this.quota.status(user);
    emit('done', {
      messageId: saved.id,
      userMessageId: p.userMessage.id,
      model: a.model,
      remainingQuota: status.remaining,
    });
  }

  private async systemPrompt(
    session: ChatSession,
    lang: Lang,
    sources: RetrievedChunk[],
  ): Promise<string> {
    const city = session.cityId
      ? (await this.catalog.citySlugs()).find((c) => c.id === session.cityId)
      : undefined;
    const temples = (await this.catalog.temples(city ? { city: city.slug } : {}, lang)).slice(
      0,
      40,
    );
    const parts = [
      `[task:chat]
You are the Tirth Now guide for pilgrims and travellers in Braj: Mathura, Vrindavan, Govardhan, Barsana, Nandgaon and Gokul.
Answer in ${lang === 'hi' ? 'Hindi (Devanagari), or Hinglish if the traveller writes in Hinglish' : 'English, switching to Hindi if the traveller writes in Hindi'}. People read on a phone while travelling: be warm, brief and practical.

Aarti and darshan times: state only times returned by get_aarti_schedule for the specific temple and date. If it returns nothing, say the time is not published and suggest checking with the temple. Never estimate or recall times from memory; they change by season and festival.
Facts about temples, stories and customs: use the SOURCES below and cite them inline as [n]. If the sources do not cover a question, say so briefly rather than guessing.
For weather questions use get_weather. In an emergency, tell the traveller to press SOS in the app or call 112.
Today is ${istDate(new Date())} (IST).${city ? ` The traveller is in or planning ${city.name}.` : ''}`,
      `KNOWN TEMPLES:\n${temples.map((t) => `- ${t.name} (id: ${t.id})`).join('\n')}`,
    ];
    if (session.memorySummary)
      parts.push(`EARLIER IN THIS CONVERSATION:\n${session.memorySummary}`);
    parts.push(
      sources.length
        ? `SOURCES:\n${sources.map((s, i) => `[${String(i + 1)}] ${s.title}\n${s.content}`).join('\n\n')}`
        : 'SOURCES: none found for this question.',
    );
    return parts.join('\n\n');
  }

  private async history(sessionId: string, excludeId: string): Promise<LlmMessage[]> {
    const rows = await this.prisma.chatMessage.findMany({
      where: {
        sessionId,
        id: { not: excludeId },
        role: { in: ['user', 'assistant'] },
        flagged: false,
      },
      orderBy: { createdAt: 'desc' },
      take: HISTORY_TURNS,
    });
    const msgs = rows
      .reverse()
      .map((m): LlmMessage =>
        m.role === 'user'
          ? { role: 'user', text: m.content }
          : { role: 'assistant', text: m.content },
      );
    // The conversation must start with a user turn.
    while (msgs[0]?.role === 'assistant') msgs.shift();
    return msgs;
  }

  /** Long chats keep a rolling summary so context stays small (cheap model). */
  private async summarize(sessionId: string): Promise<void> {
    try {
      const rows = await this.prisma.chatMessage.findMany({
        where: { sessionId, role: { in: ['user', 'assistant'] } },
        orderBy: { createdAt: 'asc' },
        take: 60,
      });
      const transcript = rows
        .map((m) => `${m.role}: ${m.content}`)
        .join('\n')
        .slice(-12_000);
      const r = await this.llm.complete({
        tier: 'cheap',
        system:
          '[task:summarize]\nSummarise this pilgrimage-planning chat in under 120 words: who is travelling, dates, places, preferences and open questions. Plain text.',
        messages: [{ role: 'user', text: transcript }],
        maxTokens: 400,
        effort: 'low',
      });
      await this.prisma.chatSession.update({
        where: { id: sessionId },
        data: { memorySummary: r.text.slice(0, 2_000) },
      });
    } catch (err) {
      this.logger.warn({ err, sessionId }, 'chat summary failed');
    }
  }

  private async owned(user: AuthPrincipal, id: string): Promise<ChatSession> {
    const s = await this.prisma.chatSession.findFirst({ where: { id, userId: user.userId } });
    if (!s) throw AppException.notFound('Chat not found');
    return s;
  }
}

/** [n] markers the answer actually uses → source documents. */
export function citationsIn(text: string, sources: RetrievedChunk[]): AiCitation[] {
  const used = new Set([...text.matchAll(/\[(\d{1,2})\]/g)].map((m) => Number(m[1])));
  return [...used]
    .sort((a, b) => a - b)
    .flatMap((n) => {
      const s = sources[n - 1];
      return s ? [{ n, documentId: s.documentId, title: s.title, sourceRef: s.sourceRef }] : [];
    });
}

function sessionResponse(s: ChatSession) {
  return {
    id: s.id,
    title: s.title,
    lang: s.lang,
    cityId: s.cityId,
    lastMessageAt: s.lastMessageAt?.toISOString() ?? null,
    createdAt: s.createdAt.toISOString(),
  };
}

function messageResponse(m: ChatMessage) {
  return {
    id: m.id,
    role: m.role,
    content: m.content,
    citations: m.citations ?? [],
    createdAt: m.createdAt.toISOString(),
  };
}
