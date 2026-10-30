'use client';

import { useQuery } from '@tanstack/react-query';
import { api, must } from './api';

export function useEarnings(vid: string, enabled: boolean) {
  return useQuery({
    queryKey: ['earnings', vid],
    enabled,
    queryFn: async () =>
      must(await api.GET('/v1/vendors/{vid}/earnings', { params: { path: { vid } } })),
  });
}

export function useBankAccounts(vid: string) {
  return useQuery({
    queryKey: ['bank', vid],
    queryFn: async () =>
      must(await api.GET('/v1/vendors/{vid}/bank-accounts', { params: { path: { vid } } })),
  });
}
