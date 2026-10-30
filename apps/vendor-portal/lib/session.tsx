'use client';

import { useQuery, useQueryClient } from '@tanstack/react-query';
import type { Schemas } from '@tirth-now/api-client';
import { useRouter } from 'next/navigation';
import {
  type ReactNode,
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
  useSyncExternalStore,
} from 'react';
import { api, must, tokens } from './api';

export type Vendor = Schemas['VendorResponse'];
export type Permission =
  'listings.edit' | 'inventory.edit' | 'orders.manage' | 'finance.view' | 'reviews.reply';

const CURRENT = 'tn.vendor.current';

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

export function useMyVendors(enabled = true) {
  return useQuery({
    queryKey: ['vendors', 'me'],
    queryFn: async () => must(await api.GET('/v1/vendors/me')),
    enabled,
  });
}

interface VendorCtx {
  vendor: Vendor;
  vid: string;
  vendors: Vendor[];
  switchTo: (id: string) => void;
  can: (p: Permission) => boolean;
}

const Ctx = createContext<VendorCtx | null>(null);

/** Loads the signed-in user's vendors and exposes the selected one to pages. */
export function VendorProvider({
  children,
  fallback,
}: {
  children: ReactNode;
  fallback: ReactNode;
}) {
  const router = useRouter();
  const user = useUser();
  const [hydrated, setHydrated] = useState(false);
  const [current, setCurrent] = useState<string | null>(null);
  useEffect(() => {
    setHydrated(true);
    setCurrent(localStorage.getItem(CURRENT));
  }, []);
  const vendors = useMyVendors(hydrated && user !== null);

  useEffect(() => {
    if (hydrated && user === null) router.replace('/login/');
  }, [hydrated, user, router]);
  useEffect(() => {
    if (vendors.data && vendors.data.length === 0) router.replace('/onboarding/');
  }, [vendors.data, router]);

  const value = useMemo<VendorCtx | null>(() => {
    const list = vendors.data ?? [];
    const vendor = list.find((v) => v.id === current) ?? list[0];
    if (!vendor) return null;
    return {
      vendor,
      vid: vendor.id,
      vendors: list,
      switchTo: (id) => {
        localStorage.setItem(CURRENT, id);
        setCurrent(id);
      },
      can: (p) => vendor.myRole === 'owner' || vendor.myPermissions.includes(p),
    };
  }, [vendors.data, current]);

  if (!value) return <>{fallback}</>;
  return <Ctx.Provider value={value}>{children}</Ctx.Provider>;
}

export function useVendor(): VendorCtx {
  const v = useContext(Ctx);
  if (!v) throw new Error('useVendor outside VendorProvider');
  return v;
}
