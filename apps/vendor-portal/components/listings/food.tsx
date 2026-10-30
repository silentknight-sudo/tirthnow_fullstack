'use client';

import { zodResolver } from '@hookform/resolvers/zod';
import { useQuery } from '@tanstack/react-query';
import type { Schemas } from '@tirth-now/api-client';
import { Pencil, Plus, Trash2 } from 'lucide-react';
import { useState } from 'react';
import { useForm } from 'react-hook-form';
import { z } from 'zod';
import { api, errorMessage, must } from '../../lib/api';
import { rupees, toPaise } from '../../lib/format';
import { useCities } from '../../lib/queries';
import { rupeeField } from '../../lib/validation';
import { Badge, Button, Card, Empty, ErrorBox, Field, Input, Modal, Select, Spinner } from '../ui';
import { PublishedBadge, Section, useInvalidate } from './common';

type Restaurant = Schemas['RestaurantResponse'];
type MenuItem = Schemas['MenuItemResponse'];

function useRestaurants(vid: string) {
  return useQuery({
    queryKey: ['restaurants', vid],
    queryFn: async () =>
      must(await api.GET('/v1/vendors/{vid}/restaurants', { params: { path: { vid } } })),
  });
}

const restaurantSchema = z.object({
  nameEn: z.string().trim().min(2).max(120),
  address: z.string().trim().max(300).optional(),
  cityId: z.string().uuid('Choose a city'),
  lat: z.coerce.number().min(-90).max(90),
  lng: z.coerce.number().min(-180).max(180),
  fssaiNo: z
    .string()
    .trim()
    .regex(/^\d{14}$/, 'FSSAI number is 14 digits')
    .or(z.literal('')),
  isPureVeg: z.boolean(),
  isSatvik: z.boolean(),
  acceptsOrders: z.boolean(),
  isPublished: z.boolean(),
});

function RestaurantForm({ vid, r, onDone }: { vid: string; r?: Restaurant; onDone: () => void }) {
  const cities = useCities();
  const invalidate = useInvalidate();
  const [error, setError] = useState<string | null>(null);
  const form = useForm<z.infer<typeof restaurantSchema>>({
    resolver: zodResolver(restaurantSchema),
    defaultValues: {
      nameEn: r?.name ?? '',
      address: r?.address ?? '',
      cityId: r?.cityId ?? '',
      lat: r?.lat ?? 27.58,
      lng: r?.lng ?? 77.7,
      fssaiNo: '',
      isPureVeg: r?.isPureVeg ?? true,
      isSatvik: r?.isSatvik ?? false,
      acceptsOrders: r?.acceptsOrders ?? true,
      isPublished: r?.isPublished ?? false,
    },
  });
  const { errors, isSubmitting } = form.formState;
  const onSubmit = form.handleSubmit(async (v) => {
    setError(null);
    const body = {
      name: { en: v.nameEn },
      cityId: v.cityId,
      lat: v.lat,
      lng: v.lng,
      isPureVeg: v.isPureVeg,
      isSatvik: v.isSatvik,
      acceptsOrders: v.acceptsOrders,
      isPublished: v.isPublished,
      ...(v.address ? { address: v.address } : {}),
      ...(v.fssaiNo ? { fssaiNo: v.fssaiNo } : {}),
    };
    try {
      if (r)
        await api.PATCH('/v1/vendors/{vid}/restaurants/{id}', {
          params: { path: { vid, id: r.id } },
          body,
        });
      else await api.POST('/v1/vendors/{vid}/restaurants', { params: { path: { vid } }, body });
      await invalidate('restaurants', vid);
      onDone();
    } catch (e) {
      setError(errorMessage(e));
    }
  });
  return (
    <form onSubmit={onSubmit} className="grid gap-3 sm:grid-cols-2" noValidate>
      <div className="sm:col-span-2">
        <Field label="Restaurant name" error={errors.nameEn?.message}>
          <Input {...form.register('nameEn')} />
        </Field>
      </div>
      <div className="sm:col-span-2">
        <Field label="Address">
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
      <Field label="FSSAI licence no." error={errors.fssaiNo?.message}>
        <Input inputMode="numeric" {...form.register('fssaiNo')} />
      </Field>
      <Field label="Latitude" error={errors.lat?.message}>
        <Input type="number" step="any" {...form.register('lat')} />
      </Field>
      <Field label="Longitude" error={errors.lng?.message}>
        <Input type="number" step="any" {...form.register('lng')} />
      </Field>
      <div className="flex flex-wrap gap-4 text-sm sm:col-span-2">
        <label className="flex items-center gap-2">
          <input type="checkbox" {...form.register('isPureVeg')} /> Pure veg
        </label>
        <label className="flex items-center gap-2">
          <input type="checkbox" {...form.register('isSatvik')} /> Satvik (no onion/garlic)
        </label>
        <label className="flex items-center gap-2">
          <input type="checkbox" {...form.register('acceptsOrders')} /> Accept orders in app
        </label>
        <label className="flex items-center gap-2">
          <input type="checkbox" {...form.register('isPublished')} /> Visible to pilgrims
        </label>
      </div>
      <div className="sm:col-span-2">
        <ErrorBox message={error} />
        <Button type="submit" className="mt-2" loading={isSubmitting}>
          {r ? 'Save changes' : 'Add restaurant'}
        </Button>
      </div>
    </form>
  );
}

const itemSchema = z.object({
  nameEn: z.string().trim().min(2).max(80),
  category: z.string().trim().min(2, 'e.g. Thali, Sweets').max(40),
  price: rupeeField,
  isJain: z.boolean(),
  isAvailable: z.boolean(),
});

function MenuItemForm({
  vid,
  restaurantId,
  item,
  onDone,
}: {
  vid: string;
  restaurantId: string;
  item?: MenuItem;
  onDone: () => void;
}) {
  const invalidate = useInvalidate();
  const [error, setError] = useState<string | null>(null);
  const form = useForm<z.infer<typeof itemSchema>>({
    resolver: zodResolver(itemSchema),
    defaultValues: {
      nameEn: item?.name ?? '',
      category: item?.category ?? '',
      price: item ? item.pricePaise / 100 : 150,
      isJain: item?.isJain ?? false,
      isAvailable: item?.isAvailable ?? true,
    },
  });
  const { errors, isSubmitting } = form.formState;
  const onSubmit = form.handleSubmit(async (v) => {
    setError(null);
    const body = {
      name: { en: v.nameEn },
      category: v.category,
      pricePaise: toPaise(v.price),
      isJain: v.isJain,
      isAvailable: v.isAvailable,
    };
    try {
      if (item)
        await api.PATCH('/v1/vendors/{vid}/menu-items/{id}', {
          params: { path: { vid, id: item.id } },
          body,
        });
      else
        await api.POST('/v1/vendors/{vid}/restaurants/{id}/menu-items', {
          params: { path: { vid, id: restaurantId } },
          body,
        });
      await invalidate('restaurants', vid);
      onDone();
    } catch (e) {
      setError(errorMessage(e));
    }
  });
  return (
    <form onSubmit={onSubmit} className="grid gap-3 sm:grid-cols-2" noValidate>
      <Field label="Dish" error={errors.nameEn?.message}>
        <Input {...form.register('nameEn')} />
      </Field>
      <Field label="Category" error={errors.category?.message}>
        <Input {...form.register('category')} />
      </Field>
      <Field label="Price (₹)" error={errors.price?.message}>
        <Input type="number" {...form.register('price')} />
      </Field>
      <div className="flex items-end gap-4 text-sm">
        <label className="flex items-center gap-2">
          <input type="checkbox" {...form.register('isJain')} /> Jain
        </label>
        <label className="flex items-center gap-2">
          <input type="checkbox" {...form.register('isAvailable')} /> Available
        </label>
      </div>
      <div className="sm:col-span-2">
        <ErrorBox message={error} />
        <Button type="submit" className="mt-2" loading={isSubmitting}>
          {item ? 'Save dish' : 'Add dish'}
        </Button>
      </div>
    </form>
  );
}

type Dialog =
  | { kind: 'restaurant'; r?: Restaurant }
  | { kind: 'item'; restaurantId: string; item?: MenuItem }
  | null;

export function FoodSection({ vid, canEdit }: { vid: string; canEdit: boolean }) {
  const list = useRestaurants(vid);
  const invalidate = useInvalidate();
  const [dialog, setDialog] = useState<Dialog>(null);
  const close = () => {
    setDialog(null);
  };

  const toggle = async (item: MenuItem) => {
    await api.PATCH('/v1/vendors/{vid}/menu-items/{id}', {
      params: { path: { vid, id: item.id } },
      body: { isAvailable: !item.isAvailable },
    });
    await invalidate('restaurants', vid);
  };
  const remove = async (item: MenuItem) => {
    if (!window.confirm(`Remove ${item.name}?`)) return;
    await api.DELETE('/v1/vendors/{vid}/menu-items/{id}', {
      params: { path: { vid, id: item.id } },
    });
    await invalidate('restaurants', vid);
  };

  return (
    <Section
      title="Food"
      action={
        canEdit && (
          <Button
            variant="secondary"
            onClick={() => {
              setDialog({ kind: 'restaurant' });
            }}
          >
            <Plus className="h-4 w-4" /> Add restaurant
          </Button>
        )
      }
    >
      {list.isLoading ? (
        <Spinner />
      ) : (list.data ?? []).length === 0 ? (
        <Empty title="No restaurants yet">
          Add your restaurant and its menu so pilgrims can order.
        </Empty>
      ) : (
        (list.data ?? []).map((r) => (
          <Card key={r.id}>
            <div className="flex flex-wrap items-start justify-between gap-3">
              <div>
                <p className="text-lg font-bold">{r.name}</p>
                <p className="text-sm text-muted">{r.address}</p>
                <div className="mt-1 flex gap-1">
                  {r.isPureVeg && <Badge tone="green">Pure veg</Badge>}
                  {r.isSatvik && <Badge tone="orange">Satvik</Badge>}
                  {!r.acceptsOrders && <Badge>Orders off</Badge>}
                </div>
              </div>
              <div className="flex items-center gap-2">
                <PublishedBadge on={r.isPublished} />
                {canEdit && (
                  <Button
                    variant="ghost"
                    onClick={() => {
                      setDialog({ kind: 'restaurant', r });
                    }}
                  >
                    <Pencil className="h-4 w-4" /> Edit
                  </Button>
                )}
              </div>
            </div>
            <ul className="mt-4 divide-y divide-line rounded-xl border border-line">
              {(r.menu ?? []).length === 0 && (
                <li className="px-4 py-3 text-sm text-muted">No dishes yet.</li>
              )}
              {(r.menu ?? []).map((m) => (
                <li
                  key={m.id}
                  className="flex flex-wrap items-center justify-between gap-2 px-4 py-3 text-sm"
                >
                  <span>
                    <b>{m.name}</b> <span className="text-muted">· {m.category}</span>{' '}
                    {m.isJain && <Badge tone="blue">Jain</Badge>}
                  </span>
                  <span className="flex items-center gap-3">
                    <b>{rupees(m.pricePaise)}</b>
                    {canEdit ? (
                      <>
                        <button
                          className={`text-xs font-semibold ${m.isAvailable ? 'text-ok' : 'text-muted'}`}
                          onClick={() => void toggle(m)}
                        >
                          {m.isAvailable ? 'Available' : 'Sold out'}
                        </button>
                        <button
                          aria-label={`Edit ${m.name}`}
                          onClick={() => {
                            setDialog({ kind: 'item', restaurantId: r.id, item: m });
                          }}
                        >
                          <Pencil className="h-4 w-4 text-navy" />
                        </button>
                        <button aria-label={`Remove ${m.name}`} onClick={() => void remove(m)}>
                          <Trash2 className="h-4 w-4 text-sos" />
                        </button>
                      </>
                    ) : (
                      !m.isAvailable && <Badge>Sold out</Badge>
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
                  setDialog({ kind: 'item', restaurantId: r.id });
                }}
              >
                <Plus className="h-4 w-4" /> Add dish
              </Button>
            )}
          </Card>
        ))
      )}
      <Modal
        open={dialog?.kind === 'restaurant'}
        title={dialog?.kind === 'restaurant' && dialog.r ? 'Edit restaurant' : 'Add restaurant'}
        onClose={close}
      >
        {dialog?.kind === 'restaurant' && (
          <RestaurantForm vid={vid} {...(dialog.r ? { r: dialog.r } : {})} onDone={close} />
        )}
      </Modal>
      <Modal
        open={dialog?.kind === 'item'}
        title={dialog?.kind === 'item' && dialog.item ? 'Edit dish' : 'Add dish'}
        onClose={close}
      >
        {dialog?.kind === 'item' && (
          <MenuItemForm
            vid={vid}
            restaurantId={dialog.restaurantId}
            {...(dialog.item ? { item: dialog.item } : {})}
            onDone={close}
          />
        )}
      </Modal>
    </Section>
  );
}
