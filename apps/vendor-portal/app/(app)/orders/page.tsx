'use client';

import Link from 'next/link';
import { useState } from 'react';
import { OrderActions } from '../../../components/order-actions';
import { Badge, Empty, ErrorBox, PageHeader, Select, Spinner, Table } from '../../../components/ui';
import { errorMessage } from '../../../lib/api';
import { istDateTime, rupees, titleCase } from '../../../lib/format';
import { type OrderStatus, type OrderType, guestLabel, useVendorOrders } from '../../../lib/orders';
import { useVendor } from '../../../lib/session';
import { orderTone } from '../../../lib/status';

const STATUSES: OrderStatus[] = ['confirmed', 'in_progress', 'completed', 'cancelled', 'refunded'];
const TYPES: OrderType[] = ['hotel', 'cab', 'food', 'experience'];

export default function OrdersPage() {
  const { vid, can } = useVendor();
  const [status, setStatus] = useState<OrderStatus | ''>('');
  const [type, setType] = useState<OrderType | ''>('');
  const orders = useVendorOrders(vid, status || undefined, type || undefined);
  const list = orders.data?.data ?? [];

  return (
    <>
      <PageHeader
        title="Bookings"
        subtitle="Accept new bookings quickly — guests see your response time."
        actions={
          <>
            <Select
              aria-label="Status"
              value={status}
              onChange={(e) => {
                setStatus(e.target.value as OrderStatus | '');
              }}
            >
              <option value="">All statuses</option>
              {STATUSES.map((s) => (
                <option key={s} value={s}>
                  {titleCase(s)}
                </option>
              ))}
            </Select>
            <Select
              aria-label="Type"
              value={type}
              onChange={(e) => {
                setType(e.target.value as OrderType | '');
              }}
            >
              <option value="">All types</option>
              {TYPES.map((t) => (
                <option key={t} value={t}>
                  {titleCase(t)}
                </option>
              ))}
            </Select>
          </>
        }
      />
      {orders.isLoading ? (
        <Spinner />
      ) : orders.error ? (
        <ErrorBox message={errorMessage(orders.error)} />
      ) : list.length === 0 ? (
        <Empty title="No bookings yet">New bookings appear here as soon as the guest pays.</Empty>
      ) : (
        <Table head={['Booking', 'Guest', 'When', 'Amount', 'Status', '']}>
          {list.map((o) => (
            <tr key={o.id} className="align-middle">
              <td className="px-4 py-3">
                <Link
                  href={`/orders/view/?id=${o.id}`}
                  className="font-semibold text-navy hover:underline"
                >
                  {o.code}
                </Link>
                <p className="text-xs text-muted">{titleCase(o.type)}</p>
              </td>
              <td className="px-4 py-3">{guestLabel(o)}</td>
              <td className="px-4 py-3">{istDateTime(o.serviceStartsAt)}</td>
              <td className="px-4 py-3 font-semibold">{rupees(o.totalPaise)}</td>
              <td className="px-4 py-3">
                <Badge tone={orderTone[o.status] ?? 'gray'}>
                  {titleCase(o.subStatus || o.status)}
                </Badge>
              </td>
              <td className="px-4 py-3">
                <OrderActions order={o} vid={vid} disabled={!can('orders.manage')} />
              </td>
            </tr>
          ))}
        </Table>
      )}
    </>
  );
}
