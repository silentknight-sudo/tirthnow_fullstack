'use client';

import { useQuery } from '@tanstack/react-query';
import { Download } from 'lucide-react';
import { useState } from 'react';
import {
  Badge,
  Button,
  Card,
  Empty,
  ErrorBox,
  PageHeader,
  Spinner,
  Stat,
  Table,
  type Tone,
} from '../../../components/ui';
import { api, errorMessage, must } from '../../../lib/api';
import { istDate, rupees, titleCase } from '../../../lib/format';
import { useEarnings } from '../../../lib/finance';
import { useVendor } from '../../../lib/session';

const payoutTone: Record<string, Tone> = {
  pending: 'orange',
  approved: 'blue',
  processing: 'blue',
  paid: 'green',
  failed: 'red',
  on_hold: 'red',
};

function lastMonths(n: number): string[] {
  const now = new Date();
  return Array.from({ length: n }, (_, i) => {
    const d = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth() - i, 1));
    return d.toISOString().slice(0, 7);
  });
}

export default function PayoutsPage() {
  const { vid, can } = useVendor();
  const allowed = can('finance.view');
  const earnings = useEarnings(vid, allowed);
  const payouts = useQuery({
    queryKey: ['payouts', vid],
    enabled: allowed,
    queryFn: async () =>
      must(
        await api.GET('/v1/vendors/{vid}/payouts', {
          params: { path: { vid }, query: { limit: 50 } },
        }),
      ),
  });
  const [month, setMonth] = useState(lastMonths(1)[0] ?? '');
  const [downloading, setDownloading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const download = async () => {
    setError(null);
    setDownloading(true);
    try {
      const res = await api.GET('/v1/vendors/{vid}/statement', {
        params: { path: { vid }, query: { month } },
        parseAs: 'blob',
      });
      const blob = res.data;
      if (!blob) throw new Error('Statement is empty');
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `tirth-now-statement-${month}.pdf`;
      a.click();
      URL.revokeObjectURL(url);
    } catch (e) {
      setError(errorMessage(e));
    } finally {
      setDownloading(false);
    }
  };

  if (!allowed) return <Card>You don't have access to finance. Ask the business owner.</Card>;
  const e = earnings.data;
  return (
    <>
      <PageHeader
        title="Payouts"
        subtitle="Money from completed bookings, after commission and GST on commission."
      />
      <div className="mb-6 grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <Stat
          label="Available for payout"
          value={e ? rupees(e.availableForPayoutPaise) : '—'}
          hint={e ? `Released ${e.settlementHoldDays} days after service` : undefined}
        />
        <Stat
          label="Waiting for service"
          value={e ? rupees(e.pendingServicePaise) : '—'}
          hint="Booked, not yet completed"
        />
        <Stat label="Being paid" value={e ? rupees(e.inFlightPayoutsPaise) : '—'} />
        <Stat label="Paid out" value={e ? rupees(e.paidOutPaise) : '—'} />
      </div>
      <Card className="mb-6">
        <h2 className="mb-3 font-bold text-navy">Monthly statement</h2>
        <div className="flex flex-wrap items-center gap-3">
          <select
            aria-label="Month"
            value={month}
            onChange={(ev) => {
              setMonth(ev.target.value);
            }}
            className="rounded-xl border border-line bg-white px-3 py-2 text-sm"
          >
            {lastMonths(12).map((m) => (
              <option key={m} value={m}>
                {new Date(`${m}-01T00:00:00Z`).toLocaleDateString('en-IN', {
                  month: 'long',
                  year: 'numeric',
                  timeZone: 'UTC',
                })}
              </option>
            ))}
          </select>
          <Button variant="secondary" loading={downloading} onClick={() => void download()}>
            <Download className="h-4 w-4" /> Download PDF
          </Button>
        </div>
        <div className="mt-3">
          <ErrorBox message={error} />
        </div>
      </Card>
      {payouts.isLoading ? (
        <Spinner />
      ) : (payouts.data?.data ?? []).length === 0 ? (
        <Empty title="No payouts yet">
          Payouts run weekly once you have completed bookings and a verified bank account.
        </Empty>
      ) : (
        <Table head={['Period', 'Amount', 'Status', 'Paid on']}>
          {(payouts.data?.data ?? []).map((p) => (
            <tr key={p.id}>
              <td className="px-4 py-3">
                {istDate(p.periodStart)} – {istDate(p.periodEnd)}
              </td>
              <td className="px-4 py-3 font-semibold">{rupees(p.amountPaise)}</td>
              <td className="px-4 py-3">
                <Badge tone={payoutTone[p.status] ?? 'gray'}>{titleCase(p.status)}</Badge>
                {p.failureReason && <p className="text-xs text-sos">{p.failureReason}</p>}
              </td>
              <td className="px-4 py-3">{istDate(p.paidAt)}</td>
            </tr>
          ))}
        </Table>
      )}
    </>
  );
}
