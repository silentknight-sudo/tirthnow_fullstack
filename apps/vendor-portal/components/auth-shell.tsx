import type { ReactNode } from 'react';

/** Centred card with the logo, used by every signed-out page. */
export function AuthShell({
  title,
  subtitle,
  children,
}: {
  title: string;
  subtitle?: string;
  children: ReactNode;
}) {
  return (
    <main className="flex min-h-screen items-center justify-center bg-gradient-to-br from-paper to-[#EFF3FA] px-4 py-10">
      <div className="w-full max-w-md">
        <div className="mb-6 flex items-center justify-center gap-3">
          <img src="/logo.png" alt="" width={48} height={48} />
          <div>
            <p className="text-2xl font-extrabold text-navy">
              Tirth<span className="text-saffron">Now</span>
            </p>
            <p className="text-xs font-semibold uppercase tracking-widest text-muted">
              Partner portal
            </p>
          </div>
        </div>
        <div className="rounded-3xl border border-line bg-white p-7 shadow-card">
          <h1 className="text-xl font-extrabold text-navy">{title}</h1>
          {subtitle && <p className="mt-1 text-sm text-muted">{subtitle}</p>}
          <div className="mt-6">{children}</div>
        </div>
      </div>
    </main>
  );
}
