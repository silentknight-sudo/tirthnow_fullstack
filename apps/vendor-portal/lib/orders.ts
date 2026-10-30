'use client';

import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { newIdempotencyKey, type Schemas } from '@tirth-now/api-client';
import { api, must } from './api';

export type Order = Schemas['OrderResponse'];
export type OrderStatus = Order['status'];
export type OrderType = Order['type'];

export function useVendorOrders(vid: string, status?: OrderStatus, type?: OrderType) {
  return useQuery({
    queryKey: ['orders', vid, status ?? 'all', type ?? 'all'],
    queryFn: async () =>
      must(
        await api.GET('/v1/vendors/{vid}/orders', {
          params: {
            path: { vid },
            query: { limit: 50, ...(status ? { status } : {}), ...(type ? { type } : {}) },
          },
        }),
      ) as unknown as { data: Order[]; nextCursor: string | null },
  });
}

export function useVendorOrder(vid: string, id: string | null) {
  return useQuery({
    queryKey: ['order', vid, id],
    enabled: id !== null,
    queryFn: async () =>
      must(
        await api.GET('/v1/vendors/{vid}/orders/{id}', { params: { path: { vid, id: id ?? '' } } }),
      ),
  });
}

export type OrderAction = 'accept' | 'start' | 'complete' | 'reject' | 'cancel';

/** Vendor-side transitions; reject/cancel need a reason and an idempotency key. */
export function useOrderAction(vid: string) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async ({
      id,
      action,
      reason,
    }: {
      id: string;
      action: OrderAction;
      reason?: string;
    }) => {
      const path = { vid, id };
      switch (action) {
        case 'accept':
          return api.POST('/v1/vendors/{vid}/orders/{id}/accept', { params: { path } });
        case 'start':
          return api.POST('/v1/vendors/{vid}/orders/{id}/start', { params: { path } });
        case 'complete':
          return api.POST('/v1/vendors/{vid}/orders/{id}/complete', { params: { path } });
        case 'reject':
          return api.POST('/v1/vendors/{vid}/orders/{id}/reject', {
            params: { path, header: { 'Idempotency-Key': newIdempotencyKey() } },
            body: { reason: reason ?? '' },
          });
        case 'cancel':
          return api.POST('/v1/vendors/{vid}/orders/{id}/cancel', {
            params: { path, header: { 'Idempotency-Key': newIdempotencyKey() } },
            body: { reason: reason ?? '' },
          });
      }
    },
    onSuccess: () =>
      qc.invalidateQueries({
        predicate: (q) => ['orders', 'order', 'earnings'].includes(q.queryKey[0] as string),
      }),
  });
}

/** Which buttons to offer for an order, mirroring the API's state machine (ADR-0004). */
export function availableActions(o: Order): OrderAction[] {
  const accepted = o.subStatus === 'accepted' || o.subStatus === 'driver_assigned';
  switch (o.status) {
    case 'confirmed':
      return accepted ? ['start', 'complete', 'cancel'] : ['accept', 'reject'];
    case 'in_progress':
      return ['complete'];
    default:
      return [];
  }
}

/** Booking details are keyed by type (`details.hotel.guestName`, …). */
export function guestLabel(o: Order): string {
  const details = o.details as Record<string, unknown>;
  const section = details[o.type] as Record<string, unknown> | undefined;
  const name = section?.guestName ?? details.guestName;
  return typeof name === 'string' && name ? name : `Guest ${o.userId.slice(0, 6)}`;
}

/** Human name for an order line from its price snapshot. */
export function itemLabel(snapshot: unknown, fallback: string): string {
  const s = (snapshot ?? {}) as Record<string, unknown>;
  for (const k of ['roomTypeName', 'name', 'title', 'vehicleClass']) {
    if (typeof s[k] === 'string' && s[k]) return s[k];
  }
  return fallback;
}
