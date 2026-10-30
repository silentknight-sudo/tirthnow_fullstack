'use client';

import { useQuery } from '@tanstack/react-query';
import { api, must } from './api';

export function useCities() {
  return useQuery({
    queryKey: ['cities'],
    queryFn: async () => must(await api.GET('/v1/cities')),
    staleTime: 3_600_000,
  });
}
