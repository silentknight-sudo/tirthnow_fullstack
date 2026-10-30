'use client';

import {
  CalendarDays,
  ClipboardList,
  LayoutDashboard,
  LogOut,
  Menu,
  MessageSquareText,
  Settings,
  Store,
  Users,
  Wallet,
  X,
} from 'lucide-react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { type ReactNode, useState } from 'react';
import { Badge, Spinner } from '../../components/ui';
import { type Permission, VendorProvider, useSignOut, useUser, useVendor } from '../../lib/session';
import { vendorStatusLabel, vendorTone } from '../../lib/status';

interface NavItem {
  href: string;
  label: string;
  icon: typeof LayoutDashboard;
  perm?: Permission;
  hotelOnly?: boolean;
}

const NAV: NavItem[] = [
  { href: '/dashboard/', label: 'Dashboard', icon: LayoutDashboard },
  { href: '/orders/', label: 'Bookings', icon: ClipboardList },
  { href: '/listings/', label: 'Listings', icon: Store },
  { href: '/calendar/', label: 'Room calendar', icon: CalendarDays, hotelOnly: true },
  { href: '/payouts/', label: 'Payouts', icon: Wallet, perm: 'finance.view' },
  { href: '/reviews/', label: 'Reviews', icon: MessageSquareText },
  { href: '/team/', label: 'Team', icon: Users },
  { href: '/settings/', label: 'Business & KYC', icon: Settings },
];

function Sidebar({ onNavigate }: { onNavigate?: () => void }) {
  const path = usePathname();
  const { vendor, vendors, switchTo, can } = useVendor();
  const user = useUser();
  const signOut = useSignOut();
  const items = NAV.filter(
    (n) =>
      (!n.perm || can(n.perm)) &&
      (!n.hotelOnly || vendor.type === 'hotel' || vendor.type === 'multi'),
  );
  return (
    <div className="flex h-full flex-col">
      <div className="flex items-center gap-2 px-5 py-5">
        <img src="/logo.png" alt="" width={36} height={36} />
        <div>
          <p className="text-lg font-extrabold leading-tight text-white">
            Tirth<span className="text-saffron-soft">Now</span>
          </p>
          <p className="text-[10px] font-semibold uppercase tracking-widest text-white/60">
            Partner portal
          </p>
        </div>
      </div>
      <div className="mx-4 mb-4 rounded-xl bg-white/10 p-3">
        {vendors.length > 1 ? (
          <select
            aria-label="Business"
            value={vendor.id}
            onChange={(e) => {
              switchTo(e.target.value);
            }}
            className="w-full rounded-lg bg-white/90 px-2 py-1 text-sm text-ink"
          >
            {vendors.map((v) => (
              <option key={v.id} value={v.id}>
                {v.displayName}
              </option>
            ))}
          </select>
        ) : (
          <p className="truncate text-sm font-semibold text-white">{vendor.displayName}</p>
        )}
        <div className="mt-2">
          <Badge tone={vendorTone[vendor.status] ?? 'gray'}>
            {vendorStatusLabel[vendor.status]}
          </Badge>
        </div>
      </div>
      <nav className="flex-1 space-y-1 px-3">
        {items.map(({ href, label, icon: Icon }) => {
          const active = path.startsWith(href);
          return (
            <Link
              key={href}
              href={href}
              onClick={onNavigate}
              className={`flex items-center gap-3 rounded-xl px-3 py-2.5 text-sm font-medium transition ${
                active ? 'bg-white text-navy' : 'text-white/80 hover:bg-white/10 hover:text-white'
              }`}
            >
              <Icon className="h-[18px] w-[18px]" aria-hidden />
              {label}
            </Link>
          );
        })}
      </nav>
      <div className="border-t border-white/10 p-4">
        <p className="truncate text-sm font-semibold text-white">
          {user?.displayName ?? user?.email}
        </p>
        <p className="truncate text-xs text-white/60">{user?.email}</p>
        <button
          onClick={() => void signOut()}
          className="mt-3 flex items-center gap-2 text-sm text-white/80 hover:text-white"
        >
          <LogOut className="h-4 w-4" aria-hidden /> Sign out
        </button>
      </div>
    </div>
  );
}

function Shell({ children }: { children: ReactNode }) {
  const [open, setOpen] = useState(false);
  return (
    <div className="min-h-screen lg:flex">
      <aside className="hidden w-64 shrink-0 bg-gradient-to-b from-navy to-navy-900 lg:block">
        <div className="sticky top-0 h-screen">
          <Sidebar />
        </div>
      </aside>
      <header className="flex items-center justify-between bg-navy px-4 py-3 lg:hidden">
        <p className="text-lg font-extrabold text-white">
          Tirth<span className="text-saffron-soft">Now</span>
        </p>
        <button
          aria-label="Open menu"
          onClick={() => {
            setOpen(true);
          }}
          className="text-white"
        >
          <Menu />
        </button>
      </header>
      {open && (
        <div className="fixed inset-0 z-40 lg:hidden">
          <div
            className="absolute inset-0 bg-ink/50"
            onClick={() => {
              setOpen(false);
            }}
          />
          <aside className="absolute inset-y-0 left-0 w-72 bg-gradient-to-b from-navy to-navy-900">
            <button
              aria-label="Close menu"
              onClick={() => {
                setOpen(false);
              }}
              className="absolute right-3 top-4 text-white"
            >
              <X />
            </button>
            <Sidebar
              onNavigate={() => {
                setOpen(false);
              }}
            />
          </aside>
        </div>
      )}
      <main className="min-w-0 flex-1 px-4 py-6 sm:px-8 lg:py-8">{children}</main>
    </div>
  );
}

export default function AppLayout({ children }: { children: ReactNode }) {
  return (
    <VendorProvider
      fallback={
        <div className="p-8">
          <Spinner />
        </div>
      }
    >
      <Shell>{children}</Shell>
    </VendorProvider>
  );
}
