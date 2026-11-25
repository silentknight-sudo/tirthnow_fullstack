'use client';

import { useQuery } from '@tanstack/react-query';
import { useState } from 'react';
import { askReason, useAction } from '../../../components/admin';
import {
  Badge,
  Button,
  Empty,
  ErrorBox,
  Input,
  PageHeader,
  Spinner,
  Table,
} from '../../../components/ui';
import { api, as, errorMessage } from '../../../lib/api';
import { humanize, istDateTime } from '../../../lib/format';
import { tone } from '../../../lib/status';
import type { AdminUser, Page } from '../../../lib/types';

export default function Users() {
  const [search, setSearch] = useState('');
  const term = search.trim();
  const q = useQuery({
    queryKey: ['admin-users', term],
    queryFn: async () =>
      as<Page<AdminUser>>(
        await api.GET('/v1/admin/users', {
          params: { query: { limit: 50, ...(term.length >= 2 ? { q: term } : {}) } as never },
        }),
      ),
  });
  const act = useAction(
    async ({ u, status }: { u: AdminUser; status: 'active' | 'suspended' }) => {
      const reason = askReason(
        status === 'suspended'
          ? `Why suspend ${u.displayName ?? u.phoneE164 ?? 'this user'}?`
          : 'Reason for reactivating',
      );
      if (!reason) return undefined;
      return api.PATCH('/v1/admin/users/{id}/status', {
        params: { path: { id: u.id } },
        body: { status, reason },
      });
    },
    [['admin-users']],
  );
  return (
    <>
      <PageHeader
        title="Users"
        subtitle="Pilgrims, partners and staff."
        actions={
          <Input
            placeholder="Search name, phone or email"
            value={search}
            onChange={(e) => {
              setSearch(e.target.value);
            }}
            className="w-64"
          />
        }
      />
      <ErrorBox message={act.error} />
      {q.isPending ? (
        <Spinner />
      ) : q.isError ? (
        <ErrorBox message={errorMessage(q.error)} />
      ) : q.data.data.length === 0 ? (
        <Empty title="No users found" />
      ) : (
        <Table head={['User', 'Contact', 'Roles', 'Status', 'Last login', '']}>
          {q.data.data.map((u) => (
            <tr key={u.id}>
              <td className="px-4 py-3 font-semibold">
                {u.displayName ?? (u.isGuest ? 'Guest' : '—')}
                {u.isGuest && <Badge>guest</Badge>}
              </td>
              <td className="px-4 py-3 text-xs">
                {u.phoneE164 ?? ''}
                <br />
                {u.email ?? ''}
              </td>
              <td className="px-4 py-3 text-xs">{u.roles.map(humanize).join(', ')}</td>
              <td className="px-4 py-3">
                <Badge tone={tone(u.status)}>{humanize(u.status)}</Badge>
              </td>
              <td className="px-4 py-3 text-xs text-muted">{istDateTime(u.lastLoginAt)}</td>
              <td className="px-4 py-3 text-right">
                {u.status === 'active' ? (
                  <Button
                    variant="ghost"
                    loading={act.busy}
                    onClick={() => act.run({ u, status: 'suspended' })}
                  >
                    Suspend
                  </Button>
                ) : u.status === 'suspended' ? (
                  <Button
                    variant="secondary"
                    loading={act.busy}
                    onClick={() => act.run({ u, status: 'active' })}
                  >
                    Reactivate
                  </Button>
                ) : null}
              </td>
            </tr>
          ))}
        </Table>
      )}
    </>
  );
}
