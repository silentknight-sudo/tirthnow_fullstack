'use client';

import { useQuery } from '@tanstack/react-query';
import { MapPin, Phone } from 'lucide-react';
import { useState } from 'react';
import { Tabs, useAction } from '../../../components/admin';
import {
  Badge,
  Button,
  Card,
  Empty,
  ErrorBox,
  Modal,
  PageHeader,
  Spinner,
} from '../../../components/ui';
import { api, as, errorMessage } from '../../../lib/api';
import { humanize, istDateTime } from '../../../lib/format';
import { tone } from '../../../lib/status';
import type { Page, SosRow } from '../../../lib/types';

const FILTERS = [
  ['active', 'Active'],
  ['resolved', 'Resolved'],
  ['false_alarm', 'False alarm'],
  ['all', 'All'],
] as const;
type Filter = (typeof FILTERS)[number][0];

export default function Sos() {
  const [filter, setFilter] = useState<Filter>('active');
  const [openId, setOpenId] = useState<string | null>(null);
  const q = useQuery({
    queryKey: ['admin-sos', filter],
    queryFn: async () =>
      as<Page<SosRow>>(
        await api.GET('/v1/admin/sos', {
          params: {
            query: {
              limit: 50,
              ...(filter === 'active'
                ? { active: true }
                : filter === 'all'
                  ? {}
                  : { status: filter }),
            } as never,
          },
        }),
      ),
    refetchInterval: filter === 'active' ? 15_000 : false,
  });
  const detail = useQuery({
    queryKey: ['admin-sos-one', openId],
    queryFn: async () =>
      as<SosRow>(await api.GET('/v1/admin/sos/{id}', { params: { path: { id: openId ?? '' } } })),
    enabled: openId !== null,
  });
  const resolve = useAction(
    async ({ id, falseAlarm }: { id: string; falseAlarm: boolean }) => {
      const note = window.prompt('Note for the record (optional)') ?? undefined;
      return api.POST('/v1/admin/sos/{id}/resolve', {
        params: { path: { id } },
        body: { falseAlarm, ...(note ? { note } : {}) },
      });
    },
    [['admin-sos'], ['kpis']],
  );

  return (
    <>
      <PageHeader
        title="SOS alerts"
        subtitle="Pilgrims who pressed SOS. The active list refreshes every 15 seconds."
      />
      <Tabs value={filter} options={FILTERS} onChange={setFilter} />
      <ErrorBox message={resolve.error} />
      {q.isPending ? (
        <Spinner />
      ) : q.isError ? (
        <ErrorBox message={errorMessage(q.error)} />
      ) : q.data.data.length === 0 ? (
        <Empty
          title={filter === 'active' ? 'No active SOS. All pilgrims are safe 🙏' : 'Nothing here'}
        />
      ) : (
        <div className="grid gap-3 md:grid-cols-2">
          {q.data.data.map((s) => (
            <Card
              key={s.id}
              className={s.status === 'triggered' ? 'border-sos ring-2 ring-sos/30' : ''}
            >
              <div className="flex items-start justify-between gap-2">
                <div>
                  <p className="font-bold text-ink">{s.user?.name ?? 'Pilgrim'}</p>
                  <p className="text-xs text-muted">{istDateTime(s.createdAt)}</p>
                </div>
                <Badge tone={tone(s.status)}>{humanize(s.status)}</Badge>
              </div>
              <div className="mt-3 flex flex-wrap gap-3 text-sm">
                {s.user?.phoneE164 && (
                  <a
                    href={`tel:${s.user.phoneE164}`}
                    className="inline-flex items-center gap-1 font-semibold text-navy"
                  >
                    <Phone className="h-4 w-4" /> {s.user.phoneE164}
                  </a>
                )}
                <a
                  href={`https://maps.google.com/?q=${s.lat},${s.lng}`}
                  target="_blank"
                  rel="noreferrer"
                  className="inline-flex items-center gap-1 font-semibold text-navy"
                >
                  <MapPin className="h-4 w-4" /> Map
                </a>
                {s.batteryPct !== null && (
                  <span className="text-muted">Battery {s.batteryPct}%</span>
                )}
              </div>
              <div className="mt-4 flex flex-wrap gap-2">
                <Button
                  variant="secondary"
                  onClick={() => {
                    setOpenId(s.id);
                  }}
                >
                  Details
                </Button>
                {(s.status === 'triggered' || s.status === 'dispatched') && (
                  <>
                    <Button
                      loading={resolve.busy}
                      onClick={() => resolve.run({ id: s.id, falseAlarm: false })}
                    >
                      Resolved
                    </Button>
                    <Button
                      variant="ghost"
                      loading={resolve.busy}
                      onClick={() => resolve.run({ id: s.id, falseAlarm: true })}
                    >
                      False alarm
                    </Button>
                  </>
                )}
              </div>
            </Card>
          ))}
        </div>
      )}
      <Modal
        open={openId !== null}
        title="SOS details"
        onClose={() => {
          setOpenId(null);
        }}
      >
        {detail.isPending ? (
          <Spinner />
        ) : detail.data ? (
          <div className="space-y-3 text-sm">
            <p>
              <b>{detail.data.user?.name ?? 'Pilgrim'}</b> · {detail.data.user?.phoneE164 ?? ''}{' '}
              {detail.data.user?.email ?? ''}
            </p>
            <p>
              Location: {detail.data.lat.toFixed(5)}, {detail.data.lng.toFixed(5)} (±
              {detail.data.accuracyM ?? '?'} m)
            </p>
            {detail.data.shareUrl && (
              <a
                href={detail.data.shareUrl}
                target="_blank"
                rel="noreferrer"
                className="font-semibold text-saffron"
              >
                Live tracking link →
              </a>
            )}
            <div>
              <p className="font-semibold">Emergency contacts</p>
              {(detail.data.emergencyContacts ?? []).length === 0 && (
                <p className="text-muted">None saved.</p>
              )}
              <ul>
                {(detail.data.emergencyContacts ?? []).map((c) => (
                  <li key={c.phoneE164}>
                    {c.name} ·{' '}
                    <a className="text-navy" href={`tel:${c.phoneE164}`}>
                      {c.phoneE164}
                    </a>
                  </li>
                ))}
              </ul>
            </div>
          </div>
        ) : (
          <ErrorBox message={errorMessage(detail.error)} />
        )}
      </Modal>
    </>
  );
}
