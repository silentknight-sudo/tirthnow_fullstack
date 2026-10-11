import { createParamDecorator, type ExecutionContext } from '@nestjs/common';
import { type Lang, LANGS } from '@tirth-now/shared-types';

/** Requested language: `?lang=hi` wins, then Accept-Language, else English. */
export function resolveLang(query: unknown, acceptLanguage: unknown): Lang {
  if (typeof query === 'string' && (LANGS as readonly string[]).includes(query))
    return query as Lang;
  if (typeof acceptLanguage === 'string') {
    const first = acceptLanguage.split(',')[0]?.trim().slice(0, 2).toLowerCase();
    if (first && (LANGS as readonly string[]).includes(first)) return first as Lang;
  }
  return 'en';
}

export const ReqLang = createParamDecorator((_: unknown, ctx: ExecutionContext): Lang => {
  const req = ctx
    .switchToHttp()
    .getRequest<{ query: Record<string, unknown>; headers: Record<string, unknown> }>();
  return resolveLang(req.query.lang, req.headers['accept-language']);
});

/** Pick a language from an `*_i18n` JSON value, falling back to English, then any string. */
export function t(value: unknown, lang: Lang): string {
  if (typeof value === 'string') return value;
  if (typeof value !== 'object' || value === null) return '';
  const v = value as Record<string, unknown>;
  const picked = v[lang] ?? v.en;
  if (typeof picked === 'string') return picked;
  const any = Object.values(v).find((x) => typeof x === 'string');
  return typeof any === 'string' ? any : '';
}

/** Same as `t` but returns null when the value is absent. */
export function tOrNull(value: unknown, lang: Lang): string | null {
  if (value === null || value === undefined) return null;
  const s = t(value, lang);
  return s === '' ? null : s;
}
