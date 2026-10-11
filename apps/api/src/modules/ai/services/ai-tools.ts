import { Injectable } from '@nestjs/common';
import { type Lang } from '@tirth-now/shared-types';
import { type LlmTool, type LlmToolCall, type LlmToolResult } from '../../../core/providers';
import { addDays, isIsoDate, istDate } from '../../../core/time';
import { CatalogFacade } from '../../catalog';
import { WeatherFacade } from '../../weather';

export const AI_TOOLS: LlmTool[] = [
  {
    name: 'get_aarti_schedule',
    description:
      'Authoritative aarti and darshan times for one temple on one date, from the temple calendar. The only allowed source of aarti times.',
    inputSchema: {
      properties: {
        templeId: { type: 'string', description: 'Temple id from KNOWN TEMPLES' },
        date: { type: ['string', 'null'], description: 'IST date YYYY-MM-DD; null for today' },
      },
      required: ['templeId', 'date'],
      additionalProperties: false,
    },
  },
  {
    name: 'get_weather',
    description: 'Current weather, 5-day forecast and travel advisories for a Braj city.',
    inputSchema: {
      properties: { citySlug: { type: 'string', description: 'e.g. vrindavan, mathura' } },
      required: ['citySlug'],
      additionalProperties: false,
    },
  },
];

const str = (v: unknown): string | null => (typeof v === 'string' && v.trim() ? v.trim() : null);

/** Executes model tool calls against the database (never against the model's memory). */
@Injectable()
export class AiToolsService {
  constructor(
    private readonly catalog: CatalogFacade,
    private readonly weather: WeatherFacade,
  ) {}

  async run(call: LlmToolCall, lang: Lang): Promise<LlmToolResult> {
    const input = (
      typeof call.input === 'object' && call.input !== null ? call.input : {}
    ) as Record<string, unknown>;
    try {
      switch (call.name) {
        case 'get_aarti_schedule':
          return {
            toolCallId: call.id,
            content: await this.aarti(str(input.templeId), str(input.date), lang),
          };
        case 'get_weather':
          return { toolCallId: call.id, content: await this.weatherFor(str(input.citySlug)) };
        default:
          return { toolCallId: call.id, content: `Unknown tool ${call.name}`, isError: true };
      }
    } catch (err) {
      return {
        toolCallId: call.id,
        content: err instanceof Error ? err.message : 'tool failed',
        isError: true,
      };
    }
  }

  private async aarti(templeId: string | null, date: string | null, lang: Lang): Promise<string> {
    if (!templeId || !(await this.catalog.templeExists(templeId)))
      return 'No such temple. Use an id from KNOWN TEMPLES.';
    const today = istDate(new Date());
    const day = date && isIsoDate(date) ? date : today;
    if (day < today || day > addDays(today, 60))
      return 'Schedules are available from today up to 60 days ahead.';
    const items = await this.catalog.aartiInstances([templeId], day, day, lang);
    if (items.length === 0)
      return `No aarti is listed for this temple on ${day}. Times may not be published; advise checking with the temple.`;
    return items
      .map(
        (a) =>
          `${a.name}: ${a.localTime} IST on ${a.date}${a.isLiveStreamed ? ' (live-streamed)' : ''}`,
      )
      .join('\n');
  }

  private async weatherFor(slug: string | null): Promise<string> {
    const cities = await this.catalog.citySlugs();
    const city = cities.find((c) => c.slug === slug);
    if (!city) return `Unknown city. Known: ${cities.map((c) => c.slug).join(', ')}`;
    const r = await this.weather.report({ lat: city.lat, lng: city.lng });
    const days = r.daily
      .map(
        (d) =>
          `${d.date}: ${String(d.minC)}–${String(d.maxC)}°C, ${d.condition}, rain ${String(d.rainChancePct)}%`,
      )
      .join('\n');
    return `${city.name} now: ${String(r.now.tempC)}°C, feels ${String(r.now.feelsLikeC)}°C, ${r.now.description}.\n${days}`;
  }
}
