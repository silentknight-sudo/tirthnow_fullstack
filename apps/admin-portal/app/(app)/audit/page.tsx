'use client';

import { useQuery } from '@tanstack/react-query';
import { Empty, ErrorBox, PageHeader, Spinner, Table } from '../../../components/ui';
import { api, as, errorMessage } from '../../../lib/api';
import { humanize, istDateTime } from '../../../lib/format';
import type { AuditRow, Page } from '../../../lib/types';

export default function Audit() {
  const q = useQuery({
    queryKey: ['audit'],
    queryFn: async () =>
      as<Page<AuditRow>>(
        await api.GET('/v1/admin/audit-logs', { params: { query: { limit: 50 } as never } }),
      ),
  });
  return (
    <>
      <PageHeader title="Audit log" subtitle="Who changed what, newest first." />
      {q.isPending ? (
        <Spinner />
      ) : q.isError ? (
        <ErrorBox message={errorMessage(q.error)} />
      ) : q.data.data.length === 0 ? (
        <Empty title="No activity yet" />
      ) : (
        <Table head={['When', 'Action', 'Entity', 'By']}>
          {q.data.data.map((a) => (
            <tr key={a.id}>
              <td className="px-4 py-3 text-xs text-muted">{istDateTime(a.createdAt)}</td>
              <td className="px-4 py-3 font-mono text-xs font-semibold">{a.action}</td>
              <td className="px-4 py-3 text-xs">
                {humanize(a.entityType)}{' '}
                <span className="font-mono text-muted">{a.entityId?.slice(0, 8) ?? ''}</span>
              </td>
              <td className="px-4 py-3 text-xs">
                {a.actorRole ? humanize(a.actorRole) : 'system'}{' '}
                <span className="font-mono text-muted">{a.actorId?.slice(0, 8) ?? ''}</span>
              </td>
            </tr>
          ))}
        </Table>
      )}
    </>
  );
}
