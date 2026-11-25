'use client';

import { useQuery } from '@tanstack/react-query';
import { AlertTriangle, ArrowRight, IndianRupee, ShieldCheck, Siren, Users } from 'lucide-react';
import Link from 'next/link';
import type { ReactNode } from 'react';
import { Card, ErrorBox, PageHeader, Spinner } from '../../../components/ui';
import { api, as, errorMessage } from '../../../lib/api';
import { humanize, rupees } from '../../../lib/format';
import type { Kpis } from '../../../lib/types';

function Tile({
  icon,
  label,
  value,
  sub,
  href,
}: {
  icon: ReactNode;
  label: string;
  value: string;
  sub?: string;
  href?: string;
}) {
  const body = (
    <Card className="h-full p-4 transition hover:-translate-y-0.5 hover:shadow-lg">
      <div className="flex items-center gap-2 text-xs font-semibold uppercase tracking-wide text-muted">
        {icon}
        {label}
      </div>
      <p className="mt-2 text-3xl font-extrabold text-navy">{value}</p>
      {sub && <p className="mt-1 text-xs text-muted">{sub}</p>}
    </Card>
  );
  return href ? <Link href={href}>{body}</Link> : body;
}

export default function Dashboard() {
  const q = useQuery({
    queryKey: ['kpis'],
    queryFn: async () => as<Kpis>(await api.GET('/v1/admin/kpis')),
  });
  if (q.isPending) return <Spinner />;
  if (q.isError) return <ErrorBox message={errorMessage(q.error)} />;
  const k = q.data;
  const pending = k.vendors.byStatus.kyc_pending ?? 0;
  const activeSos = (k.sos.byStatus.triggered ?? 0) + (k.sos.byStatus.dispatched ?? 0);
  return (
    <>
      <PageHeader title="Dashboard" subtitle={`Last 30 days · ${k.range.from} to ${k.range.to}`} />
      {(activeSos > 0 || pending > 0 || k.reels.openReports > 0) && (
        <div className="mb-6 grid gap-3 sm:grid-cols-3">
          {activeSos > 0 && (
            <Link
              href="/sos/"
              className="flex items-center gap-3 rounded-2xl bg-sos p-4 text-white shadow-card"
            >
              <Siren className="h-6 w-6" />
              <span className="font-bold">{activeSos} active SOS alert(s)</span>
              <ArrowRight className="ml-auto h-4 w-4" />
            </Link>
          )}
          {pending > 0 && (
            <Link
              href="/vendors/"
              className="flex items-center gap-3 rounded-2xl bg-saffron p-4 text-white shadow-card"
            >
              <ShieldCheck className="h-6 w-6" />
              <span className="font-bold">{pending} partner(s) waiting for KYC review</span>
              <ArrowRight className="ml-auto h-4 w-4" />
            </Link>
          )}
          {k.reels.openReports > 0 && (
            <Link
              href="/moderation/"
              className="flex items-center gap-3 rounded-2xl bg-navy p-4 text-white shadow-card"
            >
              <AlertTriangle className="h-6 w-6" />
              <span className="font-bold">{k.reels.openReports} open report(s)</span>
              <ArrowRight className="ml-auto h-4 w-4" />
            </Link>
          )}
        </div>
      )}
      <div className="grid grid-cols-2 gap-4 lg:grid-cols-4">
        <Tile
          icon={<IndianRupee className="h-4 w-4" />}
          label="GMV"
          value={rupees(k.orders.gmvPaise)}
          sub={`${k.orders.paid} paid orders`}
          href="/orders/"
        />
        <Tile
          icon={<IndianRupee className="h-4 w-4" />}
          label="Platform revenue"
          value={rupees(k.finance.revenuePaise)}
          sub={`Refunds ${rupees(k.finance.refundsPaise)}`}
        />
        <Tile
          icon={<Users className="h-4 w-4" />}
          label="Users"
          value={String(k.users.total)}
          sub={`${k.users.newUsers} new · ${k.users.activeUsers} active`}
          href="/users/"
        />
        <Tile
          icon={<ShieldCheck className="h-4 w-4" />}
          label="Live partners"
          value={String(k.vendors.byStatus.active ?? 0)}
          sub={`${pending} awaiting review`}
          href="/vendors/"
        />
      </div>
      <div className="mt-6 grid gap-4 lg:grid-cols-3">
        <Card>
          <h2 className="mb-3 font-bold text-navy">Orders by service</h2>
          {Object.keys(k.orders.byType).length === 0 && (
            <p className="text-sm text-muted">No orders yet.</p>
          )}
          <ul className="space-y-2 text-sm">
            {Object.entries(k.orders.byType).map(([t, v]) => (
              <li key={t} className="flex justify-between">
                <span>{humanize(t)}</span>
                <span className="font-semibold">
                  {v.orders} · {rupees(v.gmvPaise)}
                </span>
              </li>
            ))}
            <li className="flex justify-between border-t border-line pt-2 text-muted">
              <span>Cancelled</span>
              <span>{k.orders.cancelled}</span>
            </li>
          </ul>
        </Card>
        <Card>
          <h2 className="mb-3 font-bold text-navy">Partners by status</h2>
          <ul className="space-y-2 text-sm">
            {Object.entries(k.vendors.byStatus).map(([s, n]) => (
              <li key={s} className="flex justify-between">
                <span>{humanize(s)}</span>
                <span className="font-semibold">{n}</span>
              </li>
            ))}
          </ul>
        </Card>
        <Card>
          <h2 className="mb-3 font-bold text-navy">Reels & AI</h2>
          <ul className="space-y-2 text-sm">
            <li className="flex justify-between">
              <span>Reels</span>
              <span className="font-semibold">{k.reels.reels}</span>
            </li>
            <li className="flex justify-between">
              <span>Open reports</span>
              <span className="font-semibold">{k.reels.openReports}</span>
            </li>
            <li className="flex justify-between">
              <span>AI guide requests</span>
              <span className="font-semibold">{k.ai.requests}</span>
            </li>
            <li className="flex justify-between">
              <span>AI users</span>
              <span className="font-semibold">{k.ai.users}</span>
            </li>
          </ul>
        </Card>
      </div>
    </>
  );
}
