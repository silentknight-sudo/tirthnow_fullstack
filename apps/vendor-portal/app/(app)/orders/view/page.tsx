'use client';

import { ArrowLeft } from 'lucide-react';
import Link from 'next/link';
import { useSearchParams } from 'next/navigation';
import { Suspense } from 'react';
import { OrderActions } from '../../../../components/order-actions';
import { Badge, Card, ErrorBox, PageHeader, Spinner } from '../../../../components/ui';
import { errorMessage } from '../../../../lib/api';
import { istDate, istDateTime, rupees, titleCase } from '../../../../lib/format';
import { guestLabel, itemLabel, useVendorOrder } from '../../../../lib/orders';
import { useVendor } from '../../../../lib/session';
import { orderTone } from '../../../../lib/status';

function Row({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex justify-between py-1.5 text-sm">
      <span className="text-muted">{label}</span>
      <span className="font-medium">{value}</span>
    </div>
  );
}

function OrderView() {
  const id = useSearchParams().get('id');
  const { vid, can } = useVendor();
  const order = useVendorOrder(vid, id);
  if (order.isLoading) return <Spinner />;
  if (order.error || !order.data)
    return <ErrorBox message={errorMessage(order.error) || 'Booking not found'} />;
  const o = order.data;
  return (
    <>
      <Link
        href="/orders/"
        className="mb-4 inline-flex items-center gap-1 text-sm text-navy hover:underline"
      >
        <ArrowLeft className="h-4 w-4" /> All bookings
      </Link>
      <PageHeader
        title={`Booking ${o.code}`}
        subtitle={`${titleCase(o.type)} · ${guestLabel(o)} · booked ${istDateTime(o.createdAt)}`}
        actions={
          <Badge tone={orderTone[o.status] ?? 'gray'}>{titleCase(o.subStatus || o.status)}</Badge>
        }
      />
      <div className="grid gap-5 lg:grid-cols-3">
        <div className="space-y-5 lg:col-span-2">
          <Card>
            <h2 className="mb-3 font-bold text-navy">Items</h2>
            <ul className="divide-y divide-line text-sm">
              {o.items.map((it, i) => {
                const name = itemLabel(it.snapshot, titleCase(it.itemType));
                return (
                  <li key={i} className="flex justify-between py-2">
                    <span>
                      {name} × {it.quantity}
                      {it.stayDate && <span className="text-muted"> · {istDate(it.stayDate)}</span>}
                    </span>
                    <span className="font-medium">{rupees(it.totalPaise)}</span>
                  </li>
                );
              })}
            </ul>
          </Card>
          {o.history && o.history.length > 0 && (
            <Card>
              <h2 className="mb-3 font-bold text-navy">History</h2>
              <ol className="space-y-2 text-sm">
                {o.history.map((h, i) => (
                  <li key={i} className="flex justify-between gap-3">
                    <span>
                      {titleCase(h.to)}
                      {h.reason && <span className="text-muted"> — {h.reason}</span>}
                    </span>
                    <span className="shrink-0 text-muted">{istDateTime(h.at)}</span>
                  </li>
                ))}
              </ol>
            </Card>
          )}
        </div>
        <div className="space-y-5">
          <Card>
            <h2 className="mb-2 font-bold text-navy">Service</h2>
            <Row label="Starts" value={istDateTime(o.serviceStartsAt)} />
            <Row label="Ends" value={istDateTime(o.serviceEndsAt)} />
          </Card>
          <Card>
            <h2 className="mb-2 font-bold text-navy">Amount</h2>
            <Row label="Subtotal" value={rupees(o.subtotalPaise)} />
            {o.discountPaise > 0 && <Row label="Discount" value={`− ${rupees(o.discountPaise)}`} />}
            <Row label="Taxes" value={rupees(o.taxPaise)} />
            <Row label="Fees" value={rupees(o.feePaise)} />
            <div className="mt-2 border-t border-line pt-2">
              <Row label="Guest paid" value={rupees(o.totalPaise)} />
              {(o.refundedPaise ?? 0) > 0 && (
                <Row label="Refunded" value={rupees(o.refundedPaise)} />
              )}
            </div>
          </Card>
          <OrderActions order={o} vid={vid} disabled={!can('orders.manage')} />
        </div>
      </div>
    </>
  );
}

export default function OrderViewPage() {
  return (
    <Suspense fallback={<Spinner />}>
      <OrderView />
    </Suspense>
  );
}
