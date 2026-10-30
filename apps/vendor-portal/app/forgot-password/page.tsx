'use client';

import { zodResolver } from '@hookform/resolvers/zod';
import Link from 'next/link';
import { useState } from 'react';
import { useForm } from 'react-hook-form';
import { z } from 'zod';
import { AuthShell } from '../../components/auth-shell';
import { Button, ErrorBox, Field, Input } from '../../components/ui';
import { api, errorMessage } from '../../lib/api';

const schema = z.object({ email: z.string().trim().email('Enter a valid email') });

export default function ForgotPasswordPage() {
  const [sent, setSent] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const form = useForm<z.infer<typeof schema>>({ resolver: zodResolver(schema) });

  const onSubmit = form.handleSubmit(async (body) => {
    setError(null);
    try {
      await api.POST('/v1/auth/portal/password/forgot', { body });
      setSent(true);
    } catch (e) {
      setError(errorMessage(e));
    }
  });

  return (
    <AuthShell title="Reset your password">
      {sent ? (
        <p className="text-sm text-ink">
          If that email has an account, a reset link is on its way. It works for 30 minutes.
        </p>
      ) : (
        <form onSubmit={onSubmit} className="space-y-4" noValidate>
          <Field label="Email" error={form.formState.errors.email?.message}>
            <Input type="email" autoComplete="email" {...form.register('email')} />
          </Field>
          <ErrorBox message={error} />
          <Button type="submit" className="w-full" loading={form.formState.isSubmitting}>
            Send reset link
          </Button>
        </form>
      )}
      <p className="mt-5 text-center text-sm">
        <Link href="/login/" className="text-navy hover:underline">
          Back to sign in
        </Link>
      </p>
    </AuthShell>
  );
}
