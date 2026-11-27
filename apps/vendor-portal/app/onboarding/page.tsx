'use client';

import { zodResolver } from '@hookform/resolvers/zod';
import { useQueryClient } from '@tanstack/react-query';
import { BedDouble, Car, Compass, Flame, Layers, UtensilsCrossed } from 'lucide-react';
import { useRouter } from 'next/navigation';
import { useEffect, useState } from 'react';
import { useForm } from 'react-hook-form';
import { z } from 'zod';
import { AuthShell } from '../../components/auth-shell';
import {
  emptyPanditProfile,
  panditBody,
  panditErrors,
  type PanditProfile,
  PanditProfileFields,
} from '../../components/pandit-profile';
import { Button, ErrorBox, Field, Input, Select } from '../../components/ui';
import { api, errorMessage, tokens } from '../../lib/api';
import { useCities } from '../../lib/queries';
import { useUser } from '../../lib/session';
import { GSTIN, PAN } from '../../lib/validation';

const TYPES = [
  { value: 'hotel', label: 'Stay', hint: 'Hotel, dharamshala, guest house', icon: BedDouble },
  { value: 'cab', label: 'Cabs', hint: 'Taxis, autos, tempo travellers', icon: Car },
  { value: 'restaurant', label: 'Food', hint: 'Restaurant, bhojanalaya', icon: UtensilsCrossed },
  { value: 'experience', label: 'Experience', hint: 'Boat rides, guided parikrama', icon: Compass },
  { value: 'pandit', label: 'Pandit Ji', hint: 'Puja, path, jyotish, palmistry', icon: Flame },
  { value: 'multi', label: 'More than one', hint: 'Several of the above', icon: Layers },
] as const;

const schema = z.object({
  type: z.enum(['hotel', 'cab', 'restaurant', 'experience', 'pandit', 'multi']),
  displayName: z.string().trim().min(2, 'Enter the name guests will see').max(120),
  legalName: z.string().trim().min(2, 'Enter the registered business name').max(200),
  cityId: z.string().uuid('Choose a city'),
  pan: z
    .string()
    .trim()
    .toUpperCase()
    .regex(PAN, 'PAN looks like ABCDE1234F')
    .or(z.literal(''))
    .optional(),
  gstin: z
    .string()
    .trim()
    .toUpperCase()
    .regex(GSTIN, 'GSTIN is 15 characters, e.g. 09ABCDE1234F1Z5')
    .or(z.literal(''))
    .optional(),
});
type Values = z.infer<typeof schema>;

export default function OnboardingPage() {
  const router = useRouter();
  const qc = useQueryClient();
  const user = useUser();
  const cities = useCities();
  const [error, setError] = useState<string | null>(null);
  const [step, setStep] = useState<1 | 2>(1);
  const [profile, setProfile] = useState<PanditProfile>(emptyPanditProfile);
  const [profileErrors, setProfileErrors] = useState<ReturnType<typeof panditErrors>>(null);
  const form = useForm<Values>({ resolver: zodResolver(schema), defaultValues: { type: 'hotel' } });
  const { errors, isSubmitting } = form.formState;
  const type = form.watch('type');

  useEffect(() => {
    if (!tokens.user()) router.replace('/login/');
  }, [router]);

  const onSubmit = form.handleSubmit(async (v) => {
    setError(null);
    // Pandits add their public profile in a second step.
    if (v.type === 'pandit' && step === 1) {
      setStep(2);
      return;
    }
    if (v.type === 'pandit') {
      const errs = panditErrors(profile);
      setProfileErrors(errs);
      if (errs) return;
    }
    try {
      await api.POST('/v1/vendors', {
        body: {
          type: v.type,
          displayName: v.displayName,
          legalName: v.legalName,
          cityId: v.cityId,
          ...(v.pan ? { pan: v.pan } : {}),
          ...(v.gstin ? { gstin: v.gstin } : {}),
          ...(v.type === 'pandit' ? { panditProfile: panditBody(profile) } : {}),
        },
      });
      // New vendor roles arrive with the next token (ADR-0014).
      await api.refreshSession();
      await qc.invalidateQueries({ queryKey: ['vendors', 'me'] });
      router.replace('/dashboard/');
    } catch (e) {
      setError(errorMessage(e));
    }
  });

  return (
    <AuthShell
      title={`Welcome${user?.displayName ? `, ${user.displayName}` : ''}`}
      subtitle="Tell us about your business. You can add documents and listings next."
    >
      <form onSubmit={onSubmit} className="space-y-5" noValidate>
        {type === 'pandit' && (
          <ol className="flex items-center gap-2 text-xs font-semibold">
            {['Business', 'Pandit profile'].map((label, i) => (
              <li
                key={label}
                className={`flex items-center gap-2 rounded-full px-3 py-1 ${
                  step === i + 1 ? 'bg-navy text-white' : 'bg-paper-2 text-muted'
                }`}
              >
                <span>{i + 1}</span> {label}
              </li>
            ))}
          </ol>
        )}
        {step === 2 && type === 'pandit' ? (
          <>
            <PanditProfileFields
              value={profile}
              onChange={setProfile}
              {...(profileErrors ? { errors: profileErrors } : {})}
            />
            <p className="text-xs text-muted">
              Next you upload PAN and Aadhaar, add your bank account and your services (we give you
              ready templates for common pujas).
            </p>
            <ErrorBox message={error} />
            <div className="flex gap-2">
              <Button
                type="button"
                variant="secondary"
                onClick={() => {
                  setStep(1);
                }}
              >
                Back
              </Button>
              <Button type="submit" className="flex-1" loading={isSubmitting}>
                Create my Pandit Ji profile
              </Button>
            </div>
          </>
        ) : (
          <>
            <fieldset>
              <legend className="mb-2 text-sm font-medium">What do you offer?</legend>
              <div className="grid grid-cols-2 gap-2">
                {TYPES.map(({ value, label, hint, icon: Icon }) => (
                  <label
                    key={value}
                    className={`cursor-pointer rounded-xl border p-3 text-sm transition ${
                      type === value ? 'border-navy bg-[#EFF3FA]' : 'border-line hover:bg-paper'
                    }`}
                  >
                    <input
                      type="radio"
                      value={value}
                      className="sr-only"
                      {...form.register('type')}
                    />
                    <Icon className="mb-1 h-5 w-5 text-saffron" aria-hidden />
                    <span className="block font-semibold">{label}</span>
                    <span className="block text-xs text-muted">{hint}</span>
                  </label>
                ))}
              </div>
            </fieldset>
            <Field label="Name guests will see" error={errors.displayName?.message}>
              <Input
                placeholder={type === 'pandit' ? 'Pt. Radheshyam Shastri' : 'Shri Radha Residency'}
                {...form.register('displayName')}
              />
            </Field>
            <Field label="Registered business name" error={errors.legalName?.message}>
              <Input
                placeholder={type === 'pandit' ? 'Your name as on PAN' : 'As on PAN / GST'}
                {...form.register('legalName')}
              />
            </Field>
            <Field label="City" error={errors.cityId?.message}>
              <Select {...form.register('cityId')} defaultValue="">
                <option value="" disabled>
                  Choose…
                </option>
                {(cities.data ?? []).map((c) => (
                  <option key={c.id} value={c.id}>
                    {c.name}
                  </option>
                ))}
              </Select>
            </Field>
            <div className="grid grid-cols-2 gap-3">
              <Field label="PAN (optional now)" error={errors.pan?.message}>
                <Input className="uppercase" {...form.register('pan')} />
              </Field>
              <Field label="GSTIN (if registered)" error={errors.gstin?.message}>
                <Input className="uppercase" {...form.register('gstin')} />
              </Field>
            </div>
            <ErrorBox message={error} />
            <Button type="submit" className="w-full" loading={isSubmitting}>
              Continue
            </Button>
          </>
        )}
      </form>
    </AuthShell>
  );
}
