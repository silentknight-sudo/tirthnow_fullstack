'use client';

import type { Schemas } from '@tirth-now/api-client';
import { BookOpen, Flame, Hand, Home, Moon, Sparkles, Video } from 'lucide-react';
import { z } from 'zod';
import { Field, Input, Textarea } from './ui';

export type PanditProfile = Schemas['PanditProfileDto'];

export const PANDIT_LANGUAGES: { value: PanditProfile['languages'][number]; label: string }[] = [
  { value: 'hi', label: 'Hindi' },
  { value: 'braj', label: 'Braj Bhasha' },
  { value: 'sa', label: 'Sanskrit' },
  { value: 'en', label: 'English' },
  { value: 'bn', label: 'Bengali' },
  { value: 'gu', label: 'Gujarati' },
  { value: 'mr', label: 'Marathi' },
  { value: 'pa', label: 'Punjabi' },
  { value: 'ta', label: 'Tamil' },
  { value: 'te', label: 'Telugu' },
];

export const PANDIT_SERVICES = [
  { value: 'puja', label: 'Puja', hint: 'Katha, havan, griha pravesh', icon: Flame },
  { value: 'path', label: 'Path', hint: 'Sundarkand, Bhagwat, Gita', icon: BookOpen },
  { value: 'jyotish', label: 'Jyotish', hint: 'Kundli, milan, muhurat', icon: Sparkles },
  { value: 'palmistry', label: 'Palmistry', hint: 'Hast rekha reading', icon: Hand },
  { value: 'astrology', label: 'Astrology', hint: 'Rashi, numerology', icon: Moon },
] as const;

/** Mirrors PanditProfileDto in the API. */
export const panditProfileSchema = z.object({
  experienceYears: z.coerce.number().int().min(0, 'Years of experience').max(80),
  languages: z.array(z.string()).min(1, 'Choose at least one language'),
  specialities: z.array(z.string()).min(1, 'Choose at least one service'),
  sampradaya: z.string().trim().max(60).optional(),
  about: z.string().trim().max(600).optional(),
  homeVisits: z.boolean(),
  videoConsults: z.boolean(),
});

export const emptyPanditProfile: PanditProfile = {
  experienceYears: 5,
  languages: ['hi'],
  specialities: ['puja'],
  homeVisits: true,
  videoConsults: false,
};

/** API body: drops empty optional text. */
export function panditBody(p: PanditProfile): PanditProfile {
  return {
    experienceYears: p.experienceYears,
    languages: p.languages,
    specialities: p.specialities,
    homeVisits: p.homeVisits,
    videoConsults: p.videoConsults,
    ...(p.sampradaya?.trim() ? { sampradaya: p.sampradaya.trim() } : {}),
    ...(p.about?.trim() ? { about: p.about.trim() } : {}),
  };
}

const toggle = <T,>(list: T[], v: T) =>
  list.includes(v) ? list.filter((x) => x !== v) : [...list, v];

function Chip({
  on,
  onClick,
  children,
}: {
  on: boolean;
  onClick: () => void;
  children: React.ReactNode;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      aria-pressed={on}
      className={`rounded-full border px-3 py-1.5 text-sm transition ${
        on ? 'border-navy bg-navy text-white' : 'border-line bg-white hover:bg-paper'
      }`}
    >
      {children}
    </button>
  );
}

/** Pandit Ji profile fields: services, experience, languages, visits and an introduction. */
export function PanditProfileFields({
  value,
  onChange,
  errors,
}: {
  value: PanditProfile;
  onChange: (v: PanditProfile) => void;
  errors?: Partial<Record<keyof PanditProfile, string>>;
}) {
  const set = (patch: Partial<PanditProfile>) => {
    onChange({ ...value, ...patch });
  };
  return (
    <div className="space-y-5">
      <fieldset>
        <legend className="mb-2 text-sm font-medium">Which services do you offer?</legend>
        <div className="grid grid-cols-2 gap-2 sm:grid-cols-3">
          {PANDIT_SERVICES.map(({ value: v, label, hint, icon: Icon }) => {
            const on = value.specialities.includes(v);
            return (
              <button
                type="button"
                key={v}
                aria-pressed={on}
                onClick={() => {
                  set({ specialities: toggle(value.specialities, v) });
                }}
                className={`rounded-xl border p-3 text-left text-sm transition ${
                  on ? 'border-saffron bg-[#FFF4E6]' : 'border-line hover:bg-paper'
                }`}
              >
                <Icon className="mb-1 h-5 w-5 text-saffron" aria-hidden />
                <span className="block font-semibold">{label}</span>
                <span className="block text-xs text-muted">{hint}</span>
              </button>
            );
          })}
        </div>
        {errors?.specialities && <p className="mt-1 text-xs text-sos">{errors.specialities}</p>}
      </fieldset>
      <div className="grid gap-3 sm:grid-cols-2">
        <Field label="Years of experience" error={errors?.experienceYears}>
          <Input
            type="number"
            min={0}
            max={80}
            value={value.experienceYears}
            onChange={(e) => {
              set({ experienceYears: Number(e.target.value) });
            }}
          />
        </Field>
        <Field label="Sampradaya / parampara (optional)">
          <Input
            placeholder="Gaudiya Vaishnav, Pushtimarg…"
            value={value.sampradaya ?? ''}
            onChange={(e) => {
              set({ sampradaya: e.target.value });
            }}
          />
        </Field>
      </div>
      <fieldset>
        <legend className="mb-2 text-sm font-medium">Languages you perform in</legend>
        <div className="flex flex-wrap gap-2">
          {PANDIT_LANGUAGES.map((l) => (
            <Chip
              key={l.value}
              on={value.languages.includes(l.value)}
              onClick={() => {
                set({ languages: toggle(value.languages, l.value) });
              }}
            >
              {l.label}
            </Chip>
          ))}
        </div>
        {errors?.languages && <p className="mt-1 text-xs text-sos">{errors.languages}</p>}
      </fieldset>
      <div className="grid gap-2 sm:grid-cols-2">
        <label className="flex cursor-pointer items-center gap-3 rounded-xl border border-line p-3 text-sm">
          <input
            type="checkbox"
            checked={value.homeVisits}
            onChange={(e) => {
              set({ homeVisits: e.target.checked });
            }}
          />
          <Home className="h-4 w-4 text-saffron" aria-hidden />
          <span>
            <b>Home visits</b>
            <span className="block text-xs text-muted">Go to the family&apos;s home or hotel</span>
          </span>
        </label>
        <label className="flex cursor-pointer items-center gap-3 rounded-xl border border-line p-3 text-sm">
          <input
            type="checkbox"
            checked={value.videoConsults}
            onChange={(e) => {
              set({ videoConsults: e.target.checked });
            }}
          />
          <Video className="h-4 w-4 text-saffron" aria-hidden />
          <span>
            <b>Video consultations</b>
            <span className="block text-xs text-muted">Jyotish or path over a video call</span>
          </span>
        </label>
      </div>
      <Field label="About you (shown to pilgrims)" hint="Gurukul, years in Braj, special pujas">
        <Textarea
          rows={3}
          maxLength={600}
          value={value.about ?? ''}
          onChange={(e) => {
            set({ about: e.target.value });
          }}
        />
      </Field>
    </div>
  );
}

/** Field errors from the Zod schema, keyed by field. */
export function panditErrors(
  p: PanditProfile,
): Partial<Record<keyof PanditProfile, string>> | null {
  const r = panditProfileSchema.safeParse(p);
  if (r.success) return null;
  const out: Partial<Record<keyof PanditProfile, string>> = {};
  for (const i of r.error.issues) out[i.path[0] as keyof PanditProfile] ??= i.message;
  return out;
}
