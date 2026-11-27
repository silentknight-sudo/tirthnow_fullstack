'use client';

import { zodResolver } from '@hookform/resolvers/zod';
import { useQuery } from '@tanstack/react-query';
import type { Schemas } from '@tirth-now/api-client';
import { CalendarPlus, Pencil, Plus, X } from 'lucide-react';
import { useState } from 'react';
import { useForm } from 'react-hook-form';
import { z } from 'zod';
import { api, errorMessage, must } from '../../lib/api';
import { istDateTime, istToday, rupees, titleCase, toPaise } from '../../lib/format';
import { useCities } from '../../lib/queries';
import { rupeeField } from '../../lib/validation';
import {
  Button,
  Card,
  Empty,
  ErrorBox,
  Field,
  Input,
  Modal,
  Select,
  Spinner,
  Textarea,
} from '../ui';
import { PublishedBadge, Section, splitList, useInvalidate } from './common';

type Experience = Schemas['ExperienceResponse'];
const KINDS: Experience['kind'][] = [
  'boat_ride',
  'guided_tour',
  'parikrama_guide',
  'cooking',
  'workshop',
  'other',
];
const PANDIT_KINDS: Experience['kind'][] = ['puja', 'path', 'jyotish', 'palmistry', 'astrology'];
const KIND_LABEL: Partial<Record<Experience['kind'], string>> = {
  puja: 'Puja',
  path: 'Path',
  jyotish: 'Jyotish (kundli, Vedic astrology)',
  palmistry: 'Palmistry (hast rekha)',
  astrology: 'Astrology & numerology',
};
const kindLabel = (k: Experience['kind']) => KIND_LABEL[k] ?? titleCase(k);

/** One-tap starting points for common Pandit Ji services; everything stays editable. */
const PANDIT_TEMPLATES: {
  title: string;
  kind: Experience['kind'];
  durationMin: number;
  price: number;
  description: string;
}[] = [
  {
    title: 'Satyanarayan Katha & Puja',
    kind: 'puja',
    durationMin: 150,
    price: 2100,
    description: 'Full katha with havan and prasad vidhi. Samagri list shared after booking.',
  },
  {
    title: 'Griha Pravesh Puja',
    kind: 'puja',
    durationMin: 180,
    price: 5100,
    description: 'Vastu shanti, Ganesh puja and havan for a new home.',
  },
  {
    title: 'Rudrabhishek',
    kind: 'puja',
    durationMin: 120,
    price: 3100,
    description: 'Abhishek of the Shivling with Rudri path.',
  },
  {
    title: 'Navgrah Shanti Puja',
    kind: 'puja',
    durationMin: 150,
    price: 3500,
    description: 'Puja and havan for the nine planets with sankalp in the family name.',
  },
  {
    title: 'Sundarkand Path',
    kind: 'path',
    durationMin: 180,
    price: 2500,
    description: 'Sung path with harmonium and dholak, then Hanuman aarti.',
  },
  {
    title: 'Shrimad Bhagwat Path (1 day)',
    kind: 'path',
    durationMin: 360,
    price: 7100,
    description: 'One-day moolpath of the Bhagwat.',
  },
  {
    title: 'Kundli Reading',
    kind: 'jyotish',
    durationMin: 45,
    price: 1100,
    description: 'Birth chart reading with remedies. Needs birth date, time and place.',
  },
  {
    title: 'Kundli Milan (marriage matching)',
    kind: 'jyotish',
    durationMin: 60,
    price: 1500,
    description: 'Guna milan, manglik check and muhurat.',
  },
  {
    title: 'Palmistry (Hast Rekha) Reading',
    kind: 'palmistry',
    durationMin: 30,
    price: 700,
    description: 'Life, heart and fate lines with guidance. In person or by video.',
  },
  {
    title: 'Astrology & Numerology Consultation',
    kind: 'astrology',
    durationMin: 30,
    price: 900,
    description: 'Rashi, gochar and numerology with gemstone and mantra remedies.',
  },
];

const expSchema = z.object({
  titleEn: z.string().trim().min(3).max(120),
  kind: z.enum([
    'guided_tour',
    'boat_ride',
    'parikrama_guide',
    'cooking',
    'workshop',
    'other',
    'puja',
    'path',
    'jyotish',
    'palmistry',
    'astrology',
  ]),
  cityId: z.string().uuid('Choose a city'),
  durationMin: z.coerce.number().int().min(15).max(1440),
  maxGroupSize: z.coerce.number().int().min(1).max(500),
  price: rupeeField,
  description: z.string().max(2000).optional(),
  isPublished: z.boolean(),
});

function ExperienceForm({
  vid,
  x,
  onDone,
  pandit = false,
}: {
  vid: string;
  x?: Experience;
  onDone: () => void;
  pandit?: boolean;
}) {
  const cities = useCities();
  const invalidate = useInvalidate();
  const [error, setError] = useState<string | null>(null);
  const form = useForm<z.infer<typeof expSchema>>({
    resolver: zodResolver(expSchema),
    defaultValues: {
      titleEn: x?.title ?? '',
      kind: x?.kind ?? (pandit ? 'puja' : 'boat_ride'),
      cityId: x?.cityId ?? '',
      durationMin: x?.durationMin ?? 60,
      maxGroupSize: x?.maxGroupSize ?? (pandit ? 50 : 10),
      price: x ? x.pricePaise / 100 : 500,
      description: x?.description ?? '',
      isPublished: x?.isPublished ?? false,
    },
  });
  const { errors, isSubmitting } = form.formState;
  const onSubmit = form.handleSubmit(async (v) => {
    setError(null);
    const body = {
      title: { en: v.titleEn },
      kind: v.kind,
      cityId: v.cityId,
      durationMin: v.durationMin,
      maxGroupSize: v.maxGroupSize,
      pricePaise: toPaise(v.price),
      isPublished: v.isPublished,
      ...(v.description ? { description: { en: v.description } } : {}),
      // New Pandit Ji services: free cancellation up to a day before.
      ...(pandit && !x
        ? { cancellationPolicy: { freeUntilHoursBefore: 24, penaltyPctAfter: 50 } }
        : {}),
    };
    try {
      if (x)
        await api.PATCH('/v1/vendors/{vid}/experiences/{id}', {
          params: { path: { vid, id: x.id } },
          body,
        });
      else await api.POST('/v1/vendors/{vid}/experiences', { params: { path: { vid } }, body });
      await invalidate('experiences', vid);
      onDone();
    } catch (e) {
      setError(errorMessage(e));
    }
  });
  const applyTemplate = (t: (typeof PANDIT_TEMPLATES)[number]) => {
    form.setValue('titleEn', t.title);
    form.setValue('kind', t.kind);
    form.setValue('durationMin', t.durationMin);
    form.setValue('price', t.price);
    form.setValue('description', t.description);
  };
  return (
    <form onSubmit={onSubmit} className="grid gap-3 sm:grid-cols-2" noValidate>
      {pandit && !x && (
        <div className="sm:col-span-2">
          <p className="mb-2 text-sm font-medium">Start from a template</p>
          <div className="flex flex-wrap gap-2">
            {PANDIT_TEMPLATES.map((t) => (
              <button
                key={t.title}
                type="button"
                onClick={() => {
                  applyTemplate(t);
                }}
                className="rounded-full border border-line bg-white px-3 py-1 text-xs hover:border-saffron hover:bg-[#FFF4E6]"
              >
                {t.title}
              </button>
            ))}
          </div>
        </div>
      )}
      <div className="sm:col-span-2">
        <Field label={pandit ? 'Service name' : 'Title'} error={errors.titleEn?.message}>
          <Input
            placeholder={pandit ? 'Satyanarayan Katha & Puja' : 'Sunrise Yamuna boat ride'}
            {...form.register('titleEn')}
          />
        </Field>
      </div>
      <Field label={pandit ? 'Category' : 'Kind'}>
        <Select {...form.register('kind')}>
          {(pandit ? PANDIT_KINDS : KINDS).map((k) => (
            <option key={k} value={k}>
              {kindLabel(k)}
            </option>
          ))}
        </Select>
      </Field>
      <Field label="City" error={errors.cityId?.message}>
        <Select {...form.register('cityId')}>
          <option value="">Choose…</option>
          {(cities.data ?? []).map((c) => (
            <option key={c.id} value={c.id}>
              {c.name}
            </option>
          ))}
        </Select>
      </Field>
      <Field label="Duration (minutes)" error={errors.durationMin?.message}>
        <Input type="number" {...form.register('durationMin')} />
      </Field>
      {!pandit && (
        <Field label="Max group size" error={errors.maxGroupSize?.message}>
          <Input type="number" {...form.register('maxGroupSize')} />
        </Field>
      )}
      <Field
        label={pandit ? 'Dakshina for the family (₹)' : 'Price per person (₹)'}
        error={errors.price?.message}
        hint="Pilgrims pay this + 18% GST + 5% platform fee; you receive this amount"
      >
        <Input type="number" {...form.register('price')} />
      </Field>
      <div className="sm:col-span-2">
        <Field
          label={pandit ? 'What is included' : 'Description'}
          {...(pandit
            ? { hint: 'Vidhi, samagri (who brings it), number of pandits, language' }
            : {})}
        >
          <Textarea rows={3} {...form.register('description')} />
        </Field>
      </div>
      <label className="flex items-center gap-2 text-sm sm:col-span-2">
        <input type="checkbox" {...form.register('isPublished')} /> Visible to pilgrims
      </label>
      <div className="sm:col-span-2">
        <ErrorBox message={error} />
        <Button type="submit" className="mt-2" loading={isSubmitting}>
          {x ? 'Save changes' : pandit ? 'Add service' : 'Add experience'}
        </Button>
      </div>
    </form>
  );
}

const slotSchema = z.object({
  from: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
  days: z.coerce.number().int().min(1).max(90),
  times: z
    .string()
    .refine(
      (v) =>
        splitList(v).every((t) => /^([01]\d|2[0-3]):[0-5]\d$/.test(t)) && splitList(v).length > 0,
      'Times like 06:30, 17:30',
    ),
  capacity: z.coerce.number().int().min(1).max(500),
});

function SlotsForm({
  vid,
  x,
  onDone,
  pandit = false,
}: {
  vid: string;
  x: Experience;
  onDone: () => void;
  pandit?: boolean;
}) {
  const invalidate = useInvalidate();
  const [error, setError] = useState<string | null>(null);
  const form = useForm<z.infer<typeof slotSchema>>({
    resolver: zodResolver(slotSchema),
    defaultValues: pandit
      ? { from: istToday(1), days: 14, times: '08:00, 11:00, 16:00', capacity: 1 }
      : { from: istToday(1), days: 7, times: '06:30, 17:30', capacity: x.maxGroupSize },
  });
  const { errors, isSubmitting } = form.formState;
  const onSubmit = form.handleSubmit(async (v) => {
    setError(null);
    const start = new Date(`${v.from}T00:00:00Z`);
    const dates = Array.from({ length: v.days }, (_, i) =>
      new Date(start.getTime() + i * 86_400_000).toISOString().slice(0, 10),
    );
    try {
      await api.POST('/v1/vendors/{vid}/experiences/{id}/slots', {
        params: { path: { vid, id: x.id } },
        body: { dates, times: splitList(v.times), capacity: v.capacity },
      });
      await invalidate('experiences', vid);
      onDone();
    } catch (e) {
      setError(errorMessage(e));
    }
  });
  return (
    <form onSubmit={onSubmit} className="grid gap-3 sm:grid-cols-2" noValidate>
      <Field label="From date" error={errors.from?.message}>
        <Input type="date" {...form.register('from')} />
      </Field>
      <Field label="For how many days" error={errors.days?.message}>
        <Input type="number" {...form.register('days')} />
      </Field>
      <Field
        label="Start times (IST)"
        error={errors.times?.message}
        hint="Comma separated, 24-hour"
      >
        <Input {...form.register('times')} />
      </Field>
      <Field
        label={pandit ? 'Families per time' : 'Seats per slot'}
        error={errors.capacity?.message}
        {...(pandit ? { hint: '1 = you serve one family at a time' } : {})}
      >
        <Input type="number" {...form.register('capacity')} />
      </Field>
      <div className="sm:col-span-2">
        <ErrorBox message={error} />
        <Button type="submit" className="mt-2" loading={isSubmitting}>
          Add slots
        </Button>
      </div>
    </form>
  );
}

type Dialog = { kind: 'exp'; x?: Experience } | { kind: 'slots'; x: Experience } | null;

export function ExperiencesSection({
  vid,
  canEdit,
  canInventory,
  pandit = false,
}: {
  vid: string;
  canEdit: boolean;
  canInventory: boolean;
  /** Pandit Ji services: puja/path/jyotish kinds, dakshina wording, templates. */
  pandit?: boolean;
}) {
  const list = useQuery({
    queryKey: ['experiences', vid],
    queryFn: async () =>
      must(await api.GET('/v1/vendors/{vid}/experiences', { params: { path: { vid } } })),
  });
  const invalidate = useInvalidate();
  const [dialog, setDialog] = useState<Dialog>(null);
  const close = () => {
    setDialog(null);
  };
  const removeSlot = async (slotId: string) => {
    await api.DELETE('/v1/vendors/{vid}/experience-slots/{slotId}', {
      params: { path: { vid, slotId } },
    });
    await invalidate('experiences', vid);
  };

  return (
    <Section
      title={pandit ? 'Pandit Ji services' : 'Experiences'}
      action={
        canEdit && (
          <Button
            variant="secondary"
            onClick={() => {
              setDialog({ kind: 'exp' });
            }}
          >
            <Plus className="h-4 w-4" /> {pandit ? 'Add service' : 'Add experience'}
          </Button>
        )
      }
    >
      {list.isLoading ? (
        <Spinner />
      ) : (list.data ?? []).length === 0 ? (
        <Empty title={pandit ? 'No services yet' : 'No experiences yet'}>
          {pandit
            ? 'Add your first puja, path or consultation from a template, then open dates and times.'
            : 'Boat rides, guided parikrama, cooking classes, add one and open time slots.'}
        </Empty>
      ) : (
        (list.data ?? []).map((x) => (
          <Card key={x.id}>
            <div className="flex flex-wrap items-start justify-between gap-3">
              <div>
                <p className="text-lg font-bold">{x.title}</p>
                <p className="text-sm text-muted">
                  {pandit
                    ? `${kindLabel(x.kind)} · ${String(x.durationMin)} min · dakshina ${rupees(x.pricePaise)} · pilgrim pays ${rupees(x.displayPricePaise)}`
                    : `${titleCase(x.kind)} · ${String(x.durationMin)} min · up to ${String(x.maxGroupSize)} · ${rupees(x.pricePaise)} per person`}
                </p>
              </div>
              <div className="flex items-center gap-2">
                <PublishedBadge on={x.isPublished} />
                {canEdit && (
                  <Button
                    variant="ghost"
                    onClick={() => {
                      setDialog({ kind: 'exp', x });
                    }}
                  >
                    <Pencil className="h-4 w-4" /> Edit
                  </Button>
                )}
              </div>
            </div>
            <div className="mt-4">
              <p className="mb-2 text-sm font-semibold">Next 30 days</p>
              {(x.slots ?? []).length === 0 ? (
                <p className="text-sm text-muted">No slots open.</p>
              ) : (
                <div className="flex flex-wrap gap-2">
                  {(x.slots ?? []).map((s) => (
                    <span
                      key={s.id}
                      className="inline-flex items-center gap-1 rounded-full bg-paper-2 px-3 py-1 text-xs"
                    >
                      {istDateTime(s.startsAt)} · {s.remaining}/{s.capacity} left
                      {canInventory && s.booked === 0 && (
                        <button aria-label="Remove slot" onClick={() => void removeSlot(s.id)}>
                          <X className="h-3 w-3 text-sos" />
                        </button>
                      )}
                    </span>
                  ))}
                </div>
              )}
              {canInventory && (
                <Button
                  variant="ghost"
                  className="mt-3"
                  onClick={() => {
                    setDialog({ kind: 'slots', x });
                  }}
                >
                  <CalendarPlus className="h-4 w-4" /> Open slots
                </Button>
              )}
            </div>
          </Card>
        ))
      )}
      <Modal
        open={dialog?.kind === 'exp'}
        title={
          dialog?.kind === 'exp' && dialog.x
            ? pandit
              ? 'Edit service'
              : 'Edit experience'
            : pandit
              ? 'Add Pandit Ji service'
              : 'Add experience'
        }
        onClose={close}
      >
        {dialog?.kind === 'exp' && (
          <ExperienceForm
            vid={vid}
            pandit={pandit}
            {...(dialog.x ? { x: dialog.x } : {})}
            onDone={close}
          />
        )}
      </Modal>
      <Modal
        open={dialog?.kind === 'slots'}
        title={pandit ? 'Open dates and times' : 'Open slots'}
        onClose={close}
      >
        {dialog?.kind === 'slots' && (
          <SlotsForm vid={vid} x={dialog.x} pandit={pandit} onDone={close} />
        )}
      </Modal>
    </Section>
  );
}
