'use client';

import { useQuery } from '@tanstack/react-query';
import Link from 'next/link';
import { useState } from 'react';
import { ErrorBox, Input, PageHeader, Spinner, Table } from '../../../components/ui';
import { api, as, errorMessage } from '../../../lib/api';
import type { TempleRow } from '../../../lib/types';

export default function Temples() {
  const [search, setSearch] = useState('');
  const q = useQuery({
    queryKey: ['temples'],
    queryFn: async () => as<TempleRow[]>(await api.GET('/v1/temples')),
  });
  const list = (q.data ?? []).filter((t) => t.name.toLowerCase().includes(search.toLowerCase()));
  return (
    <>
      <PageHeader
        title="Temples & aarti"
        subtitle="Aarti times shown in the app and used by the AI guide come only from here."
        actions={
          <Input
            placeholder="Search temples"
            value={search}
            onChange={(e) => {
              setSearch(e.target.value);
            }}
            className="w-56"
          />
        }
      />
      {q.isPending ? (
        <Spinner />
      ) : q.isError ? (
        <ErrorBox message={errorMessage(q.error)} />
      ) : (
        <Table head={['Temple', 'Tags', 'Crowd', '']}>
          {list.map((t) => (
            <tr key={t.id} className="hover:bg-paper/60">
              <td className="px-4 py-3 font-semibold">{t.name}</td>
              <td className="px-4 py-3 text-xs text-muted">{t.tags.join(', ')}</td>
              <td className="px-4 py-3">
                {'●'.repeat(t.crowdLevel)}
                <span className="text-line">{'●'.repeat(5 - t.crowdLevel)}</span>
              </td>
              <td className="px-4 py-3 text-right">
                <Link
                  href={`/temples/view/?id=${t.id}&name=${encodeURIComponent(t.name)}`}
                  className="font-semibold text-saffron hover:underline"
                >
                  Aarti times →
                </Link>
              </td>
            </tr>
          ))}
        </Table>
      )}
    </>
  );
}
