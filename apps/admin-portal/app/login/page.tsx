'use client';

import { ShieldCheck } from 'lucide-react';
import { useRouter } from 'next/navigation';
import { type FormEvent, useState } from 'react';
import { Button, ErrorBox, Field, Input } from '../../components/ui';
import { api, errorMessage, isAdmin, must, tokens } from '../../lib/api';

type AuthOrChallenge = { accessToken: string } | { challengeId: string };

export default function LoginPage() {
  const router = useRouter();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [code, setCode] = useState('');
  const [challenge, setChallenge] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  function finish(res: Parameters<typeof tokens.save>[0]) {
    if (!isAdmin(res.user.roles)) {
      setError('This account is not an admin.');
      return;
    }
    tokens.save(res);
    router.replace('/dashboard/');
  }

  async function onSubmit(e: FormEvent) {
    e.preventDefault();
    setError(null);
    setBusy(true);
    try {
      if (challenge) {
        finish(
          must(
            await api.POST('/v1/auth/portal/otp/verify', {
              body: { challengeId: challenge, code },
            }),
          ),
        );
      } else {
        const res = must(
          await api.POST('/v1/auth/portal/login', { body: { email: email.trim(), password } }),
        ) as AuthOrChallenge;
        if ('challengeId' in res) setChallenge(res.challengeId);
        else finish(res as Parameters<typeof tokens.save>[0]);
      }
    } catch (err) {
      setError(errorMessage(err));
    } finally {
      setBusy(false);
    }
  }

  return (
    <main className="grid min-h-screen lg:grid-cols-2">
      <div className="relative hidden flex-col justify-between overflow-hidden bg-navy-900 p-10 text-white lg:flex">
        <div className="absolute -right-24 -top-24 h-96 w-96 rounded-full bg-saffron/20 blur-3xl" />
        <div className="flex items-center gap-3">
          <img
            src={`${process.env.NEXT_PUBLIC_BASE_PATH ?? ''}/logo.png`}
            alt=""
            className="h-10 w-10 rounded-full bg-white p-1"
          />
          <span className="text-lg font-bold">Tirth Now · Admin</span>
        </div>
        <div>
          <h1 className="text-4xl font-extrabold leading-tight">
            Run Braj yatra
            <br />
            <span className="text-saffron-soft">operations in one place.</span>
          </h1>
          <p className="mt-4 max-w-md text-white/70">
            Approve partners, watch SOS alerts, keep aarti times right, handle refunds and payouts.
          </p>
        </div>
        <p className="text-xs text-white/50">
          Staff only. Every action is recorded in the audit log.
        </p>
      </div>
      <div className="flex items-center justify-center p-6">
        <form onSubmit={onSubmit} className="w-full max-w-sm space-y-4" noValidate>
          <div className="mb-6 flex items-center gap-2 text-navy">
            <ShieldCheck className="h-7 w-7 text-saffron" />
            <h2 className="text-2xl font-extrabold">
              {challenge ? 'Enter the code' : 'Admin sign in'}
            </h2>
          </div>
          {challenge ? (
            <Field label="6-digit code from your email">
              <Input
                inputMode="numeric"
                value={code}
                onChange={(e) => {
                  setCode(e.target.value);
                }}
              />
            </Field>
          ) : (
            <>
              <Field label="Email">
                <Input
                  type="email"
                  autoComplete="email"
                  value={email}
                  onChange={(e) => {
                    setEmail(e.target.value);
                  }}
                />
              </Field>
              <Field label="Password">
                <Input
                  type="password"
                  autoComplete="current-password"
                  value={password}
                  onChange={(e) => {
                    setPassword(e.target.value);
                  }}
                />
              </Field>
            </>
          )}
          <ErrorBox message={error} />
          <Button type="submit" className="w-full" loading={busy}>
            {challenge ? 'Verify' : 'Sign in'}
          </Button>
        </form>
      </div>
    </main>
  );
}
