'use client';

import { useQuery } from '@tanstack/react-query';
import { Megaphone } from 'lucide-react';
import { useState } from 'react';
import { useAction } from '../../../components/admin';
import {
  Button,
  Card,
  ErrorBox,
  Field,
  Input,
  PageHeader,
  Spinner,
  Textarea,
} from '../../../components/ui';
import { api, as, errorMessage, idem } from '../../../lib/api';
import { humanize, istDateTime } from '../../../lib/format';
import type { ConfigRow } from '../../../lib/types';

export default function Settings() {
  const q = useQuery({
    queryKey: ['config'],
    queryFn: async () => as<ConfigRow[]>(await api.GET('/v1/admin/config')),
  });
  const toggle = useAction(
    async (row: ConfigRow) =>
      api.PUT('/v1/admin/config', {
        body: {
          key: row.key,
          kind: row.kind as 'feature_flag',
          value: !(row.value === true) as never,
        },
      }),
    [['config']],
  );
  const [title, setTitle] = useState('');
  const [body, setBody] = useState('');
  const [sent, setSent] = useState(false);
  const broadcast = useAction(async () => {
    if (!window.confirm('Send this notification to every user?')) return undefined;
    await api.POST('/v1/admin/broadcasts', { params: { header: idem() }, body: { title, body } });
    setSent(true);
    setTitle('');
    setBody('');
    return undefined;
  }, []);

  const flags = (q.data ?? []).filter((r) => r.kind === 'feature_flag');
  const other = (q.data ?? []).filter((r) => r.kind !== 'feature_flag');
  return (
    <>
      <PageHeader
        title="App settings"
        subtitle="Feature switches take effect in the apps without a new release."
      />
      <ErrorBox message={toggle.error} />
      {q.isPending ? (
        <Spinner />
      ) : q.isError ? (
        <ErrorBox message={errorMessage(q.error)} />
      ) : (
        <div className="grid gap-4 lg:grid-cols-2">
          <Card>
            <h2 className="mb-3 font-bold text-navy">Features</h2>
            <ul className="divide-y divide-line">
              {flags.map((f) => (
                <li key={f.id} className="flex items-center justify-between py-3">
                  <div>
                    <p className="font-semibold">{humanize(f.key.replace(/^feature\./, ''))}</p>
                    <p className="text-xs text-muted">Updated {istDateTime(f.updatedAt)}</p>
                  </div>
                  <button
                    role="switch"
                    aria-checked={f.value === true}
                    onClick={() => toggle.run(f)}
                    className={`relative h-7 w-12 rounded-full transition ${f.value === true ? 'bg-ok' : 'bg-gray-300'}`}
                  >
                    <span
                      className={`absolute top-1 h-5 w-5 rounded-full bg-white transition ${f.value === true ? 'left-6' : 'left-1'}`}
                    />
                  </button>
                </li>
              ))}
            </ul>
          </Card>
          <Card>
            <h2 className="mb-3 flex items-center gap-2 font-bold text-navy">
              <Megaphone className="h-5 w-5 text-saffron" /> Send a notification to everyone
            </h2>
            <div className="space-y-3">
              <Field label="Title">
                <Input
                  value={title}
                  maxLength={80}
                  onChange={(e) => {
                    setTitle(e.target.value);
                  }}
                  placeholder="Janmashtami at Banke Bihari"
                />
              </Field>
              <Field label="Message">
                <Textarea
                  rows={3}
                  value={body}
                  maxLength={240}
                  onChange={(e) => {
                    setBody(e.target.value);
                  }}
                  placeholder="Darshan timings change tonight…"
                />
              </Field>
              <ErrorBox message={broadcast.error} />
              {sent && <p className="text-sm text-ok">Sent ✓</p>}
              <Button
                disabled={title.trim().length < 3 || body.trim().length < 3}
                loading={broadcast.busy}
                onClick={() => broadcast.run(undefined)}
              >
                Send
              </Button>
            </div>
          </Card>
          {other.length > 0 && (
            <Card className="lg:col-span-2">
              <h2 className="mb-3 font-bold text-navy">Other settings</h2>
              <ul className="divide-y divide-line text-sm">
                {other.map((o) => (
                  <li key={o.id} className="flex flex-wrap justify-between gap-2 py-2">
                    <span className="font-mono text-xs">{o.key}</span>
                    <code className="max-w-full truncate rounded bg-paper px-2 py-0.5 text-xs">
                      {JSON.stringify(o.value)}
                    </code>
                  </li>
                ))}
              </ul>
            </Card>
          )}
        </div>
      )}
    </>
  );
}
