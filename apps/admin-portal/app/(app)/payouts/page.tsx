'use client';

import { useQuery } from '@tanstack/react-query';
import { PlayCircle } from 'lucide-react';
import { useState } from 'react';
import { Tabs, askReason, useAction } from '../../../components/admin';
import { Badge, Button, Empty, ErrorBox, PageHeader, Spinner, Table } from '../../../components/ui';
import { api, as, errorMessage, idem } from '../../../lib/api';
import type { Schemas } from '@tirth-now/api-client';
import type { Page } from '../../../lib/types';
import { humanize, istDate, istDateTime, rupees } from '../../../lib/format';
import { tone } from '../../../lib/status';

const FILTERS = [
  ['pending_approval', 'To approve'],
  ['approved', 'Approved'],
  ['processing', 'Processing'],
  ['paid', 'Paid'],
  ['failed', 'Failed'],
  ['on_hold', 'On hold'],
] as const;
type Filter = (typeof FILTERS)[number][0];

export default function Payouts() {
  const [status, setStatus] = useState<Filter>('pending_approval');
  const q = useQuery({
    queryKey: ['admin-payouts', status],
    queryFn: async () =>
      as<Page<Schemas['PayoutResponse']>>(
        await api.GET('/v1/admin/payouts', { params: { query: { limit: 50, status } } }),
      ),
  });
  const refresh = [['admin-payouts']];
  const act = useAction(async ({ id, action }: { id: string; action: 'approve' | 'hold' }) => {
    if (action === 'approve')
      return api.POST('/v1/admin/payouts/{id}/approve', {
        params: { path: { id }, header: idem() },
      });
    const reason = askReason('Why is this payout on hold?');
    if (!reason) return undefined;
    return api.POST('/v1/admin/payouts/{id}/hold', { params: { path: { id } }, body: { reason } });
  }, refresh);
  const run = useAction(async () => api.POST('/v1/admin/payouts/run'), refresh);

  return (
    <>
      <PageHeader
        title="Partner payouts"
        subtitle="Each partner's earnings for a period. Approve to send the money to their bank."
        actions={
          <Button variant="accent" loading={run.busy} onClick={() => run.run(undefined)}>
            <PlayCircle className="h-4 w-4" /> Create this week's payouts
          </Button>
        }
      />
      <Tabs value={status} options={FILTERS} onChange={setStatus} />
      <ErrorBox message={act.error ?? run.error} />
      {q.isPending ? (
        <Spinner />
      ) : q.isError ? (
        <ErrorBox message={errorMessage(q.error)} />
      ) : q.data.data.length === 0 ? (
        <Empty title="Nothing here" />
      ) : (
        <Table head={['Partner', 'Period', 'Amount', 'Status', 'Created', '']}>
          {q.data.data.map((p) => (
            <tr key={p.id}>
              <td className="px-4 py-3 font-mono text-xs">{p.vendorId.slice(0, 8)}</td>
              <td className="px-4 py-3 text-xs">
                {istDate(p.periodStart)} – {istDate(p.periodEnd)}
              </td>
              <td className="px-4 py-3 font-semibold">{rupees(p.amountPaise)}</td>
              <td className="px-4 py-3">
                <Badge tone={tone(p.status)}>{humanize(p.status)}</Badge>
                {p.failureReason && <p className="text-xs text-sos">{p.failureReason}</p>}
              </td>
              <td className="px-4 py-3 text-xs text-muted">{istDateTime(p.createdAt)}</td>
              <td className="px-4 py-3 text-right">
                {p.status === 'pending_approval' && (
                  <div className="flex justify-end gap-2">
                    <Button
                      variant="ghost"
                      loading={act.busy}
                      onClick={() => act.run({ id: p.id, action: 'hold' })}
                    >
                      Hold
                    </Button>
                    <Button
                      loading={act.busy}
                      onClick={() => act.run({ id: p.id, action: 'approve' })}
                    >
                      Approve
                    </Button>
                  </div>
                )}
              </td>
            </tr>
          ))}
        </Table>
      )}
    </>
  );
}
