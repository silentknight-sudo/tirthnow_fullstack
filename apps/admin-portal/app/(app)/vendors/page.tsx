'use client';

import { useQuery } from '@tanstack/react-query';
import Link from 'next/link';
import { useState } from 'react';
import { Tabs } from '../../../components/admin';
import { Badge, Empty, ErrorBox, PageHeader, Spinner, Table } from '../../../components/ui';
import { api, as, errorMessage } from '../../../lib/api';
import { humanize } from '../../../lib/format';
import { tone } from '../../../lib/status';
import type { AdminVendor, Page } from '../../../lib/types';

const FILTERS = [
  ['kyc_pending', 'Waiting for review'],
  ['active', 'Live'],
  ['draft', 'Incomplete'],
  ['kyc_rejected', 'Rejected'],
  ['suspended', 'Suspended'],
  ['all', 'All'],
] as const;
type Filter = (typeof FILTERS)[number][0];

export default function Vendors() {
  const [status, setStatus] = useState<Filter>('kyc_pending');
  const q = useQuery({
    queryKey: ['admin-vendors', status],
    queryFn: async () =>
      as<Page<AdminVendor>>(
        await api.GET('/v1/admin/vendors', {
          params: { query: { limit: 50, ...(status === 'all' ? {} : { status }) } },
        }),
      ),
  });
  return (
    <>
      <PageHeader
        title="Partners & KYC"
        subtitle="Review documents, then approve partners so pilgrims can book them."
      />
      <Tabs value={status} options={FILTERS} onChange={setStatus} />
      {q.isPending ? (
        <Spinner />
      ) : q.isError ? (
        <ErrorBox message={errorMessage(q.error)} />
      ) : q.data.data.length === 0 ? (
        <Empty title="No partners here" />
      ) : (
        <Table head={['Partner', 'Service', 'PAN / GSTIN', 'Documents', 'Status', '']}>
          {q.data.data.map((v) => (
            <tr key={v.id} className="hover:bg-paper/60">
              <td className="px-4 py-3">
                <p className="font-semibold text-ink">{v.displayName}</p>
                <p className="text-xs text-muted">{v.legalName}</p>
              </td>
              <td className="px-4 py-3">{humanize(v.type)}</td>
              <td className="px-4 py-3 font-mono text-xs">
                {v.pan ?? '—'}
                <br />
                {v.gstin ?? ''}
              </td>
              <td className="px-4 py-3 text-xs">
                {v.kycDocuments.length} uploaded
                {v.missingDocuments.length > 0 && (
                  <span className="block text-sos">
                    missing: {v.missingDocuments.map(humanize).join(', ')}
                  </span>
                )}
              </td>
              <td className="px-4 py-3">
                <Badge tone={tone(v.status)}>{humanize(v.status)}</Badge>
              </td>
              <td className="px-4 py-3 text-right">
                <Link
                  href={`/vendors/view/?id=${v.id}`}
                  className="font-semibold text-saffron hover:underline"
                >
                  Review →
                </Link>
              </td>
            </tr>
          ))}
        </Table>
      )}
    </>
  );
}
