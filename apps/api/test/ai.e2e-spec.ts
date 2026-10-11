import { MockLlmAdapter } from '../src/core/providers';
import { addDays, istDate } from '../src/core/time';
import { AiProcessor } from '../src/modules/ai';
import { MediaProcessor } from '../src/modules/files';
import { type CatalogFixture, pngBytes, seedCatalog } from './fixtures';
import {
  adminToken,
  bearer,
  createTestApp,
  drainQueue,
  PDF_BYTES,
  resetState,
  signInMobile,
  type TestApp,
  uploadFile,
} from './helpers';

interface SseEvent {
  event: string;
  data: Record<string, unknown>;
}

function parseSse(text: string): SseEvent[] {
  return text
    .split('\n\n')
    .filter((b) => b.trim())
    .map((block) => {
      const event = /^event: (.+)$/m.exec(block)?.[1] ?? '';
      const data = /^data: (.+)$/m.exec(block)?.[1] ?? '{}';
      return { event, data: JSON.parse(data) as Record<string, unknown> };
    });
}

const answerOf = (events: SseEvent[]) =>
  events
    .filter((e) => e.event === 'token')
    .map((e) => String(e.data.text))
    .join('');

describe('AI guide', () => {
  let t: TestApp;
  let fx: CatalogFixture;
  let admin: string;
  let user: { token: string; userId: string };
  let llm: MockLlmAdapter;

  beforeAll(async () => {
    t = await createTestApp({ env: { AI_DAILY_QUOTA_USER: '12', AI_DAILY_QUOTA_GUEST: '1' } });
    llm = t.app.get(MockLlmAdapter);
  });
  beforeEach(async () => {
    await resetState(t);
    fx = await seedCatalog(t.prisma);
    admin = await adminToken(t);
    user = await signInMobile(t, 'yatri-ai', '+919844400001');
  });
  afterAll(async () => {
    await t.close();
  });

  const drainAi = () => drainQueue(t, 'ai', AiProcessor);
  const ask = async (sessionId: string, content: string, token = user.token) => {
    const res = await t.http
      .post(`/v1/ai/chat/sessions/${sessionId}/messages`)
      .set(...bearer(token))
      .send({ content })
      .buffer(true)
      .expect(200);
    expect(res.headers['content-type']).toMatch(/^text\/event-stream/);
    return parseSse(res.text);
  };

  async function knowledge() {
    const doc = await t.http
      .post('/v1/admin/knowledge-documents')
      .set(...bearer(admin))
      .send({
        title: 'Keshi Ghat and the Yamuna',
        sourceType: 'text',
        sourceRef: 'Braj Darshan, 2nd ed.',
        cityId: fx.vrindavan,
        text: '# Keshi Ghat\n\nKeshi Ghat is where Krishna is said to have defeated the horse demon Keshi. Evening Yamuna aarti is offered on the ghat and boats leave from the steps.\n\n## Etiquette\n\nRemove footwear before stepping onto the ghat platform.',
      })
      .expect(201);
    expect(doc.body.status).toBe('pending_approval');
    expect(await drainAi()).toEqual([]);
    await t.http
      .post(`/v1/admin/knowledge-documents/${doc.body.id as string}/approve`)
      .set(...bearer(admin))
      .expect(200);
    expect(await drainAi()).toEqual(['indexed']);
    return doc.body.id as string;
  }

  it('indexes approved documents, answers with citations and caches first questions', async () => {
    const docId = await knowledge();
    const listed = await t.http
      .get('/v1/admin/knowledge-documents?status=indexed')
      .set(...bearer(admin))
      .expect(200);
    expect(listed.body.data[0]).toMatchObject({ id: docId, chunkCount: 2 });
    await t.http
      .post(`/v1/admin/knowledge-documents/${docId}/reindex`)
      .set(...bearer(admin))
      .expect(200);
    // An explicit reindex re-embeds even unchanged text (e.g. after an embedding model change).
    expect(await drainAi()).toEqual(['indexed']);

    const session = await t.http
      .post('/v1/ai/chat/sessions')
      .set(...bearer(user.token))
      .send({ city: 'vrindavan' })
      .expect(201);
    const events = await ask(session.body.id as string, 'Tell me about Keshi Ghat on the Yamuna');
    const answer = answerOf(events);
    expect(answer).toContain('Keshi Ghat and the Yamuna [1]');
    expect(events.filter((e) => e.event === 'citation').map((e) => e.data)).toEqual([
      {
        n: 1,
        documentId: docId,
        title: 'Keshi Ghat and the Yamuna',
        sourceRef: 'Braj Darshan, 2nd ed.',
      },
    ]);
    const done = events.find((e) => e.event === 'done');
    expect(done?.data).toMatchObject({ model: 'mock-default', remainingQuota: 11 });
    const chatPrompt = llm.calls.find((c) => c.system.startsWith('[task:chat]'));
    expect(chatPrompt?.system).toContain('Remove footwear');

    // The same first question in a new chat is served from cache (still counts against quota).
    const callsBefore = llm.calls.filter((c) => c.system.startsWith('[task:chat]')).length;
    const s2 = await t.http
      .post('/v1/ai/chat/sessions')
      .set(...bearer(user.token))
      .send({ city: 'vrindavan' })
      .expect(201);
    const cached = await ask(s2.body.id as string, 'tell me about keshi ghat on the yamuna!');
    expect(answerOf(cached)).toBe(answer);
    expect(cached.find((e) => e.event === 'done')?.data.model).toBe('cache');
    expect(llm.calls.filter((c) => c.system.startsWith('[task:chat]')).length).toBe(callsBefore);

    const history = await t.http
      .get(`/v1/ai/chat/sessions/${session.body.id as string}`)
      .set(...bearer(user.token))
      .expect(200);
    expect(history.body).toMatchObject({
      title: 'Tell me about Keshi Ghat on the Yamuna',
      cityId: fx.vrindavan,
    });
    expect(history.body.messages.map((m: { role: string }) => m.role)).toEqual([
      'user',
      'assistant',
    ]);
    expect(history.body.messages[1].citations).toHaveLength(1);

    await t.http
      .post(`/v1/admin/knowledge-documents/${docId}/archive`)
      .set(...bearer(admin))
      .expect(200);
    expect(await t.prisma.knowledgeChunk.count()).toBe(0);
    await t.http
      .post('/v1/admin/knowledge-documents')
      .set(...bearer(user.token))
      .send({})
      .expect(403);
  });

  it('quotes aarti times only from the temple schedule tool', async () => {
    const session = await t.http
      .post('/v1/ai/chat/sessions')
      .set(...bearer(user.token))
      .send({})
      .expect(201);
    const events = await ask(
      session.body.id as string,
      'What time is the aarti at ISKCON Krishna Balaram Mandir today?',
    );
    const answer = answerOf(events);
    expect(answer).toContain("From the temple's published schedule: Mangala Arati: 04:30 IST");
    expect(answer).toContain('Sandhya Arati: 18:30 IST');
    const saved = await t.prisma.chatMessage.findFirstOrThrow({
      where: { sessionId: session.body.id as string, role: 'assistant' },
    });
    expect(saved.toolCalls).toMatchObject([
      { name: 'get_aarti_schedule', input: { templeId: fx.iskcon } },
    ]);
    // Tool answers are date-specific and never cached.
    const s2 = await t.http
      .post('/v1/ai/chat/sessions')
      .set(...bearer(user.token))
      .send({})
      .expect(201);
    expect(
      (
        await ask(
          s2.body.id as string,
          'What time is the aarti at ISKCON Krishna Balaram Mandir today?',
        )
      ).find((e) => e.event === 'done')?.data.model,
    ).toBe('mock-default');
  });

  it('declines off-topic questions, enforces quotas and ownership', async () => {
    const session = await t.http
      .post('/v1/ai/chat/sessions')
      .set(...bearer(user.token))
      .send({ lang: 'hi' })
      .expect(201);
    const refusal = answerOf(
      await ask(session.body.id as string, 'Should I buy bitcoin this week?'),
    );
    expect(refusal).toContain('ब्रज');

    const other = await signInMobile(t, 'other-ai', '+919844400002');
    await t.http
      .post(`/v1/ai/chat/sessions/${session.body.id as string}/messages`)
      .set(...bearer(other.token))
      .send({ content: 'hi' })
      .expect(404);
    await t.http
      .get(`/v1/ai/chat/sessions/${session.body.id as string}`)
      .set(...bearer(other.token))
      .expect(404);

    const guest = await t.http
      .post('/v1/auth/firebase')
      .send({ idToken: 'mock:guest:g-ai' })
      .expect(200);
    const g = guest.body.accessToken as string;
    const gs = await t.http
      .post('/v1/ai/chat/sessions')
      .set(...bearer(g))
      .send({})
      .expect(201);
    await ask(gs.body.id as string, 'Namaste', g);
    const limited = await t.http
      .post(`/v1/ai/chat/sessions/${gs.body.id as string}/messages`)
      .set(...bearer(g))
      .send({ content: 'Again' })
      .expect(429);
    expect(limited.body.error.code).toBe('AI_QUOTA_EXCEEDED');
    expect(
      (
        await t.http
          .get('/v1/ai/quota')
          .set(...bearer(g))
          .expect(200)
      ).body,
    ).toMatchObject({ limit: 1, used: 1, remaining: 0 });
    expect(await t.prisma.aiUsage.count()).toBe(2);
    await t.http
      .delete(`/v1/ai/chat/sessions/${session.body.id as string}`)
      .set(...bearer(user.token))
      .expect(204);
  });

  it('plans trips with real aarti times, shares them and exports a PDF', async () => {
    const start = addDays(istDate(new Date()), 10);
    const res = await t.http
      .post('/v1/ai/itineraries')
      .set(...bearer(user.token))
      .send({
        startDate: start,
        days: 2,
        partySize: 3,
        cities: ['vrindavan', 'mathura'],
        interests: ['aarti', 'temples'],
        accessibility: { elderly: true },
      })
      .expect(201);
    const it = res.body;
    expect(it).toMatchObject({
      title: 'Vrindavan & Mathura yatra',
      days: 2,
      partySize: 3,
      generatedBy: 'mock-default',
      estimatedCostPaise: 2 * 2 * 3 * 25_000,
    });
    const day1 = it.dayList[0];
    expect(day1.note).toMatch(/^Day 1/);
    const aarti = day1.items.filter((i: { kind: string }) => i.kind === 'aarti');
    // Elderly: no 04:30 mangala; the evening aarti is the scheduled 18:30 IST slot.
    expect(aarti.map((a: { startsAt: string }) => a.startsAt)).toContain(
      new Date(`${start}T13:00:00.000Z`).toISOString(),
    );
    expect(aarti.every((a: { startsAt: string }) => !a.startsAt.endsWith('T23:00:00.000Z'))).toBe(
      true,
    );
    expect(day1.items.map((i: { kind: string }) => i.kind)).toContain('rest');
    const starts = day1.items.map((i: { startsAt: string }) => i.startsAt);
    expect([...starts].sort()).toEqual(starts);
    const plannerCall = llm.calls.find((c) => c.system.startsWith('[task:plan]'));
    expect(plannerCall?.jsonSchema).toBeDefined();

    const share = await t.http
      .post(`/v1/ai/itineraries/${it.id as string}/share`)
      .set(...bearer(user.token))
      .expect(200);
    const token = share.body.token as string;
    expect(share.body.shareUrl).toContain(`/v1/ai/itineraries/shared/${token}`);
    const shared = await t.http.get(`/v1/ai/itineraries/shared/${token}`).expect(200);
    expect(shared.body.id).toBe(it.id);

    const removeId = day1.items[0].id as string;
    const edited = await t.http
      .patch(`/v1/ai/itineraries/${it.id as string}`)
      .set(...bearer(user.token))
      .send({ title: 'Family yatra', status: 'saved', removeItemIds: [removeId] })
      .expect(200);
    expect(edited.body).toMatchObject({ title: 'Family yatra', status: 'saved' });
    expect(edited.body.dayList[0].items).toHaveLength(day1.items.length - 1);

    const pdf = await t.http
      .get(`/v1/ai/itineraries/${it.id as string}/pdf`)
      .set(...bearer(user.token))
      .buffer(true)
      .parse((r, cb) => {
        const chunks: Buffer[] = [];
        r.on('data', (c: Buffer) => chunks.push(c));
        r.on('end', () => {
          cb(null, Buffer.concat(chunks));
        });
      })
      .expect(200);
    expect((pdf.body as Buffer).subarray(0, 5).toString()).toBe('%PDF-');
    expect(
      (
        await t.http
          .get('/v1/ai/itineraries')
          .set(...bearer(user.token))
          .expect(200)
      ).body.data,
    ).toHaveLength(1);

    await t.http
      .post('/v1/ai/itineraries')
      .set(...bearer(user.token))
      .send({ startDate: '2020-01-01', days: 2 })
      .expect(400);
    await t.http
      .post('/v1/ai/itineraries')
      .set(...bearer(user.token))
      .send({ startDate: start, days: 9 })
      .expect(400);
    await t.http
      .post('/v1/ai/itineraries')
      .set(...bearer(user.token))
      .send({ startDate: start, days: 1, cities: ['atlantis'] })
      .expect(400);
  });

  it('falls back to a schedule-only plan when the model output is invalid', async () => {
    const original = llm.complete.bind(llm);
    const spy = jest.spyOn(llm, 'complete').mockImplementation(async (req) => {
      if (req.system.startsWith('[task:plan]'))
        return {
          ...(await original(req)),
          text: '{"title":"x","days":[{"dayIndex":0,"note":null,"items":[{"ref":"made-up","note":null}]}]}',
        };
      return original(req);
    });
    const res = await t.http
      .post('/v1/ai/itineraries')
      .set(...bearer(user.token))
      .send({ startDate: addDays(istDate(new Date()), 3), days: 1 })
      .expect(201);
    expect(spy.mock.calls.filter(([r]) => r.system.startsWith('[task:plan]'))).toHaveLength(2);
    const retry = spy.mock.calls.filter(([r]) => r.system.startsWith('[task:plan]'))[1]?.[0]
      .messages[0];
    expect(retry && 'text' in retry ? retry.text : '').toContain('ref made-up is not a candidate');
    expect(res.body.generatedBy).toBe('fallback');
    expect(res.body.dayList[0].items.length).toBeGreaterThan(2);
    spy.mockRestore();
  });

  it('transcribes voice notes, speaks answers once, and recognises temples in photos', async () => {
    const voice = await uploadFile(t, user.token, {
      purpose: 'voice_note',
      mimeType: 'audio/mpeg',
      body: Buffer.concat([
        Buffer.from('ID3'),
        Buffer.alloc(16, 0),
        Buffer.from('TRANSCRIPT:मंगला आरती कब है?\n'),
      ]),
    });
    await drainQueue(t, 'media', MediaProcessor);
    expect(
      (
        await t.http
          .post('/v1/ai/voice/transcribe')
          .set(...bearer(user.token))
          .send({ mediaId: voice.mediaId })
          .expect(200)
      ).body,
    ).toMatchObject({ text: 'मंगला आरती कब है?', lang: 'hi' });

    const first = await t.http
      .post('/v1/ai/voice/speak')
      .set(...bearer(user.token))
      .send({ text: 'Radhe Radhe' })
      .expect(200);
    const second = await t.http
      .post('/v1/ai/voice/speak')
      .set(...bearer(user.token))
      .send({ text: 'Radhe Radhe' })
      .expect(200);
    expect(first.body.cached).toBe(false);
    expect(second.body).toEqual({ url: first.body.url, cached: true });

    const photo = await uploadFile(t, user.token, {
      purpose: 'landmark_photo',
      mimeType: 'image/png',
      body: await pngBytes(640, 480),
    });
    await drainQueue(t, 'media', MediaProcessor);
    const guess = await t.http
      .post('/v1/ai/landmark')
      .set(...bearer(user.token))
      .send({ mediaId: photo.mediaId })
      .expect(200);
    expect(guess.body.matches[0]).toMatchObject({ templeId: fx.bankeBihari, confidence: 0.42 });
    const atIskcon = await t.http
      .post('/v1/ai/landmark')
      .set(...bearer(user.token))
      .send({ mediaId: photo.mediaId, lat: 27.5717, lng: 77.6799 })
      .expect(200);
    expect(atIskcon.body.matches[0]).toMatchObject({
      templeId: fx.iskcon,
      confidence: 0.8,
      distanceKm: 0,
    });

    const other = await signInMobile(t, 'other-v', '+919844400003');
    await t.http
      .post('/v1/ai/landmark')
      .set(...bearer(other.token))
      .send({ mediaId: photo.mediaId })
      .expect(400);
  });

  it('indexes PDFs and syncs temple pages from the catalog', async () => {
    await t.prisma.temple.update({
      where: { id: fx.bankeBihari },
      data: {
        descriptionI18n: {
          en: 'Banke Bihari is famous for its curtain darshan, drawn every few minutes.',
        },
      },
    });
    const synced = await t.http
      .post('/v1/admin/knowledge-documents/sync-catalog')
      .set(...bearer(admin))
      .expect(200);
    expect(synced.body.documents).toBeGreaterThanOrEqual(1);
    expect((await drainAi()).every((r) => r === 'indexed')).toBe(true);
    const hits = await t.prisma.knowledgeChunk.findMany({ where: { templeId: fx.bankeBihari } });
    expect(hits[0]?.content).toContain('curtain darshan');

    const pdf = await uploadFile(t, admin, {
      purpose: 'knowledge_document',
      mimeType: 'application/pdf',
      body: PDF_BYTES,
    });
    await drainQueue(t, 'media', MediaProcessor);
    const doc = await t.http
      .post('/v1/admin/knowledge-documents')
      .set(...bearer(admin))
      .send({ title: 'Empty PDF', sourceType: 'upload', mediaId: pdf.mediaId })
      .expect(201);
    await t.http
      .post(`/v1/admin/knowledge-documents/${doc.body.id as string}/approve`)
      .set(...bearer(admin))
      .expect(200);
    const [result] = await drainAi();
    expect(String(result)).toMatch(/^failed: /);
  });
});
