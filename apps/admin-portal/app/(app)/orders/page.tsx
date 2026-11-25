'use client';

import { useQuery } from '@tanstack/react-query';
import type { Schemas } from '@tirth-now/api-client';
import { useState } from 'react';
import { Tabs, askReason, useAction } from '../../../components/admin';
import {
  Badge,
  Button,
  Empty,
  ErrorBox,
  Input,
  Modal,
  PageHeader,
  Spinner,
  Table,
} from '../../../components/ui';
import { api, as, errorMessage, idem } from '../../../lib/api';
import type { Page } from '../../../lib/types';
import { humanize, istDateTime, rupees, text } from '../../../lib/format';
import { tone } from '../../../lib/status';

type Order = Schemas['OrderResponse'];
const FILTERS = [
  ['all', 'All'],
  ['pending', 'Pending'],
  ['confirmed', 'Confirmed'],
  ['in_progress', 'In progress'],
  ['completed', 'Completed'],
  ['cancelled', 'Cancelled'],
  ['refunded', 'Refunded'],
] as const;
type Filter = (typeof FILTERS)[number][0];

function itemName(o: Order): string {
  return o.items
    .map(
      (i) => `${text((i.snapshot as Record<string, unknown>).name) || i.itemType} × ${i.quantity}`,
    )
    .join(', ');
}

export default function Orders() {
  const [status, setStatus] = useState<Filter>('all');
  const [code, setCode] = useState('');
  const [open, setOpen] = useState<Order | null>(null);
  const valid = /^TN-\d{4}-[A-Z0-9]{5}$/.test(code.trim().toUpperCase());
  const q = useQuery({
    queryKey: ['admin-orders', status, valid ? code : ''],
    queryFn: async () =>
      as<Page<Order>>(
        await api.GET('/v1/admin/orders', {
          params: {
            query: {
              limit: 50,
              ...(status === 'all' ? {} : { status }),
              ...(valid ? { code: code.trim().toUpperCase() } : {}),
            },
          },
        }),
      ),
  });
  const refresh = [['admin-orders'], ['kpis']];
  const act = useAction(
    async ({ o, action }: { o: Order; action: 'cancel' | 'complete' | 'refund' }) => {
      const path = { params: { path: { id: o.id } } };
      if (action === 'complete') return api.POST('/v1/admin/orders/{id}/complete', path);
      const withKey = { params: { path: { id: o.id }, header: idem() } };
      if (action === 'cancel') {
        const reason = askReason('Why is this order cancelled?');
        if (!reason) return undefined;
        return api.POST('/v1/admin/orders/{id}/cancel', { ...withKey, body: { reason } });
      }
      const rupeesIn = window.prompt(
        `Refund amount in ₹ (max ${rupees(o.totalPaise - (o.refundedPaise ?? 0))})`,
      );
      if (!rupeesIn) return undefined;
      const amountPaise = Math.round(Number(rupeesIn) * 100);
      if (!Number.isFinite(amountPaise) || amountPaise <= 0) return undefined;
      const reason = askReason('Reason for the refund');
      if (!reason) return undefined;
      return api.POST('/v1/admin/orders/{id}/refund', {
        ...withKey,
        body: { amountPaise, reason },
      });
    },
    refresh,
  );

  return (
    <>
      <PageHeader
        title="Orders & refunds"
        subtitle="Every booking and Temple Store order. Cancel, complete or refund from here."
        actions={
          <Input
            placeholder="Order code, e.g. TN-2611-5VAYY"
            value={code}
            onChange={(e) => {
              setCode(e.target.value);
            }}
            className="w-64"
          />
        }
      />
      <Tabs value={status} options={FILTERS} onChange={setStatus} />
      <ErrorBox message={act.error} />
      {q.isPending ? (
        <Spinner />
      ) : q.isError ? (
        <ErrorBox message={errorMessage(q.error)} />
      ) : q.data.data.length === 0 ? (
        <Empty title="No orders" />
      ) : (
        <Table head={['Code', 'Service', 'Items', 'Total', 'Status', 'Created', '']}>
          {q.data.data.map((o) => (
            <tr
              key={o.id}
              className="cursor-pointer hover:bg-paper/60"
              onClick={() => {
                setOpen(o);
              }}
            >
              <td className="px-4 py-3 font-mono text-xs font-semibold">{o.code}</td>
              <td className="px-4 py-3">{humanize(o.type)}</td>
              <td className="max-w-xs truncate px-4 py-3 text-xs">{itemName(o)}</td>
              <td className="px-4 py-3 font-semibold">{rupees(o.totalPaise)}</td>
              <td className="px-4 py-3">
                <Badge tone={tone(o.status)}>{humanize(o.status)}</Badge>
              </td>
              <td className="px-4 py-3 text-xs text-muted">{istDateTime(o.createdAt)}</td>
              <td className="px-4 py-3 text-right text-saffron">Open →</td>
            </tr>
          ))}
        </Table>
      )}
      <Modal
        open={open !== null}
        title={open?.code ?? ''}
        onClose={() => {
          setOpen(null);
        }}
      >
        {open && (
          <div className="space-y-3 text-sm">
            <p>
              <Badge tone={tone(open.status)}>{humanize(open.status)}</Badge> ·{' '}
              {humanize(open.type)} · {istDateTime(open.createdAt)}
            </p>
            <ul className="rounded-xl bg-paper p-3">
              {open.items.map((i, n) => (
                <li key={n} className="flex justify-between">
                  <span>
                    {text((i.snapshot as Record<string, unknown>).name) || i.itemType} ×{' '}
                    {i.quantity}
                  </span>
                  <span>{rupees(i.totalPaise)}</span>
                </li>
              ))}
            </ul>
            <dl className="space-y-1">
              <div className="flex justify-between">
                <dt>Subtotal</dt>
                <dd>{rupees(open.subtotalPaise)}</dd>
              </div>
              <div className="flex justify-between">
                <dt>Discount</dt>
                <dd>−{rupees(open.discountPaise)}</dd>
              </div>
              <div className="flex justify-between">
                <dt>GST</dt>
                <dd>{rupees(open.taxPaise)}</dd>
              </div>
              <div className="flex justify-between">
                <dt>Platform fee</dt>
                <dd>{rupees(open.feePaise)}</dd>
              </div>
              <div className="flex justify-between border-t border-line pt-1 font-bold">
                <dt>Total</dt>
                <dd>{rupees(open.totalPaise)}</dd>
              </div>
              {(open.refundedPaise ?? 0) > 0 && (
                <div className="flex justify-between text-sos">
                  <dt>Refunded</dt>
                  <dd>{rupees(open.refundedPaise)}</dd>
                </div>
              )}
            </dl>
            <div className="flex flex-wrap gap-2 pt-2">
              {['pending', 'confirmed', 'in_progress'].includes(open.status) && (
                <Button
                  variant="danger"
                  loading={act.busy}
                  onClick={() =>
                    act.run({ o: open, action: 'cancel' }).then(() => {
                      setOpen(null);
                    })
                  }
                >
                  Cancel order
                </Button>
              )}
              {['confirmed', 'in_progress'].includes(open.status) && (
                <Button
                  variant="secondary"
                  loading={act.busy}
                  onClick={() =>
                    act.run({ o: open, action: 'complete' }).then(() => {
                      setOpen(null);
                    })
                  }
                >
                  Mark completed
                </Button>
              )}
              {['confirmed', 'in_progress', 'completed', 'cancelled'].includes(open.status) && (
                <Button
                  loading={act.busy}
                  onClick={() =>
                    act.run({ o: open, action: 'refund' }).then(() => {
                      setOpen(null);
                    })
                  }
                >
                  Refund
                </Button>
              )}
            </div>
          </div>
        )}
      </Modal>
    </>
  );
}
