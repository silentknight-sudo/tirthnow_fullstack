'use client';

import { zodResolver } from '@hookform/resolvers/zod';
import { useQuery } from '@tanstack/react-query';
import type { Schemas } from '@tirth-now/api-client';
import { Pencil, Plus, Trash2 } from 'lucide-react';
import { useState } from 'react';
import { useForm } from 'react-hook-form';
import { z } from 'zod';
import { api, errorMessage, must } from '../../lib/api';
import { rupees, titleCase, toPaise } from '../../lib/format';
import { rupeeField } from '../../lib/validation';
import {
  Badge,
  Button,
  Card,
  Empty,
  ErrorBox,
  Field,
  Input,
  Modal,
  Select,
  Spinner,
  Table,
} from '../ui';
import { Section, useInvalidate } from './common';

type Vehicle = Schemas['VehicleResponse'];
type Fare = Schemas['CabFareResponse'];
type VehicleClass = Vehicle['class'];
const CLASSES: VehicleClass[] = [
  'e_rickshaw',
  'auto',
  'hatchback',
  'sedan',
  'suv',
  'tempo_traveller',
];

const vehicleSchema = z.object({
  class: z.enum(['auto', 'hatchback', 'sedan', 'suv', 'tempo_traveller', 'e_rickshaw']),
  registrationNo: z
    .string()
    .trim()
    .toUpperCase()
    .regex(/^[A-Z]{2}\s?\d{1,2}\s?[A-Z]{0,3}\s?\d{1,4}$/, 'e.g. UP85 AB 1234'),
  model: z.string().trim().max(60).optional(),
  seats: z.coerce.number().int().min(1).max(20),
  driverName: z.string().trim().max(80).optional(),
  driverPhone: z
    .string()
    .trim()
    .regex(/^[6-9]\d{9}$/, '10-digit mobile number')
    .or(z.literal('')),
  isActive: z.boolean(),
});

function VehicleForm({ vid, v, onDone }: { vid: string; v?: Vehicle; onDone: () => void }) {
  const invalidate = useInvalidate();
  const [error, setError] = useState<string | null>(null);
  const form = useForm<z.infer<typeof vehicleSchema>>({
    resolver: zodResolver(vehicleSchema),
    defaultValues: {
      class: v?.class ?? 'sedan',
      registrationNo: v?.registrationNo ?? '',
      model: v?.model ?? '',
      seats: v?.seats ?? 4,
      driverName: v?.driverName ?? '',
      driverPhone: v?.driverPhoneE164?.replace(/^\+91/, '') ?? '',
      isActive: v?.isActive ?? true,
    },
  });
  const { errors, isSubmitting } = form.formState;
  const onSubmit = form.handleSubmit(async (x) => {
    setError(null);
    const body = {
      class: x.class,
      registrationNo: x.registrationNo.replace(/\s+/g, ''),
      seats: x.seats,
      isActive: x.isActive,
      ...(x.model ? { model: x.model } : {}),
      ...(x.driverName ? { driverName: x.driverName } : {}),
      ...(x.driverPhone ? { driverPhoneE164: `+91${x.driverPhone}` } : {}),
    };
    try {
      if (v)
        await api.PATCH('/v1/vendors/{vid}/vehicles/{id}', {
          params: { path: { vid, id: v.id } },
          body,
        });
      else await api.POST('/v1/vendors/{vid}/vehicles', { params: { path: { vid } }, body });
      await invalidate('vehicles', vid);
      onDone();
    } catch (e) {
      setError(errorMessage(e));
    }
  });
  return (
    <form onSubmit={onSubmit} className="grid gap-3 sm:grid-cols-2" noValidate>
      <Field label="Type">
        <Select {...form.register('class')}>
          {CLASSES.map((c) => (
            <option key={c} value={c}>
              {titleCase(c)}
            </option>
          ))}
        </Select>
      </Field>
      <Field label="Registration no." error={errors.registrationNo?.message}>
        <Input className="uppercase" {...form.register('registrationNo')} />
      </Field>
      <Field label="Model">
        <Input placeholder="Maruti Dzire" {...form.register('model')} />
      </Field>
      <Field label="Seats" error={errors.seats?.message}>
        <Input type="number" {...form.register('seats')} />
      </Field>
      <Field label="Driver name">
        <Input {...form.register('driverName')} />
      </Field>
      <Field label="Driver mobile" error={errors.driverPhone?.message}>
        <Input inputMode="tel" {...form.register('driverPhone')} />
      </Field>
      <label className="flex items-center gap-2 text-sm sm:col-span-2">
        <input type="checkbox" {...form.register('isActive')} /> Available for bookings
      </label>
      <div className="sm:col-span-2">
        <ErrorBox message={error} />
        <Button type="submit" className="mt-2" loading={isSubmitting}>
          {v ? 'Save vehicle' : 'Add vehicle'}
        </Button>
      </div>
    </form>
  );
}

const fareSchema = z.object({
  baseFare: rupeeField,
  perKm: rupeeField,
  perMin: rupeeField,
  minFare: rupeeField,
  nightSurchargePct: z.coerce.number().int().min(0).max(100),
});

function FareForm({
  vid,
  cls,
  fare,
  onDone,
}: {
  vid: string;
  cls: VehicleClass;
  fare?: Fare;
  onDone: () => void;
}) {
  const invalidate = useInvalidate();
  const [error, setError] = useState<string | null>(null);
  const form = useForm<z.infer<typeof fareSchema>>({
    resolver: zodResolver(fareSchema),
    defaultValues: {
      baseFare: (fare?.baseFarePaise ?? 5000) / 100,
      perKm: (fare?.perKmPaise ?? 1400) / 100,
      perMin: (fare?.perMinPaise ?? 100) / 100,
      minFare: (fare?.minFarePaise ?? 15000) / 100,
      nightSurchargePct: fare?.nightSurchargePct ?? 0,
    },
  });
  const { errors, isSubmitting } = form.formState;
  const onSubmit = form.handleSubmit(async (x) => {
    setError(null);
    try {
      await api.PUT('/v1/vendors/{vid}/cab-fares/{class}', {
        params: { path: { vid, class: cls } },
        body: {
          baseFarePaise: toPaise(x.baseFare),
          perKmPaise: toPaise(x.perKm),
          perMinPaise: toPaise(x.perMin),
          minFarePaise: toPaise(x.minFare),
          nightSurchargePct: x.nightSurchargePct,
          fixedRoutes: fare?.fixedRoutes ?? [],
        },
      });
      await invalidate('fares', vid);
      onDone();
    } catch (e) {
      setError(errorMessage(e));
    }
  });
  return (
    <form onSubmit={onSubmit} className="grid gap-3 sm:grid-cols-2" noValidate>
      <Field label="Base fare (₹)" error={errors.baseFare?.message}>
        <Input type="number" step="0.5" {...form.register('baseFare')} />
      </Field>
      <Field label="Per km (₹)" error={errors.perKm?.message}>
        <Input type="number" step="0.5" {...form.register('perKm')} />
      </Field>
      <Field label="Per minute (₹)" error={errors.perMin?.message}>
        <Input type="number" step="0.5" {...form.register('perMin')} />
      </Field>
      <Field label="Minimum fare (₹)" error={errors.minFare?.message}>
        <Input type="number" {...form.register('minFare')} />
      </Field>
      <Field
        label="Night surcharge (%)"
        error={errors.nightSurchargePct?.message}
        hint="10 pm – 6 am"
      >
        <Input type="number" {...form.register('nightSurchargePct')} />
      </Field>
      <div className="sm:col-span-2">
        <ErrorBox message={error} />
        <Button type="submit" className="mt-2" loading={isSubmitting}>
          Save fares
        </Button>
      </div>
    </form>
  );
}

type Dialog =
  { kind: 'vehicle'; v?: Vehicle } | { kind: 'fare'; cls: VehicleClass; fare?: Fare } | null;

export function CabsSection({ vid, canEdit }: { vid: string; canEdit: boolean }) {
  const vehicles = useQuery({
    queryKey: ['vehicles', vid],
    queryFn: async () =>
      must(await api.GET('/v1/vendors/{vid}/vehicles', { params: { path: { vid } } })),
  });
  const fares = useQuery({
    queryKey: ['fares', vid],
    queryFn: async () =>
      must(await api.GET('/v1/vendors/{vid}/cab-fares', { params: { path: { vid } } })),
  });
  const invalidate = useInvalidate();
  const [dialog, setDialog] = useState<Dialog>(null);
  const close = () => {
    setDialog(null);
  };
  const remove = async (v: Vehicle) => {
    if (!window.confirm(`Remove ${v.registrationNo}?`)) return;
    await api.DELETE('/v1/vendors/{vid}/vehicles/{id}', { params: { path: { vid, id: v.id } } });
    await invalidate('vehicles', vid);
  };
  const fareBy = new Map((fares.data ?? []).map((f) => [f.class, f]));
  const usedClasses = CLASSES.filter(
    (c) => (vehicles.data ?? []).some((v) => v.class === c) || fareBy.has(c),
  );

  return (
    <Section
      title="Cabs"
      action={
        canEdit && (
          <Button
            variant="secondary"
            onClick={() => {
              setDialog({ kind: 'vehicle' });
            }}
          >
            <Plus className="h-4 w-4" /> Add vehicle
          </Button>
        )
      }
    >
      {vehicles.isLoading ? (
        <Spinner />
      ) : (vehicles.data ?? []).length === 0 ? (
        <Empty title="No vehicles yet">
          Add each vehicle with its driver; a booking is assigned to an available one when you
          accept.
        </Empty>
      ) : (
        <Table head={['Vehicle', 'Type', 'Seats', 'Driver', 'Status', '']}>
          {(vehicles.data ?? []).map((v) => (
            <tr key={v.id}>
              <td className="px-4 py-3 font-semibold">
                {v.registrationNo}
                <p className="text-xs font-normal text-muted">{v.model}</p>
              </td>
              <td className="px-4 py-3">{titleCase(v.class)}</td>
              <td className="px-4 py-3">{v.seats}</td>
              <td className="px-4 py-3">
                {v.driverName ?? '—'}
                <p className="text-xs text-muted">{v.driverPhoneE164}</p>
              </td>
              <td className="px-4 py-3">
                {v.isActive ? <Badge tone="green">Active</Badge> : <Badge>Off</Badge>}
              </td>
              <td className="px-4 py-3">
                {canEdit && (
                  <span className="flex gap-3">
                    <button
                      aria-label={`Edit ${v.registrationNo}`}
                      onClick={() => {
                        setDialog({ kind: 'vehicle', v });
                      }}
                    >
                      <Pencil className="h-4 w-4 text-navy" />
                    </button>
                    <button
                      aria-label={`Remove ${v.registrationNo}`}
                      onClick={() => void remove(v)}
                    >
                      <Trash2 className="h-4 w-4 text-sos" />
                    </button>
                  </span>
                )}
              </td>
            </tr>
          ))}
        </Table>
      )}
      {usedClasses.length > 0 && (
        <Card>
          <h3 className="mb-3 font-bold text-navy">Fares</h3>
          <ul className="divide-y divide-line text-sm">
            {usedClasses.map((c) => {
              const f = fareBy.get(c);
              return (
                <li key={c} className="flex flex-wrap items-center justify-between gap-2 py-2">
                  <b>{titleCase(c)}</b>
                  <span className="text-muted">
                    {f
                      ? `${rupees(f.baseFarePaise)} base · ${rupees(f.perKmPaise)}/km · min ${rupees(f.minFarePaise)}${f.nightSurchargePct ? ` · night +${f.nightSurchargePct}%` : ''}`
                      : 'No fare set — this class cannot be booked'}
                  </span>
                  {canEdit && (
                    <Button
                      variant="ghost"
                      onClick={() => {
                        setDialog({ kind: 'fare', cls: c, ...(f ? { fare: f } : {}) });
                      }}
                    >
                      {f ? 'Edit' : 'Set fare'}
                    </Button>
                  )}
                </li>
              );
            })}
          </ul>
        </Card>
      )}
      <Modal
        open={dialog?.kind === 'vehicle'}
        title={dialog?.kind === 'vehicle' && dialog.v ? 'Edit vehicle' : 'Add vehicle'}
        onClose={close}
      >
        {dialog?.kind === 'vehicle' && (
          <VehicleForm vid={vid} {...(dialog.v ? { v: dialog.v } : {})} onDone={close} />
        )}
      </Modal>
      <Modal
        open={dialog?.kind === 'fare'}
        title={dialog?.kind === 'fare' ? `${titleCase(dialog.cls)} fares` : ''}
        onClose={close}
      >
        {dialog?.kind === 'fare' && (
          <FareForm
            vid={vid}
            cls={dialog.cls}
            {...(dialog.fare ? { fare: dialog.fare } : {})}
            onDone={close}
          />
        )}
      </Modal>
    </Section>
  );
}
