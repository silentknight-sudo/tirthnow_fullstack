'use client';

import {
  Building2,
  FileClock,
  Gauge,
  IndianRupee,
  LogOut,
  Menu,
  ReceiptText,
  Settings,
  ShieldAlert,
  ShieldCheck,
  Siren,
  Users,
  X,
} from 'lucide-react';
import Link from 'next/link';
import { usePathname, useRouter } from 'next/navigation';
import { type ReactNode, useEffect, useState } from 'react';
import { Spinner } from '../../components/ui';
import { isAdmin } from '../../lib/api';
import { useSignOut, useUser } from '../../lib/session';

const NAV = [
  { href: '/dashboard/', label: 'Dashboard', icon: Gauge },
  { href: '/vendors/', label: 'Partners & KYC', icon: ShieldCheck },
  { href: '/orders/', label: 'Orders & refunds', icon: ReceiptText },
  { href: '/payouts/', label: 'Payouts', icon: IndianRupee },
  { href: '/sos/', label: 'SOS alerts', icon: Siren },
  { href: '/moderation/', label: 'Moderation', icon: ShieldAlert },
  { href: '/temples/', label: 'Temples & aarti', icon: Building2 },
  { href: '/users/', label: 'Users', icon: Users },
  { href: '/settings/', label: 'App settings', icon: Settings },
  { href: '/audit/', label: 'Audit log', icon: FileClock },
];

export default function AppLayout({ children }: { children: ReactNode }) {
  const user = useUser();
  const router = useRouter();
  const path = usePathname();
  const signOut = useSignOut();
  const [hydrated, setHydrated] = useState(false);
  const [open, setOpen] = useState(false);
  useEffect(() => {
    setHydrated(true);
  }, []);
  useEffect(() => {
    if (hydrated && (!user || !isAdmin(user.roles))) router.replace('/login/');
  }, [hydrated, user, router]);
  useEffect(() => {
    setOpen(false);
  }, [path]);
  if (!hydrated || !user) return <Spinner />;

  const nav = (
    <nav className="flex flex-1 flex-col gap-1">
      {NAV.map(({ href, label, icon: Icon }) => {
        const active = path.startsWith(href.replace(/\/$/, ''));
        return (
          <Link
            key={href}
            href={href}
            className={`flex items-center gap-3 rounded-xl px-3 py-2.5 text-sm font-semibold transition ${
              active
                ? 'bg-white text-navy shadow'
                : 'text-white/75 hover:bg-white/10 hover:text-white'
            }`}
          >
            <Icon className={`h-4 w-4 ${active ? 'text-saffron' : ''}`} />
            {label}
          </Link>
        );
      })}
    </nav>
  );

  return (
    <div className="min-h-screen lg:flex">
      <aside
        className={`fixed inset-y-0 left-0 z-40 flex w-64 flex-col gap-6 bg-navy-900 p-4 text-white transition-transform lg:sticky lg:top-0 lg:h-screen lg:translate-x-0 ${
          open ? 'translate-x-0' : '-translate-x-full'
        }`}
      >
        <div className="flex items-center gap-2 px-2 pt-2">
          <img
            src={`${process.env.NEXT_PUBLIC_BASE_PATH ?? ''}/logo.png`}
            alt=""
            className="h-9 w-9 rounded-full bg-white p-1"
          />
          <div>
            <p className="font-extrabold leading-tight">Tirth Now</p>
            <p className="text-xs text-saffron-soft">Admin panel</p>
          </div>
          <button
            className="ml-auto lg:hidden"
            aria-label="Close menu"
            onClick={() => {
              setOpen(false);
            }}
          >
            <X className="h-5 w-5" />
          </button>
        </div>
        {nav}
        <div className="rounded-xl bg-white/5 p-3 text-xs">
          <p className="truncate font-semibold">{user.displayName ?? user.email ?? 'Admin'}</p>
          <p className="truncate text-white/60">{user.roles.join(' · ')}</p>
          <button
            onClick={signOut}
            className="mt-2 inline-flex items-center gap-1.5 font-semibold text-saffron-soft hover:text-white"
          >
            <LogOut className="h-3.5 w-3.5" /> Sign out
          </button>
        </div>
      </aside>
      {open && (
        <div
          className="fixed inset-0 z-30 bg-ink/40 lg:hidden"
          onClick={() => {
            setOpen(false);
          }}
        />
      )}
      <div className="min-w-0 flex-1">
        <header className="sticky top-0 z-20 flex items-center gap-3 border-b border-line bg-paper/90 px-4 py-3 backdrop-blur lg:hidden">
          <button
            aria-label="Open menu"
            onClick={() => {
              setOpen(true);
            }}
          >
            <Menu className="h-6 w-6 text-navy" />
          </button>
          <span className="font-bold text-navy">Tirth Now · Admin</span>
        </header>
        <main className="mx-auto max-w-6xl p-4 sm:p-6 lg:p-8">{children}</main>
      </div>
    </div>
  );
}
