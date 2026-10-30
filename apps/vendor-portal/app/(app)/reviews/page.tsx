'use client';

import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { Star } from 'lucide-react';
import { useState } from 'react';
import {
  Badge,
  Button,
  Card,
  Empty,
  ErrorBox,
  PageHeader,
  Spinner,
  Textarea,
} from '../../../components/ui';
import { api, errorMessage, must } from '../../../lib/api';
import { istDate, titleCase } from '../../../lib/format';
import { useVendor } from '../../../lib/session';

function Stars({ n }: { n: number }) {
  return (
    <span className="flex" aria-label={`${n} out of 5`}>
      {Array.from({ length: 5 }, (_, i) => (
        <Star
          key={i}
          className={`h-4 w-4 ${i < n ? 'fill-saffron text-saffron' : 'text-gray-300'}`}
          aria-hidden
        />
      ))}
    </span>
  );
}

function ReplyBox({ vid, id }: { vid: string; id: string }) {
  const qc = useQueryClient();
  const [text, setText] = useState('');
  const [error, setError] = useState<string | null>(null);
  const reply = useMutation({
    mutationFn: async () =>
      api.POST('/v1/vendors/{vid}/reviews/{id}/reply', {
        params: { path: { vid, id } },
        body: { reply: text.trim() },
      }),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['reviews', vid] }),
    onError: (e) => {
      setError(errorMessage(e));
    },
  });
  return (
    <div className="mt-3 space-y-2">
      <Textarea
        rows={2}
        maxLength={1000}
        placeholder="Thank the guest or address their concern…"
        value={text}
        onChange={(e) => {
          setText(e.target.value);
        }}
      />
      <ErrorBox message={error} />
      <Button
        variant="secondary"
        disabled={text.trim().length < 2}
        loading={reply.isPending}
        onClick={() => {
          reply.mutate();
        }}
      >
        Post reply
      </Button>
    </div>
  );
}

export default function ReviewsPage() {
  const { vid, can } = useVendor();
  const [onlyOpen, setOnlyOpen] = useState(false);
  const reviews = useQuery({
    queryKey: ['reviews', vid, onlyOpen],
    queryFn: async () =>
      must(
        await api.GET('/v1/vendors/{vid}/reviews', {
          params: {
            path: { vid },
            query: { limit: 50, ...(onlyOpen ? { unanswered: 'true' } : {}) },
          },
        }),
      ),
  });
  const list = reviews.data?.data ?? [];
  return (
    <>
      <PageHeader
        title="Reviews"
        subtitle="A short, kind reply builds trust with future pilgrims."
        actions={
          <label className="flex items-center gap-2 text-sm">
            <input
              type="checkbox"
              checked={onlyOpen}
              onChange={(e) => {
                setOnlyOpen(e.target.checked);
              }}
            />{' '}
            Needs a reply
          </label>
        }
      />
      {reviews.isLoading ? (
        <Spinner />
      ) : list.length === 0 ? (
        <Empty title="No reviews here yet" />
      ) : (
        <div className="space-y-4">
          {list.map((r) => (
            <Card key={r.id}>
              <div className="flex flex-wrap items-center justify-between gap-2">
                <div className="flex items-center gap-3">
                  <Stars n={r.rating} />
                  <span className="font-semibold">{r.author.displayName}</span>
                  {r.verifiedStay && <Badge tone="green">Verified booking</Badge>}
                </div>
                <span className="text-xs text-muted">
                  {titleCase(r.targetType)} · {istDate(r.createdAt)}
                </span>
              </div>
              {r.body && <p className="mt-2 text-sm">{r.body}</p>}
              {r.vendorReply ? (
                <div className="mt-3 rounded-xl bg-paper px-4 py-3 text-sm">
                  <p className="text-xs font-semibold text-navy">
                    Your reply · {istDate(r.vendorRepliedAt)}
                  </p>
                  <p>{r.vendorReply}</p>
                </div>
              ) : (
                can('reviews.reply') && <ReplyBox vid={vid} id={r.id} />
              )}
            </Card>
          ))}
        </div>
      )}
    </>
  );
}
