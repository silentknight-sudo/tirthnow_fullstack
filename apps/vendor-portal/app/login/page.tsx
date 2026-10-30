'use client';

import { zodResolver } from '@hookform/resolvers/zod';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useState } from 'react';
import { useForm } from 'react-hook-form';
import { z } from 'zod';
import { AuthShell } from '../../components/auth-shell';
import { Button, ErrorBox, Field, Input } from '../../components/ui';
import { api, errorMessage, must, tokens } from '../../lib/api';

const schema = z.object({
  email: z.string().trim().email('Enter a valid email'),
  password: z.string().min(1, 'Enter your password'),
});
const otpSchema = z.object({ code: z.string().regex(/^\d{6}$/, 'Enter the 6-digit code') });

type AuthOrChallenge = { accessToken: string } | { challengeId: string };

export default function LoginPage() {
  const router = useRouter();
  const [error, setError] = useState<string | null>(null);
  const [challenge, setChallenge] = useState<string | null>(null);
  const form = useForm<z.infer<typeof schema>>({ resolver: zodResolver(schema) });
  const otp = useForm<z.infer<typeof otpSchema>>({ resolver: zodResolver(otpSchema) });

  const onLogin = form.handleSubmit(async (values) => {
    setError(null);
    try {
      const res = must(
        await api.POST('/v1/auth/portal/login', { body: values }),
      ) as AuthOrChallenge;
      if ('challengeId' in res) {
        setChallenge(res.challengeId);
        return;
      }
      tokens.save(res as Parameters<typeof tokens.save>[0]);
      router.replace('/dashboard/');
    } catch (e) {
      setError(errorMessage(e));
    }
  });

  const onOtp = otp.handleSubmit(async ({ code }) => {
    if (!challenge) return;
    setError(null);
    try {
      tokens.save(
        must(
          await api.POST('/v1/auth/portal/otp/verify', { body: { challengeId: challenge, code } }),
        ),
      );
      router.replace('/dashboard/');
    } catch (e) {
      setError(errorMessage(e));
    }
  });

  if (challenge) {
    return (
      <AuthShell title="Check your email" subtitle="We sent a 6-digit code to finish signing in.">
        <form onSubmit={onOtp} className="space-y-4" noValidate>
          <Field label="Code" error={otp.formState.errors.code?.message}>
            <Input inputMode="numeric" autoComplete="one-time-code" {...otp.register('code')} />
          </Field>
          <ErrorBox message={error} />
          <Button type="submit" className="w-full" loading={otp.formState.isSubmitting}>
            Verify
          </Button>
        </form>
      </AuthShell>
    );
  }

  return (
    <AuthShell title="Sign in" subtitle="Manage your stays, cabs, food and experiences.">
      <form onSubmit={onLogin} className="space-y-4" noValidate>
        <Field label="Email" error={form.formState.errors.email?.message}>
          <Input type="email" autoComplete="email" {...form.register('email')} />
        </Field>
        <Field label="Password" error={form.formState.errors.password?.message}>
          <Input type="password" autoComplete="current-password" {...form.register('password')} />
        </Field>
        <ErrorBox message={error} />
        <Button type="submit" className="w-full" loading={form.formState.isSubmitting}>
          Sign in
        </Button>
      </form>
      <div className="mt-5 flex justify-between text-sm">
        <Link href="/forgot-password/" className="text-navy hover:underline">
          Forgot password?
        </Link>
        <Link href="/register/" className="font-semibold text-saffron-deep hover:underline">
          Become a partner
        </Link>
      </div>
    </AuthShell>
  );
}
