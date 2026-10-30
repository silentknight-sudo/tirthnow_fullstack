'use client';

import { CheckCircle2, Circle } from 'lucide-react';
import Link from 'next/link';
import { OrderActions } from '../../../components/order-actions';
import { Badge, Button, Card, Empty, PageHeader, Spinner, Stat } from '../../../components/ui';
import { rupees, istDateTime, titleCase } from '../../../lib/format';
import { useBankAccounts, useEarnings } from '../../../lib/finance';
import { availableActions, guestLabel, useVendorOrders } from '../../../lib/orders';
import { useVendor } from '../../../lib/session';
import { vendorStatusLabel, vendorTone } from '../../../lib/status';

function Step({ done, children, href }: { done: boolean; children: string; href: string }) {
  const Icon = done ? CheckCircle2 : Circle;
  return (
    <li>
      <Link href={href} className="flex items-center gap-3 rounded-xl px-2 py-2 hover:bg-paper">
        <Icon className={`h-5 w-5 ${done ? 'text-ok' : 'text-muted'}`} aria-hidden />
        <span className={done ? 'text-muted line-through' : 'font-medium'}>{children}</span>
      </Link>
    </li>
  );
}

export default function DashboardPage() {
  const { vendor, vid, can } = useVendor();
  const showMoney = can('finance.view');
  const earnings = useEarnings(vid, showMoney);
  const bank = useBankAccounts(vid);
  const orders = useVendorOrders(vid, 'confirmed');
  const needsAction = (orders.data?.data ?? []).filter((o) =>
    availableActions(o).includes('accept'),
  );
  const upcoming = (orders.data?.data ?? [])
    .filter((o) => !availableActions(o).includes('accept'))
    .slice(0, 5);
  const onboarding = vendor.status === 'draft' || vendor.status === 'kyc_rejected';

  return (
    <>
      <PageHeader
        title={`Namaste, ${vendor.displayName}`}
        subtitle="Here is what needs your attention today."
        actions={
          <Badge tone={vendorTone[vendor.status] ?? 'gray'}>
            {vendorStatusLabel[vendor.status]}
          </Badge>
        }
      />

      {onboarding && (
        <Card className="mb-6 border-saffron/40 bg-[#FFF7EE]">
          <h2 className="text-lg font-bold text-navy">Finish setting up to go live</h2>
          <p className="mb-3 text-sm text-muted">
            Our team reviews your documents within 2 working days.
          </p>
          <ol className="space-y-1 text-sm">
            <Step done={Boolean(vendor.pan)} href="/settings/">
              Add your PAN number
            </Step>
            <Step done={vendor.missingDocuments.length === 0} href="/settings/#kyc">
              {vendor.missingDocuments.length === 0
                ? 'Upload KYC documents'
                : `Upload KYC documents (${vendor.missingDocuments.map(titleCase).join(', ')})`}
            </Step>
            <Step done={(bank.data ?? []).length > 0} href="/settings/#bank">
              Add a bank account for payouts
            </Step>
            <Step done={false} href="/listings/">
              Create your first listing
            </Step>
          </ol>
          <Link href="/settings/#submit">
            <Button className="mt-4" variant="accent">
              Review and submit
            </Button>
          </Link>
        </Card>
      )}
      {vendor.status === 'kyc_pending' && (
        <Card className="mb-6 bg-[#EFF3FA]">
          <p className="font-semibold text-navy">Your documents are under review.</p>
          <p className="text-sm text-muted">
            You can keep adding listings meanwhile; they go live after approval.
          </p>
        </Card>
      )}

      <div className="mb-6 grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <Stat
          label="Waiting for you"
          value={String(needsAction.length)}
          hint="Bookings to accept"
        />
        <Stat label="Upcoming" value={String(upcoming.length)} hint="Accepted, not started" />
        {showMoney && (
          <>
            <Stat
              label="Available for payout"
              value={earnings.data ? rupees(earnings.data.availableForPayoutPaise) : '—'}
              hint={
                earnings.data ? `After a ${earnings.data.settlementHoldDays}-day hold` : undefined
              }
            />
            <Stat
              label="Paid out so far"
              value={earnings.data ? rupees(earnings.data.paidOutPaise) : '—'}
            />
          </>
        )}
      </div>

      <Card>
        <div className="mb-3 flex items-center justify-between">
          <h2 className="text-lg font-bold text-navy">Bookings to accept</h2>
          <Link href="/orders/" className="text-sm font-semibold text-navy hover:underline">
            View all
          </Link>
        </div>
        {orders.isLoading ? (
          <Spinner />
        ) : needsAction.length === 0 ? (
          <Empty title="You're all caught up">New bookings will show up here.</Empty>
        ) : (
          <ul className="divide-y divide-line">
            {needsAction.map((o) => (
              <li key={o.id} className="flex flex-wrap items-center justify-between gap-3 py-3">
                <div>
                  <Link
                    href={`/orders/view/?id=${o.id}`}
                    className="font-semibold text-navy hover:underline"
                  >
                    {o.code}
                  </Link>{' '}
                  <span className="text-sm text-muted">
                    · {titleCase(o.type)} · {guestLabel(o)} · {istDateTime(o.serviceStartsAt)} ·{' '}
                    {rupees(o.totalPaise)}
                  </span>
                </div>
                <OrderActions order={o} vid={vid} disabled={!can('orders.manage')} />
              </li>
            ))}
          </ul>
        )}
      </Card>
    </>
  );
}
