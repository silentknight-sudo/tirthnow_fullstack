'use client';

import { useQueryClient } from '@tanstack/react-query';
import type { ReactNode } from 'react';
import { Badge } from '../ui';

export function useInvalidate() {
  const qc = useQueryClient();
  return (key: string, vid: string) => qc.invalidateQueries({ queryKey: [key, vid] });
}

export function PublishedBadge({ on }: { on: boolean }) {
  return on ? <Badge tone="green">Published</Badge> : <Badge tone="gray">Hidden</Badge>;
}

export function Section({
  title,
  action,
  children,
}: {
  title: string;
  action?: ReactNode;
  children: ReactNode;
}) {
  return (
    <section className="space-y-3">
      <div className="flex items-center justify-between">
        <h2 className="text-lg font-bold text-navy">{title}</h2>
        {action}
      </div>
      {children}
    </section>
  );
}

/** "a, b , c" → ["a","b","c"] for simple tag inputs. */
export function splitList(v: string | undefined): string[] {
  return (v ?? '')
    .split(',')
    .map((s) => s.trim())
    .filter(Boolean);
}

/** Amenity tags are slugs on the API: "Hot water" → "hot-water". */
export function amenityTags(v: string | undefined): string[] {
  return splitList(v)
    .map((t) =>
      t
        .toLowerCase()
        .replace(/[^a-z0-9]+/g, '-')
        .replace(/^-|-$/g, ''),
    )
    .filter((t) => t.length >= 2)
    .slice(0, 40);
}
