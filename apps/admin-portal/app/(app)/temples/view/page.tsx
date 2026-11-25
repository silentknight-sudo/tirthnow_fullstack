'use client';

import { useQuery } from '@tanstack/react-query';
import { ArrowLeft, Plus, Trash2 } from 'lucide-react';
import Link from 'next/link';
import { useSearchParams } from 'next/navigation';
import { Suspense, useState } from 'react';
import { useAction } from '../../../../components/admin';
import {
  Button,
  Card,
  ErrorBox,
  Field,
  Input,
  PageHeader,
  Select,
  Spinner,
  Table,
} from '../../../../components/ui';
import { api, as, errorMessage } from '../../../../lib/api';
import { humanize } from '../../../../lib/format';
import type { AartiRow } from '../../../../lib/types';

const KINDS = ['mangla', 'shringar', 'rajbhog', 'utthapan', 'sandhya', 'shayan', 'other'] as const;
const SEASONS = ['all', 'summer', 'winter'] as const;

/** "1970-01-01T07:45:00.000Z" (wall-clock stored as a time) → "07:45". */
function hhmm(t: string): string {
  const m = /T(\d{2}:\d{2})/.exec(t);
  return m?.[1] ?? t.slice(0, 5);
}

function AartiEditor() {
  const params = useSearchParams();
  const id = params.get('id') ?? '';
  const name = params.get('name') ?? 'Temple';
  const key = ['aarti', id];
  const q = useQuery({
    queryKey: key,
    queryFn: async () =>
      as<AartiRow[]>(await api.GET('/v1/admin/temples/{id}/aarti', { params: { path: { id } } })),
    enabled: id !== '',
  });
  const [kind, setKind] = useState<(typeof KINDS)[number]>('mangla');
  const [time, setTime] = useState('05:30');
  const [season, setSeason] = useState<(typeof SEASONS)[number]>('all');
  const [label, setLabel] = useState('');
  const save = useAction(
    async ({ row, localTime }: { row: AartiRow; localTime: string }) =>
      api.PATCH('/v1/admin/aarti/{id}', {
        params: { path: { id: row.id } },
        body: {
          localTime,
          durationMin: row.durationMin ?? 15,
          recurrence: row.recurrence,
          season: row.season as (typeof SEASONS)[number],
        },
      }),
    [key],
  );
  const remove = useAction(
    async (row: AartiRow) => {
      if (!window.confirm(`Delete ${row.nameI18n.en}?`)) return undefined;
      return api.DELETE('/v1/admin/aarti/{id}', { params: { path: { id: row.id } } });
    },
    [key],
  );
  const add = useAction(
    async () =>
      api.POST('/v1/admin/temples/{id}/aarti', {
        params: { path: { id } },
        body: {
          kind,
          localTime: time,
          season,
          durationMin: 15,
          recurrence: 'FREQ=DAILY',
          name: { en: label || `${humanize(kind)} Aarti` },
        },
      }),
    [key],
  );

  return (
    <>
      <Link
        href="/temples/"
        className="mb-4 inline-flex items-center gap-1 text-sm font-semibold text-navy"
      >
        <ArrowLeft className="h-4 w-4" /> Temples
      </Link>
      <PageHeader
        title={name}
        subtitle="Times are local wall-clock (IST). Changes reach the app and the AI guide at once."
      />
      <ErrorBox message={save.error ?? remove.error ?? add.error} />
      {q.isPending ? (
        <Spinner />
      ) : q.isError ? (
        <ErrorBox message={errorMessage(q.error)} />
      ) : (
        <Table head={['Aarti', 'Kind', 'Season', 'Time (IST)', '']}>
          {q.data.map((a) => (
            <tr key={a.id}>
              <td className="px-4 py-3 font-semibold">
                {a.nameI18n.en}
                {a.nameI18n.hi && <span className="block text-xs text-muted">{a.nameI18n.hi}</span>}
              </td>
              <td className="px-4 py-3">{humanize(a.kind)}</td>
              <td className="px-4 py-3">{humanize(a.season)}</td>
              <td className="px-4 py-3">
                <input
                  type="time"
                  defaultValue={hhmm(a.localTime)}
                  className="rounded-lg border border-line px-2 py-1"
                  onBlur={(e) => {
                    if (e.target.value && e.target.value !== hhmm(a.localTime)) {
                      void save.run({ row: a, localTime: e.target.value });
                    }
                  }}
                />
              </td>
              <td className="px-4 py-3 text-right">
                <button aria-label="Delete" onClick={() => remove.run(a)} className="text-sos">
                  <Trash2 className="h-4 w-4" />
                </button>
              </td>
            </tr>
          ))}
        </Table>
      )}
      <Card className="mt-6">
        <h2 className="mb-3 font-bold text-navy">Add an aarti</h2>
        <div className="grid gap-3 sm:grid-cols-5">
          <Field label="Kind">
            <Select
              value={kind}
              onChange={(e) => {
                setKind(e.target.value as (typeof KINDS)[number]);
              }}
            >
              {KINDS.map((k) => (
                <option key={k} value={k}>
                  {humanize(k)}
                </option>
              ))}
            </Select>
          </Field>
          <Field label="Name (optional)">
            <Input
              value={label}
              onChange={(e) => {
                setLabel(e.target.value);
              }}
              placeholder={`${humanize(kind)} Aarti`}
            />
          </Field>
          <Field label="Time (IST)">
            <Input
              type="time"
              value={time}
              onChange={(e) => {
                setTime(e.target.value);
              }}
            />
          </Field>
          <Field label="Season">
            <Select
              value={season}
              onChange={(e) => {
                setSeason(e.target.value as (typeof SEASONS)[number]);
              }}
            >
              {SEASONS.map((s) => (
                <option key={s} value={s}>
                  {humanize(s)}
                </option>
              ))}
            </Select>
          </Field>
          <div className="flex items-end">
            <Button className="w-full" loading={add.busy} onClick={() => add.run(undefined)}>
              <Plus className="h-4 w-4" /> Add
            </Button>
          </div>
        </div>
      </Card>
    </>
  );
}

export default function Page() {
  return (
    <Suspense fallback={<Spinner />}>
      <AartiEditor />
    </Suspense>
  );
}
