'use client';

import { zodResolver } from '@hookform/resolvers/zod';
import Link from 'next/link';
import { useState } from 'react';
import { useForm } from 'react-hook-form';
import { z } from 'zod';
import { AuthShell } from '../../components/auth-shell';
import { Button, ErrorBox, Field, Input } from '../../components/ui';
import { api, errorMessage } from '../../lib/api';
import { passwordRule } from '../../lib/validation';

const schema = z
  .object({ password: passwordRule, confirm: z.string() })
  .refine((v) => v.password === v.confirm, {
    path: ['confirm'],
    message: 'Passwords do not match',
  });

export default function ResetPasswordPage() {
  const [done, setDone] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const form = useForm<z.infer<typeof schema>>({ resolver: zodResolver(schema) });

  const onSubmit = form.handleSubmit(async ({ password }) => {
    setError(null);
    const token = new URLSearchParams(window.location.search).get('token') ?? '';
    try {
      await api.POST('/v1/auth/portal/password/reset', { body: { token, password } });
      setDone(true);
    } catch (e) {
      setError(errorMessage(e));
    }
  });

  return (
    <AuthShell title="Choose a new password">
      {done ? (
        <p className="text-sm">
          Password updated.{' '}
          <Link href="/login/" className="font-semibold text-navy hover:underline">
            Sign in
          </Link>
        </p>
      ) : (
        <form onSubmit={onSubmit} className="space-y-4" noValidate>
          <Field label="New password" error={form.formState.errors.password?.message}>
            <Input type="password" autoComplete="new-password" {...form.register('password')} />
          </Field>
          <Field label="Confirm password" error={form.formState.errors.confirm?.message}>
            <Input type="password" autoComplete="new-password" {...form.register('confirm')} />
          </Field>
          <ErrorBox message={error} />
          <Button type="submit" className="w-full" loading={form.formState.isSubmitting}>
            Update password
          </Button>
        </form>
      )}
    </AuthShell>
  );
}
