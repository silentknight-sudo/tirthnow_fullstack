'use client';

import { useMutation, useQueryClient } from '@tanstack/react-query';
import { useState } from 'react';
import { errorMessage } from '../lib/api';

/** Pill tabs used to filter lists by status. */
export function Tabs<T extends string>({
  value,
  options,
  onChange,
}: {
  value: T;
  options: readonly (readonly [T, string])[];
  onChange: (v: T) => void;
}) {
  return (
    <div className="mb-4 flex flex-wrap gap-2">
      {options.map(([v, label]) => (
        <button
          key={v}
          onClick={() => { onChange(v); }}
          className={`rounded-full border px-3.5 py-1.5 text-sm font-semibold transition ${
            value === v
              ? 'border-navy bg-navy text-white'
              : 'border-line bg-white text-navy hover:bg-paper-2'
          }`}
        >
          {label}
        </button>
      ))}
    </div>
  );
}

/** Runs an admin action, refreshes the given queries and keeps its error. */
export function useAction<A>(run: (arg: A) => Promise<unknown>, invalidate: readonly unknown[][]) {
  const qc = useQueryClient();
  const [error, setError] = useState<string | null>(null);
  const m = useMutation({
    mutationFn: run,
    onMutate: () => { setError(null); },
    onError: (e) => { setError(errorMessage(e)); },
    onSuccess: async () => {
      await Promise.all(invalidate.map((k) => qc.invalidateQueries({ queryKey: k })));
    },
  });
  return { run: m.mutateAsync, busy: m.isPending, error };
}

/** Asks for a reason before a destructive action. */
export function askReason(prompt: string): string | null {
  const r = window.prompt(prompt);
  if (r === null) return null;
  const t = r.trim();
  if (t.length < 3) {
    window.alert('Please enter at least 3 characters.');
    return null;
  }
  return t;
}
