'use client';

import { useQuery } from '@tanstack/react-query';
import { ArrowLeft, Check, ExternalLink, X } from 'lucide-react';
import Link from 'next/link';
import { useSearchParams } from 'next/navigation';
import { Suspense } from 'react';
import { askReason, useAction } from '../../../../components/admin';
import { Badge, Button, Card, ErrorBox, PageHeader, Spinner } from '../../../../components/ui';
import { api, as, errorMessage } from '../../../../lib/api';
import { humanize, istDateTime } from '../../../../lib/format';
import { tone } from '../../../../lib/status';
import type { AdminVendor } from '../../../../lib/types';

function VendorView() {
  const id = useSearchParams().get('id') ?? '';
  const key = ['admin-vendor', id];
  const q = useQuery({
    queryKey: key,
    queryFn: async () =>
      as<AdminVendor>(await api.GET('/v1/admin/vendors/{id}', { params: { path: { id } } })),
    enabled: id !== '',
  });
  const refresh = [key, ['admin-vendors'], ['kpis']];
  const review = useAction(
    async ({ docId, decision }: { docId: string; decision: 'approved' | 'rejected' }) => {
      const note =
        decision === 'rejected'
          ? askReason('Why is this document rejected? (shown to the partner)')
          : null;
      if (decision === 'rejected' && note === null) return;
      await api.POST('/v1/admin/vendors/{id}/kyc-documents/{docId}/review', {
        params: { path: { id, docId } },
        body: { decision, ...(note ? { note } : {}) },
      });
    },
    refresh,
  );
  const act = useAction(async (action: 'approve' | 'reject' | 'suspend' | 'reinstate') => {
    if (action === 'approve')
      return api.POST('/v1/admin/vendors/{id}/approve', { params: { path: { id } } });
    if (action === 'reinstate')
      return api.POST('/v1/admin/vendors/{id}/reinstate', { params: { path: { id } } });
    const reason = askReason(
      action === 'reject' ? 'Why is this partner rejected?' : 'Why is this partner suspended?',
    );
    if (!reason) return undefined;
    return action === 'reject'
      ? api.POST('/v1/admin/vendors/{id}/reject', { params: { path: { id } }, body: { reason } })
      : api.POST('/v1/admin/vendors/{id}/suspend', { params: { path: { id } }, body: { reason } });
  }, refresh);

  if (q.isPending) return <Spinner />;
  if (q.isError) return <ErrorBox message={errorMessage(q.error)} />;
  const v = q.data;
  return (
    <>
      <Link
        href="/vendors/"
        className="mb-4 inline-flex items-center gap-1 text-sm font-semibold text-navy"
      >
        <ArrowLeft className="h-4 w-4" /> Partners
      </Link>
      <PageHeader
        title={v.displayName}
        subtitle={`${humanize(v.type)} · ${v.legalName}`}
        actions={
          <>
            {(v.status === 'kyc_pending' ||
              v.status === 'kyc_rejected' ||
              v.status === 'draft') && (
              <>
                <Button variant="danger" loading={act.busy} onClick={() => act.run('reject')}>
                  Reject
                </Button>
                <Button loading={act.busy} onClick={() => act.run('approve')}>
                  Approve & list
                </Button>
              </>
            )}
            {v.status === 'active' && (
              <Button variant="danger" loading={act.busy} onClick={() => act.run('suspend')}>
                Suspend
              </Button>
            )}
            {v.status === 'suspended' && (
              <Button loading={act.busy} onClick={() => act.run('reinstate')}>
                Reinstate
              </Button>
            )}
          </>
        }
      />
      <ErrorBox message={act.error ?? review.error} />
      <div className="grid gap-4 lg:grid-cols-3">
        <Card>
          <h2 className="mb-3 font-bold text-navy">Business</h2>
          <dl className="space-y-2 text-sm">
            <div className="flex justify-between">
              <dt className="text-muted">Status</dt>
              <dd>
                <Badge tone={tone(v.status)}>{humanize(v.status)}</Badge>
              </dd>
            </div>
            <div className="flex justify-between">
              <dt className="text-muted">PAN</dt>
              <dd className="font-mono">{v.pan ?? '—'}</dd>
            </div>
            <div className="flex justify-between">
              <dt className="text-muted">GSTIN</dt>
              <dd className="font-mono">{v.gstin ?? '—'}</dd>
            </div>
            <div className="flex justify-between">
              <dt className="text-muted">Approved</dt>
              <dd>{istDateTime(v.approvedAt)}</dd>
            </div>
          </dl>
          {v.missingDocuments.length > 0 && (
            <p className="mt-4 rounded-xl bg-orange-50 p-3 text-xs text-orange-800">
              Still missing: {v.missingDocuments.map(humanize).join(', ')}
            </p>
          )}
        </Card>
        <Card className="lg:col-span-2">
          <h2 className="mb-3 font-bold text-navy">KYC documents</h2>
          {v.kycDocuments.length === 0 && (
            <p className="text-sm text-muted">No documents uploaded yet.</p>
          )}
          <ul className="divide-y divide-line">
            {v.kycDocuments.map((d) => (
              <li key={d.id} className="flex flex-wrap items-center gap-3 py-3">
                <div className="min-w-40 flex-1">
                  <p className="font-semibold">{humanize(d.docType)}</p>
                  {d.reviewerNote && <p className="text-xs text-sos">{d.reviewerNote}</p>}
                </div>
                <Badge tone={tone(d.status)}>{humanize(d.status)}</Badge>
                {d.url && (
                  <a
                    href={d.url}
                    target="_blank"
                    rel="noreferrer"
                    className="inline-flex items-center gap-1 text-sm font-semibold text-navy hover:underline"
                  >
                    View <ExternalLink className="h-3.5 w-3.5" />
                  </a>
                )}
                <Button
                  variant="secondary"
                  loading={review.busy}
                  onClick={() => review.run({ docId: d.id, decision: 'approved' })}
                >
                  <Check className="h-4 w-4" /> OK
                </Button>
                <Button
                  variant="ghost"
                  loading={review.busy}
                  onClick={() => review.run({ docId: d.id, decision: 'rejected' })}
                >
                  <X className="h-4 w-4" /> Reject
                </Button>
              </li>
            ))}
          </ul>
        </Card>
      </div>
    </>
  );
}

export default function Page() {
  return (
    <Suspense fallback={<Spinner />}>
      <VendorView />
    </Suspense>
  );
}
