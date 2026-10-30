'use client';

import { zodResolver } from '@hookform/resolvers/zod';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { useState } from 'react';
import { useForm } from 'react-hook-form';
import { z } from 'zod';
import { useHotels } from '../../../components/listings/hotels';
import {
  Button,
  Card,
  Empty,
  ErrorBox,
  Field,
  Input,
  PageHeader,
  Select,
  Spinner,
} from '../../../components/ui';
import { api, errorMessage, must } from '../../../lib/api';
import { istToday, rupees, toPaise } from '../../../lib/format';
import { useVendor } from '../../../lib/session';

const WEEKDAYS = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
const DAYS = 42;

const schema = z
  .object({
    from: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
    to: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
    price: z.union([z.literal(''), z.coerce.number().min(0)]),
    total: z.union([z.literal(''), z.coerce.number().int().min(0).max(1000)]),
    stopSell: z.enum(['keep', 'stop', 'open']),
    weekdays: z.array(z.string()),
  })
  .refine((v) => v.to >= v.from, { path: ['to'], message: 'End must be on or after start' });

function Calendar({ vid, rtid, editable }: { vid: string; rtid: string; editable: boolean }) {
  const qc = useQueryClient();
  const from = istToday();
  const to = istToday(DAYS - 1);
  const days = useQuery({
    queryKey: ['calendar', vid, rtid, from],
    queryFn: async () =>
      must(
        await api.GET('/v1/vendors/{vid}/room-types/{rtid}/inventory', {
          params: { path: { vid, rtid }, query: { from, to } },
        }),
      ),
  });
  const [error, setError] = useState<string | null>(null);
  const [saved, setSaved] = useState(false);
  const form = useForm<z.infer<typeof schema>>({
    resolver: zodResolver(schema),
    defaultValues: { from, to: istToday(6), price: '', total: '', stopSell: 'keep', weekdays: [] },
  });
  const { errors, isSubmitting } = form.formState;

  const onSubmit = form.handleSubmit(async (v) => {
    setError(null);
    setSaved(false);
    try {
      await api.PUT('/v1/vendors/{vid}/room-types/{rtid}/inventory', {
        params: { path: { vid, rtid } },
        body: {
          from: v.from,
          to: v.to,
          ...(v.price !== '' ? { pricePaise: toPaise(v.price) } : {}),
          ...(v.total !== '' ? { total: v.total } : {}),
          ...(v.stopSell !== 'keep' ? { stopSell: v.stopSell === 'stop' } : {}),
          ...(v.weekdays.length ? { weekdays: v.weekdays.map(Number) } : {}),
        },
      });
      await qc.invalidateQueries({ queryKey: ['calendar', vid, rtid] });
      setSaved(true);
    } catch (e) {
      setError(errorMessage(e));
    }
  });

  const list = days.data ?? [];
  const lead = list[0] ? new Date(`${list[0].date}T00:00:00Z`).getUTCDay() : 0;

  return (
    <div className="grid gap-5 xl:grid-cols-3">
      <Card className="xl:col-span-2">
        {days.isLoading ? (
          <Spinner />
        ) : (
          <div className="grid grid-cols-7 gap-1.5 text-xs">
            {WEEKDAYS.map((d) => (
              <div key={d} className="pb-1 text-center font-semibold text-muted">
                {d}
              </div>
            ))}
            {Array.from({ length: lead }, (_, i) => (
              <div key={`pad${i}`} />
            ))}
            {list.map((d) => {
              const full = d.available <= 0;
              return (
                <div
                  key={d.date}
                  className={`rounded-lg border p-1.5 ${
                    d.stopSell
                      ? 'border-red-200 bg-red-50'
                      : full
                        ? 'border-orange-200 bg-orange-50'
                        : 'border-line bg-white'
                  }`}
                >
                  <p className="font-semibold">{Number(d.date.slice(8))}</p>
                  <p className="font-bold text-navy">{rupees(d.pricePaise)}</p>
                  <p className="text-muted">
                    {d.stopSell ? 'Closed' : `${d.available}/${d.total} free`}
                  </p>
                </div>
              );
            })}
          </div>
        )}
      </Card>
      {editable && (
        <Card>
          <h2 className="mb-3 font-bold text-navy">Change dates</h2>
          <form onSubmit={onSubmit} className="space-y-3" noValidate>
            <div className="grid grid-cols-2 gap-2">
              <Field label="From" error={errors.from?.message}>
                <Input type="date" {...form.register('from')} />
              </Field>
              <Field label="To" error={errors.to?.message}>
                <Input type="date" {...form.register('to')} />
              </Field>
            </div>
            <Field label="Price per night (₹)" hint="Leave empty to keep">
              <Input type="number" {...form.register('price')} />
            </Field>
            <Field label="Rooms to sell" hint="Leave empty to keep">
              <Input type="number" {...form.register('total')} />
            </Field>
            <Field label="Selling">
              <Select {...form.register('stopSell')}>
                <option value="keep">Keep as is</option>
                <option value="stop">Close these dates</option>
                <option value="open">Open these dates</option>
              </Select>
            </Field>
            <fieldset>
              <legend className="mb-1 text-sm font-medium">Only on (optional)</legend>
              <div className="flex flex-wrap gap-2 text-sm">
                {WEEKDAYS.map((d, i) => (
                  <label key={d} className="flex items-center gap-1">
                    <input type="checkbox" value={String(i)} {...form.register('weekdays')} /> {d}
                  </label>
                ))}
              </div>
            </fieldset>
            <ErrorBox message={error} />
            {saved && <p className="text-sm text-ok">Calendar updated</p>}
            <Button type="submit" loading={isSubmitting}>
              Apply
            </Button>
          </form>
        </Card>
      )}
    </div>
  );
}

export default function CalendarPage() {
  const { vid, can } = useVendor();
  const hotels = useHotels(vid);
  const rooms = (hotels.data ?? []).flatMap((h) =>
    (h.roomTypes ?? []).map((r) => ({ ...r, hotel: h.name })),
  );
  const [picked, setPicked] = useState<string>('');
  const rtid = picked || rooms[0]?.id || '';

  return (
    <>
      <PageHeader
        title="Room calendar"
        subtitle="Set prices, rooms to sell and closed dates for the next six weeks."
        actions={
          rooms.length > 1 && (
            <Select
              aria-label="Room type"
              value={rtid}
              onChange={(e) => {
                setPicked(e.target.value);
              }}
            >
              {rooms.map((r) => (
                <option key={r.id} value={r.id}>
                  {r.hotel} · {r.name}
                </option>
              ))}
            </Select>
          )
        }
      />
      {hotels.isLoading ? (
        <Spinner />
      ) : !rtid ? (
        <Empty title="No room types yet">Add a stay and its room types under Listings first.</Empty>
      ) : (
        <Calendar key={rtid} vid={vid} rtid={rtid} editable={can('inventory.edit')} />
      )}
    </>
  );
}
