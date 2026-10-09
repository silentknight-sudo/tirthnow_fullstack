import { z } from 'zod';

export const LANGS = ['en', 'hi'] as const;
export type Lang = (typeof LANGS)[number];

/** Shape of every `*_i18n` JSONB column. English is required. */
export const i18nTextSchema = z
  .object({ en: z.string().min(1), hi: z.string().min(1).optional() })
  .strict();
export type I18nText = z.infer<typeof i18nTextSchema>;

export function pickLang(text: I18nText, lang: Lang): string {
  return text[lang] ?? text.en;
}

export const DISPLAY_TIME_ZONE = 'Asia/Kolkata';
