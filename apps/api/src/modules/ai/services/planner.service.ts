import { Inject, Injectable, Logger } from '@nestjs/common';
import { type ItinItemKind } from '@prisma/client';
import {
  type ItineraryPlan,
  itineraryPlanJsonSchema,
  itineraryPlanSchema,
  type Lang,
} from '@tirth-now/shared-types';
import { type AuthPrincipal } from '../../../core/auth';
import { haversineKm } from '../../../core/geo';
import { AppException } from '../../../core/http';
import { LLM_PROVIDER, type LlmProvider } from '../../../core/providers';
import { addDays, isIsoDate, istDate, istToUtc } from '../../../core/time';
import { CatalogFacade } from '../../catalog';
import { WeatherFacade } from '../../weather';
import { type CreateItineraryDto } from '../dto/ai.dto';
import { ItinerariesService, type ItineraryResponse } from './itineraries.service';
import { QuotaService } from './quota.service';

export interface Candidate {
  ref: string;
  dayIndex: number;
  kind: ItinItemKind;
  title: string;
  templeId: string | null;
  aartiScheduleId: string | null;
  /** Fixed times come from the database (aarti) or sensible defaults (meals, rest). */
  startsAt: string | null;
  endsAt: string | null;
  durationMin: number;
  lat: number | null;
  lng: number | null;
  costPaise: number;
}

interface DayCandidates {
  dayIndex: number;
  date: string;
  cityId: string;
  cityName: string;
  candidates: Candidate[];
}

const MEAL_PAISE_PER_PERSON = 25_000;
const VISIT_MIN = { relaxed: 90, normal: 75, packed: 60 } as const;
const TEMPLES_PER_DAY = { relaxed: 2, normal: 3, packed: 5 } as const;
const ERICKSHAW_KMH = 12;

const SYSTEM = `[task:plan]
You plan pilgrimage days in Braj (Mathura, Vrindavan and nearby). For each day you receive CANDIDATES: temples, aarti, meals and rest, each with a ref.
Choose and order the candidates that best fit the traveller (interests, pace, accessibility, party), and write one short practical note per day and optional short notes per item (dress, crowd, footwear, what makes the place special).
Use only refs from that day's candidates; never invent places or times. Keep aarti items: they are why people come. Reply with JSON matching the schema.`;

@Injectable()
export class PlannerService {
  private readonly logger = new Logger(PlannerService.name);

  constructor(
    private readonly catalog: CatalogFacade,
    private readonly weather: WeatherFacade,
    private readonly itineraries: ItinerariesService,
    private readonly quota: QuotaService,
    @Inject(LLM_PROVIDER) private readonly llm: LlmProvider,
  ) {}

  async generate(
    user: AuthPrincipal,
    dto: CreateItineraryDto,
    reqLang: Lang,
  ): Promise<ItineraryResponse> {
    const lang = dto.lang ?? reqLang;
    const today = istDate(new Date());
    if (!isIsoDate(dto.startDate) || dto.startDate < today || dto.startDate > addDays(today, 365)) {
      throw AppException.badRequest('startDate must be a date within the next year');
    }
    await this.quota.consume(user);
    const days = await this.candidates(dto, lang);
    const title = `${days
      .map((d) => d.cityName)
      .filter((n, i, a) => a.indexOf(n) === i)
      .join(' & ')} yatra`;
    const payload = {
      title,
      days: days.map((d) => ({
        dayIndex: d.dayIndex,
        date: d.date,
        city: d.cityName,
        candidates: d.candidates.map(({ ref, kind, title: t, startsAt, durationMin }) => ({
          ref,
          kind,
          title: t,
          startsAt,
          durationMin,
        })),
      })),
    };
    const brief = [
      `Party of ${String(dto.partySize ?? 1)}, ${String(dto.days)} day(s) from ${dto.startDate}, pace ${dto.pace ?? 'normal'}.`,
      dto.interests?.length ? `Interests: ${dto.interests.join(', ')}.` : '',
      dto.accessibility?.wheelchair ? 'Uses a wheelchair: avoid long walks and steep steps.' : '',
      dto.accessibility?.elderly
        ? 'Travelling with elderly family: keep it gentle, plenty of rest.'
        : '',
      dto.budgetPaise ? `Budget about ₹${String(Math.round(dto.budgetPaise / 100))} in total.` : '',
      `Write notes in ${lang === 'hi' ? 'Hindi' : 'English'}.`,
      `CANDIDATES_JSON:${JSON.stringify(payload)}`,
    ]
      .filter(Boolean)
      .join('\n');

    let plan: ItineraryPlan | null = null;
    let model = 'fallback';
    let raw: unknown = null;
    let feedback = '';
    let usage = { inputTokens: 0, outputTokens: 0 };
    for (let attempt = 0; attempt < 2 && !plan; attempt++) {
      try {
        const res = await this.llm.complete({
          tier: 'default',
          system: SYSTEM,
          messages: [{ role: 'user', text: brief + feedback }],
          jsonSchema: itineraryPlanJsonSchema,
          maxTokens: 8_000,
        });
        usage = {
          inputTokens: usage.inputTokens + res.usage.inputTokens,
          outputTokens: usage.outputTokens + res.usage.outputTokens,
        };
        raw = res.text;
        model = res.model;
        const problems = validatePlan(res.text, days);
        if (problems.length === 0) plan = itineraryPlanSchema.parse(JSON.parse(res.text));
        else
          feedback = `\n\nYour previous answer was invalid: ${problems.slice(0, 10).join('; ')}. Fix these and answer again.`;
      } catch (err) {
        this.logger.warn({ err }, 'planner model call failed');
        break;
      }
    }
    if (!plan) {
      // Graceful fallback: the deterministic candidates are already a sensible plan.
      this.logger.warn({ feedback }, 'planner output invalid twice; using deterministic plan');
      plan = {
        title,
        days: days.map((d) => ({
          dayIndex: d.dayIndex,
          note: null,
          items: d.candidates.map((c) => ({ ref: c.ref, note: null })),
        })),
      };
      model = 'fallback';
    }
    await this.quota.record(user.userId, usage);
    return this.itineraries.save(
      user,
      dto,
      lang,
      plan,
      scheduleDays(plan, days, dto.pace ?? 'normal'),
      model,
      raw,
    );
  }

  /** Database-driven options per day; the model may only choose among these. */
  private async candidates(dto: CreateItineraryDto, lang: Lang): Promise<DayCandidates[]> {
    const all = await this.catalog.citySlugs();
    const chosen = (dto.cities?.length ? dto.cities : ['vrindavan']).map(
      (slug) => all.find((c) => c.slug === slug) ?? null,
    );
    if (chosen.some((c) => c === null) || chosen.length === 0)
      throw AppException.badRequest(
        `Unknown city; choose from ${all.map((c) => c.slug).join(', ')}`,
      );
    const cities = chosen.filter((c): c is NonNullable<typeof c> => c !== null);
    const pace = dto.pace ?? 'normal';
    const gentle =
      pace === 'relaxed' || !!dto.accessibility?.elderly || !!dto.accessibility?.wheelchair;
    const party = dto.partySize ?? 1;
    const wantsAarti = !dto.interests?.length || dto.interests.includes('aarti');
    const out: DayCandidates[] = [];
    for (let i = 0; i < dto.days; i++) {
      const date = addDays(dto.startDate, i);
      const city = cities[i % cities.length] ?? cities[0];
      if (!city) break;
      const temples = await this.catalog.temples({ city: city.slug }, lang);
      const byId = new Map(temples.map((t) => [t.id, t]));
      const aarti = wantsAarti
        ? await this.catalog.aartiInstances(
            temples.map((t) => t.id),
            date,
            date,
            lang,
          )
        : [];
      const list: Omit<Candidate, 'ref' | 'dayIndex'>[] = [];
      const morning = aarti.filter(
        (a) => a.localTime >= (gentle ? '06:30' : '04:00') && a.localTime < '10:30',
      );
      const evening = aarti.filter((a) => a.localTime >= '17:00' && a.localTime <= '21:30');
      const picks = [morning[0], evening[0], ...(pace === 'packed' ? [evening[1]] : [])].filter(
        (a): a is NonNullable<typeof a> => !!a,
      );
      for (const a of picks) {
        const t = byId.get(a.templeId);
        list.push({
          kind: 'aarti',
          title: `${a.name} — ${a.templeName ?? t?.name ?? ''}`,
          templeId: a.templeId,
          aartiScheduleId: a.scheduleId,
          startsAt: a.startsAt,
          endsAt: a.endsAt,
          durationMin: Math.round((Date.parse(a.endsAt) - Date.parse(a.startsAt)) / 60_000),
          lat: t?.lat ?? null,
          lng: t?.lng ?? null,
          costPaise: 0,
        });
      }
      const aartiTemples = new Set(picks.map((a) => a.templeId));
      for (const t of temples
        .filter((x) => !aartiTemples.has(x.id))
        .slice(0, TEMPLES_PER_DAY[pace])) {
        list.push({
          kind: 'temple',
          title: t.name,
          templeId: t.id,
          aartiScheduleId: null,
          startsAt: null,
          endsAt: null,
          durationMin: VISIT_MIN[pace],
          lat: t.lat,
          lng: t.lng,
          costPaise: 0,
        });
      }
      const meal = (h: number, title: string) => ({
        kind: 'meal' as const,
        title,
        templeId: null,
        aartiScheduleId: null,
        startsAt: istToUtc(date, h, 0).toISOString(),
        endsAt: istToUtc(date, h + 1, 0).toISOString(),
        durationMin: 60,
        lat: null,
        lng: null,
        costPaise: MEAL_PAISE_PER_PERSON * party,
      });
      list.push(meal(13, lang === 'hi' ? 'दोपहर का भोजन (सात्विक थाली)' : 'Lunch (sattvic thali)'));
      list.push(meal(20, lang === 'hi' ? 'रात का भोजन' : 'Dinner'));
      if (gentle || (await this.hotDay(city, date))) {
        list.push({
          kind: 'rest',
          title:
            lang === 'hi' ? 'आराम (दोपहर की गर्मी से बचें)' : 'Rest through the afternoon heat',
          templeId: null,
          aartiScheduleId: null,
          startsAt: istToUtc(date, 14, 30).toISOString(),
          endsAt: istToUtc(date, 16, 30).toISOString(),
          durationMin: 120,
          lat: null,
          lng: null,
          costPaise: 0,
        });
      }
      out.push({
        dayIndex: i,
        date,
        cityId: city.id,
        cityName: city.name,
        candidates: list.map((c, n) => ({ ...c, ref: `d${String(i)}c${String(n)}`, dayIndex: i })),
      });
    }
    return out;
  }

  private async hotDay(city: { lat: number; lng: number }, date: string): Promise<boolean> {
    if (date > addDays(istDate(new Date()), 4)) return false;
    try {
      const r = await this.weather.report(city);
      return (r.daily.find((d) => d.date === date)?.maxC ?? 0) >= 38;
    } catch {
      return false;
    }
  }
}

/** Every problem with a model plan (empty = valid). */
export function validatePlan(text: string, days: DayCandidates[]): string[] {
  let json: unknown;
  try {
    json = JSON.parse(text);
  } catch {
    return ['not valid JSON'];
  }
  const parsed = itineraryPlanSchema.safeParse(json);
  if (!parsed.success) return parsed.error.issues.map((i) => `${i.path.join('.')}: ${i.message}`);
  const problems: string[] = [];
  const seenDays = new Set<number>();
  for (const d of parsed.data.days) {
    const day = days.find((x) => x.dayIndex === d.dayIndex);
    if (!day) {
      problems.push(`day ${String(d.dayIndex)} does not exist`);
      continue;
    }
    if (seenDays.has(d.dayIndex)) problems.push(`day ${String(d.dayIndex)} appears twice`);
    seenDays.add(d.dayIndex);
    const refs = new Set(day.candidates.map((c) => c.ref));
    const used = new Set<string>();
    for (const item of d.items) {
      if (!refs.has(item.ref))
        problems.push(`ref ${item.ref} is not a candidate for day ${String(d.dayIndex)}`);
      if (used.has(item.ref)) problems.push(`ref ${item.ref} used twice`);
      used.add(item.ref);
    }
  }
  for (const d of days)
    if (!seenDays.has(d.dayIndex)) problems.push(`day ${String(d.dayIndex)} is missing`);
  return problems;
}

export interface ScheduledItem extends Candidate {
  note: string | null;
  travelDistanceM: number | null;
  travelDurationMin: number | null;
}

export interface ScheduledDay {
  dayIndex: number;
  date: string;
  cityId: string;
  note: string | null;
  items: ScheduledItem[];
}

/** Fixed-time items keep their times; visits fill the gaps from 08:30; travel estimated between stops. */
export function scheduleDays(
  plan: ItineraryPlan,
  days: DayCandidates[],
  pace: 'relaxed' | 'normal' | 'packed',
): ScheduledDay[] {
  return days.map((day) => {
    const planned = plan.days.find((d) => d.dayIndex === day.dayIndex);
    const chosen = (planned?.items ?? []).flatMap((it) => {
      const c = day.candidates.find((x) => x.ref === it.ref);
      return c ? [{ ...c, note: it.note }] : [];
    });
    const fixed = chosen
      .filter((c) => c.startsAt)
      .sort((a, b) => (a.startsAt ?? '').localeCompare(b.startsAt ?? ''));
    const busy = fixed.map(
      (c) => [Date.parse(c.startsAt ?? ''), Date.parse(c.endsAt ?? '')] as const,
    );
    let cursor = istToUtc(day.date, 8, 30).getTime();
    const placed: (typeof chosen)[number][] = [...fixed];
    for (const c of chosen.filter((x) => !x.startsAt)) {
      const len = (c.durationMin || VISIT_MIN[pace]) * 60_000;
      for (;;) {
        const clash = busy.find(([s, e]) => cursor < e && cursor + len > s);
        if (!clash) break;
        cursor = clash[1] + 15 * 60_000;
      }
      placed.push({
        ...c,
        startsAt: new Date(cursor).toISOString(),
        endsAt: new Date(cursor + len).toISOString(),
      });
      busy.push([cursor, cursor + len]);
      cursor += len + 20 * 60_000;
    }
    placed.sort((a, b) => (a.startsAt ?? '').localeCompare(b.startsAt ?? ''));
    let prev: { lat: number; lng: number } | null = null;
    const items: ScheduledItem[] = placed.map((c) => {
      let travelDistanceM: number | null = null;
      let travelDurationMin: number | null = null;
      if (c.lat !== null && c.lng !== null) {
        if (prev) {
          const km = haversineKm(prev, { lat: c.lat, lng: c.lng }) * 1.3;
          travelDistanceM = Math.round(km * 1000);
          travelDurationMin = Math.max(5, Math.round((km / ERICKSHAW_KMH) * 60));
        }
        prev = { lat: c.lat, lng: c.lng };
      }
      return { ...c, travelDistanceM, travelDurationMin };
    });
    return {
      dayIndex: day.dayIndex,
      date: day.date,
      cityId: day.cityId,
      note: planned?.note ?? null,
      items,
    };
  });
}
