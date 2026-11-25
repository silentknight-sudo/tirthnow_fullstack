'use client';

import { useQueryClient } from '@tanstack/react-query';
import { useRouter } from 'next/navigation';
import { useCallback, useSyncExternalStore } from 'react';
import { api, tokens } from './api';

export function useUser() {
  return useSyncExternalStore(tokens.subscribe, tokens.user, () => null);
}

export function useSignOut() {
  const qc = useQueryClient();
  const router = useRouter();
  return useCallback(async () => {
    try {
      await api.POST('/v1/auth/logout', { body: {} });
    } catch {
      // The local session is cleared either way.
    }
    tokens.clear();
    qc.clear();
    router.replace('/login/');
  }, [qc, router]);
}
