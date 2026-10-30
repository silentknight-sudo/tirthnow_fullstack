'use client';

import { zodResolver } from '@hookform/resolvers/zod';
import { useQuery } from '@tanstack/react-query';
import type { Schemas } from '@tirth-now/api-client';
import { BedDouble, Pencil, Plus, Trash2 } from 'lucide-react';
import { useState } from 'react';
import { useForm } from 'react-hook-form';
import { z } from 'zod';
import { api, errorMessage, must } from '../../lib/api';
import { rupees, toPaise } from '../../lib/format';
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
import { PublishedBadge, Section, amenityTags, useInvalidate } from './common';

type Hotel = Schemas['HotelResponse'];
type RoomType = Schemas['RoomTypeResponse'];

export function useHotels(vid: string) {
  return useQuery({
    queryKey: ['hotels', vid],
    queryFn: async () =>
      must(await api.GET('/v1/vendors/{vid}/hotels', { params: { path: { vid } } })),
  });
}

const hotelSchema = z.object({
  nameEn: z.string().trim().min(2, 'Enter a name').max(120),
  nameHi: z.string().trim().max(120).optional(),
  address: z.string().trim().min(5, 'Enter the address').max(300),
  cityId: z.string().uuid('Choose a city'),
  lat: z.coerce.number().min(-90).max(90),
  lng: z.coerce.number().min(-180).max(180),
  checkinTime: z.string().regex(/^\d{2}:\d{2}$/, 'HH:MM'),
  checkoutTime: z.string().regex(/^\d{2}:\d{2}$/, 'HH:MM'),
  starRating: z.coerce.number().int().min(0).max(5),
  amenities: z.string().optional(),
  description: z.string().max(2000).optional(),
  freeUntilHoursBefore: z.coerce.number().int().min(0).max(720),
  penaltyPctAfter: z.coerce.number().int().min(0).max(100),
  isPublished: z.boolean(),
});
type HotelValues = z.infer<typeof hotelSchema>;

function HotelForm({ vid, hotel, onDone }: { vid: string; hotel?: Hotel; onDone: () => void }) {
  const cities = useCities();
  const invalidate = useInvalidate();
  const [error, setError] = useState<string | null>(null);
  const form = useForm<HotelValues>({
    resolver: zodResolver(hotelSchema),
    defaultValues: {
      nameEn: hotel?.name ?? '',
      address: hotel?.address ?? '',
      cityId: hotel?.cityId ?? '',
      lat: hotel?.lat ?? 27.58,
      lng: hotel?.lng ?? 77.7,
      checkinTime: hotel?.checkinTime ?? '12:00',
      checkoutTime: hotel?.checkoutTime ?? '11:00',
      starRating: hotel?.starRating ?? 0,
      amenities: hotel?.amenities.join(', ') ?? '',
      description: hotel?.description ?? '',
      freeUntilHoursBefore: hotel?.cancellationPolicy.freeUntilHoursBefore ?? 48,
      penaltyPctAfter: hotel?.cancellationPolicy.penaltyPctAfter ?? 50,
      isPublished: hotel?.isPublished ?? false,
    },
  });
  const { errors, isSubmitting } = form.formState;
  const onSubmit = form.handleSubmit(async (v) => {
    setError(null);
    const body = {
      name: { en: v.nameEn, ...(v.nameHi ? { hi: v.nameHi } : {}) },
      address: v.address,
      cityId: v.cityId,
      lat: v.lat,
      lng: v.lng,
      checkinTime: v.checkinTime,
      checkoutTime: v.checkoutTime,
      ...(v.starRating > 0 ? { starRating: v.starRating } : {}),
      amenities: amenityTags(v.amenities),
      ...(v.description ? { description: { en: v.description } } : {}),
      cancellationPolicy: {
        freeUntilHoursBefore: v.freeUntilHoursBefore,
        penaltyPctAfter: v.penaltyPctAfter,
      },
      isPublished: v.isPublished,
    };
    try {
      if (hotel) {
        await api.PATCH('/v1/vendors/{vid}/hotels/{id}', {
          params: { path: { vid, id: hotel.id } },
          body,
        });
      } else {
        await api.POST('/v1/vendors/{vid}/hotels', { params: { path: { vid } }, body });
      }
      await invalidate('hotels', vid);
      onDone();
    } catch (e) {
      setError(errorMessage(e));
    }
  });
  return (
    <form onSubmit={onSubmit} className="grid gap-3 sm:grid-cols-2" noValidate>
      <Field label="Name (English)" error={errors.nameEn?.message}>
        <Input {...form.register('nameEn')} />
      </Field>
      <Field label="Name (Hindi, optional)">
        <Input {...form.register('nameHi')} />
      </Field>
      <div className="sm:col-span-2">
        <Field label="Address" error={errors.address?.message}>
          <Input {...form.register('address')} />
        </Field>
      </div>
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
      <Field label="Star rating (0 if none)" error={errors.starRating?.message}>
        <Input type="number" min={0} max={5} {...form.register('starRating')} />
      </Field>
      <Field
        label="Latitude"
        error={errors.lat?.message}
        hint="From Google Maps: right-click → copy"
      >
        <Input type="number" step="any" {...form.register('lat')} />
      </Field>
      <Field label="Longitude" error={errors.lng?.message}>
        <Input type="number" step="any" {...form.register('lng')} />
      </Field>
      <Field label="Check-in" error={errors.checkinTime?.message}>
        <Input type="time" {...form.register('checkinTime')} />
      </Field>
      <Field label="Check-out" error={errors.checkoutTime?.message}>
        <Input type="time" {...form.register('checkoutTime')} />
      </Field>
      <div className="sm:col-span-2">
        <Field label="Amenities" hint="Comma separated, e.g. wifi, ac, parking, satvik-kitchen">
          <Input {...form.register('amenities')} />
        </Field>
      </div>
      <div className="sm:col-span-2">
        <Field label="Description">
          <Textarea rows={3} {...form.register('description')} />
        </Field>
      </div>
      <Field
        label="Free cancellation until (hours before)"
        error={errors.freeUntilHoursBefore?.message}
      >
        <Input type="number" {...form.register('freeUntilHoursBefore')} />
      </Field>
      <Field label="Penalty after that (%)" error={errors.penaltyPctAfter?.message}>
        <Input type="number" {...form.register('penaltyPctAfter')} />
      </Field>
      <label className="flex items-center gap-2 text-sm sm:col-span-2">
        <input type="checkbox" {...form.register('isPublished')} /> Visible to pilgrims (after
        approval)
      </label>
      <div className="sm:col-span-2">
        <ErrorBox message={error} />
        <Button type="submit" className="mt-2" loading={isSubmitting}>
          {hotel ? 'Save changes' : 'Add stay'}
        </Button>
      </div>
    </form>
  );
}

const roomSchema = z.object({
  nameEn: z.string().trim().min(2).max(80),
  maxGuests: z.coerce.number().int().min(1).max(20),
  totalRooms: z.coerce.number().int().min(1).max(500),
  basePrice: rupeeField,
  amenities: z.string().optional(),
});

function RoomForm({
  vid,
  hotelId,
  room,
  onDone,
}: {
  vid: string;
  hotelId: string;
  room?: RoomType;
  onDone: () => void;
}) {
  const invalidate = useInvalidate();
  const [error, setError] = useState<string | null>(null);
  const form = useForm<z.infer<typeof roomSchema>>({
    resolver: zodResolver(roomSchema),
    defaultValues: {
      nameEn: room?.name ?? '',
      maxGuests: room?.maxGuests ?? 2,
      totalRooms: room?.totalRooms ?? 1,
      basePrice: room ? room.basePricePaise / 100 : 1500,
      amenities: room?.amenities.join(', ') ?? '',
    },
  });
  const { errors, isSubmitting } = form.formState;
  const onSubmit = form.handleSubmit(async (v) => {
    setError(null);
    const body = {
      name: { en: v.nameEn },
      maxGuests: v.maxGuests,
      totalRooms: v.totalRooms,
      basePricePaise: toPaise(v.basePrice),
      amenities: amenityTags(v.amenities),
    };
    try {
      if (room) {
        await api.PATCH('/v1/vendors/{vid}/room-types/{rtid}', {
          params: { path: { vid, rtid: room.id } },
          body,
        });
      } else {
        await api.POST('/v1/vendors/{vid}/hotels/{id}/room-types', {
          params: { path: { vid, id: hotelId } },
          body,
        });
      }
      await invalidate('hotels', vid);
      onDone();
    } catch (e) {
      setError(errorMessage(e));
    }
  });
  return (
    <form onSubmit={onSubmit} className="grid gap-3 sm:grid-cols-2" noValidate>
      <div className="sm:col-span-2">
        <Field label="Room name" error={errors.nameEn?.message}>
          <Input placeholder="Deluxe Room" {...form.register('nameEn')} />
        </Field>
      </div>
      <Field label="Guests per room" error={errors.maxGuests?.message}>
        <Input type="number" {...form.register('maxGuests')} />
      </Field>
      <Field label="Number of rooms" error={errors.totalRooms?.message}>
        <Input type="number" {...form.register('totalRooms')} />
      </Field>
      <Field
        label="Price per night (₹)"
        error={errors.basePrice?.message}
        hint="Change prices for dates in Room calendar"
      >
        <Input type="number" step="1" {...form.register('basePrice')} />
      </Field>
      <Field label="Amenities" hint="Comma separated">
        <Input {...form.register('amenities')} />
      </Field>
      <div className="sm:col-span-2">
        <ErrorBox message={error} />
        <Button type="submit" className="mt-2" loading={isSubmitting}>
          {room ? 'Save room' : 'Add room type'}
        </Button>
      </div>
    </form>
  );
}

type Dialog =
  { kind: 'hotel'; hotel?: Hotel } | { kind: 'room'; hotelId: string; room?: RoomType } | null;

export function HotelsSection({ vid, canEdit }: { vid: string; canEdit: boolean }) {
  const hotels = useHotels(vid);
  const invalidate = useInvalidate();
  const [dialog, setDialog] = useState<Dialog>(null);
  const close = () => {
    setDialog(null);
  };

  const removeRoom = async (rtid: string) => {
    if (!window.confirm('Remove this room type? Future bookings are not affected.')) return;
    await api.DELETE('/v1/vendors/{vid}/room-types/{rtid}', { params: { path: { vid, rtid } } });
    await invalidate('hotels', vid);
  };

  return (
    <Section
      title="Stays"
      action={
        canEdit && (
          <Button
            variant="secondary"
            onClick={() => {
              setDialog({ kind: 'hotel' });
            }}
          >
            <Plus className="h-4 w-4" /> Add stay
          </Button>
        )
      }
    >
      {hotels.isLoading ? (
        <Spinner />
      ) : (hotels.data ?? []).length === 0 ? (
        <Empty title="No stays yet">Add your hotel or dharamshala, then its room types.</Empty>
      ) : (
        (hotels.data ?? []).map((h) => (
          <Card key={h.id}>
            <div className="flex flex-wrap items-start justify-between gap-3">
              <div>
                <p className="text-lg font-bold text-ink">{h.name}</p>
                <p className="text-sm text-muted">{h.address}</p>
              </div>
              <div className="flex items-center gap-2">
                <PublishedBadge on={h.isPublished} />
                {canEdit && (
                  <Button
                    variant="ghost"
                    aria-label={`Edit ${h.name}`}
                    onClick={() => {
                      setDialog({ kind: 'hotel', hotel: h });
                    }}
                  >
                    <Pencil className="h-4 w-4" /> Edit
                  </Button>
                )}
              </div>
            </div>
            <ul className="mt-4 divide-y divide-line rounded-xl border border-line">
              {(h.roomTypes ?? []).length === 0 && (
                <li className="px-4 py-3 text-sm text-muted">No room types yet.</li>
              )}
              {(h.roomTypes ?? []).map((r) => (
                <li
                  key={r.id}
                  className="flex flex-wrap items-center justify-between gap-2 px-4 py-3 text-sm"
                >
                  <span className="flex items-center gap-2">
                    <BedDouble className="h-4 w-4 text-saffron" aria-hidden />
                    <b>{r.name}</b>
                    <span className="text-muted">
                      · {r.totalRooms} rooms · up to {r.maxGuests} guests
                    </span>
                  </span>
                  <span className="flex items-center gap-3">
                    <b>{rupees(r.basePricePaise)}</b>
                    <span className="text-muted">/ night</span>
                    {canEdit && (
                      <>
                        <button
                          aria-label={`Edit ${r.name}`}
                          onClick={() => {
                            setDialog({ kind: 'room', hotelId: h.id, room: r });
                          }}
                        >
                          <Pencil className="h-4 w-4 text-navy" />
                        </button>
                        <button
                          aria-label={`Remove ${r.name}`}
                          onClick={() => void removeRoom(r.id)}
                        >
                          <Trash2 className="h-4 w-4 text-sos" />
                        </button>
                      </>
                    )}
                  </span>
                </li>
              ))}
            </ul>
            {canEdit && (
              <Button
                variant="ghost"
                className="mt-3"
                onClick={() => {
                  setDialog({ kind: 'room', hotelId: h.id });
                }}
              >
                <Plus className="h-4 w-4" /> Add room type
              </Button>
            )}
          </Card>
        ))
      )}
      <Modal
        open={dialog?.kind === 'hotel'}
        title={dialog?.kind === 'hotel' && dialog.hotel ? 'Edit stay' : 'Add stay'}
        onClose={close}
      >
        {dialog?.kind === 'hotel' && (
          <HotelForm vid={vid} {...(dialog.hotel ? { hotel: dialog.hotel } : {})} onDone={close} />
        )}
      </Modal>
      <Modal
        open={dialog?.kind === 'room'}
        title={dialog?.kind === 'room' && dialog.room ? 'Edit room type' : 'Add room type'}
        onClose={close}
      >
        {dialog?.kind === 'room' && (
          <RoomForm
            vid={vid}
            hotelId={dialog.hotelId}
            {...(dialog.room ? { room: dialog.room } : {})}
            onDone={close}
          />
        )}
      </Modal>
    </Section>
  );
}
