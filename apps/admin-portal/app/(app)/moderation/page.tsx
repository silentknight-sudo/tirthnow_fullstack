'use client';

import { useQuery } from '@tanstack/react-query';
import { useState } from 'react';
import { Tabs, useAction } from '../../../components/admin';
import { Badge, Button, Card, Empty, ErrorBox, PageHeader, Spinner } from '../../../components/ui';
import { api, as, errorMessage } from '../../../lib/api';
import { humanize, istDateTime, text } from '../../../lib/format';
import { tone } from '../../../lib/status';
import type { Page, ReportRow } from '../../../lib/types';

const FILTERS = [
  ['open', 'Open'],
  ['actioned', 'Actioned'],
  ['dismissed', 'Dismissed'],
] as const;
type Filter = (typeof FILTERS)[number][0];
type Action = 'approve' | 'hide' | 'remove' | 'warn_user' | 'suspend_user' | 'restore';

export default function Moderation() {
  const [status, setStatus] = useState<Filter>('open');
  const q = useQuery({
    queryKey: ['admin-moderation', status],
    queryFn: async () =>
      as<Page<ReportRow>>(
        await api.GET('/v1/admin/moderation/queue', {
          params: { query: { limit: 50, status } as never },
        }),
      ),
  });
  const act = useAction(
    async ({ id, action }: { id: string; action: Action }) =>
      api.POST('/v1/admin/moderation/{reportId}/action', {
        params: { path: { reportId: id } },
        body: { action },
      }),
    [['admin-moderation'], ['kpis']],
  );
  return (
    <>
      <PageHeader
        title="Moderation"
        subtitle="Reels, comments and reviews reported by pilgrims or flagged automatically."
      />
      <Tabs value={status} options={FILTERS} onChange={setStatus} />
      <ErrorBox message={act.error} />
      {q.isPending ? (
        <Spinner />
      ) : q.isError ? (
        <ErrorBox message={errorMessage(q.error)} />
      ) : q.data.data.length === 0 ? (
        <Empty title="Nothing to review" />
      ) : (
        <div className="space-y-3">
          {q.data.data.map((r) => {
            const s = r.target.summary;
            const content = text(s.caption) || text(s.body) || text(s.title);
            const video = typeof s.playbackUrl === 'string' ? s.playbackUrl : null;
            return (
              <Card key={r.id} className="flex flex-col gap-4 md:flex-row">
                {video && (
                  <video
                    src={video}
                    controls
                    className="h-48 w-28 rounded-xl bg-black object-cover"
                  />
                )}
                <div className="flex-1">
                  <div className="flex flex-wrap items-center gap-2">
                    <Badge tone="blue">{humanize(r.targetType)}</Badge>
                    <Badge tone={tone(r.status)}>{humanize(r.status)}</Badge>
                    <Badge tone="orange">{humanize(r.reasonCode)}</Badge>
                    {r.automatic && <Badge>AI flag</Badge>}
                    <span className="text-xs text-muted">
                      {istDateTime(r.createdAt)} · {r.openReportsOnTarget} open report(s)
                    </span>
                  </div>
                  <p className="mt-2 text-sm">
                    {content || (r.target.exists ? '(no text)' : 'Content already deleted')}
                  </p>
                  {r.details && <p className="mt-1 text-xs text-muted">Reporter: {r.details}</p>}
                  {r.status === 'open' && (
                    <div className="mt-3 flex flex-wrap gap-2">
                      <Button
                        variant="secondary"
                        loading={act.busy}
                        onClick={() => act.run({ id: r.id, action: 'approve' })}
                      >
                        Keep
                      </Button>
                      <Button
                        variant="secondary"
                        loading={act.busy}
                        onClick={() => act.run({ id: r.id, action: 'hide' })}
                      >
                        Hide
                      </Button>
                      <Button
                        variant="danger"
                        loading={act.busy}
                        onClick={() => act.run({ id: r.id, action: 'remove' })}
                      >
                        Remove
                      </Button>
                      <Button
                        variant="ghost"
                        loading={act.busy}
                        onClick={() => act.run({ id: r.id, action: 'warn_user' })}
                      >
                        Warn author
                      </Button>
                      <Button
                        variant="ghost"
                        loading={act.busy}
                        onClick={() => act.run({ id: r.id, action: 'suspend_user' })}
                      >
                        Suspend author
                      </Button>
                    </div>
                  )}
                </div>
              </Card>
            );
          })}
        </div>
      )}
    </>
  );
}
