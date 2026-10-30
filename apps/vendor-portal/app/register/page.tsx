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
import { passwordRule } from '../../lib/validation';

const schema = z
  .object({
    displayName: z.string().trim().min(2, 'Enter your name').max(80),
    email: z.string().trim().email('Enter a valid email'),
    password: passwordRule,
    confirm: z.string(),
  })
  .refine((v) => v.password === v.confirm, {
    path: ['confirm'],
    message: 'Passwords do not match',
  });

export default function RegisterPage() {
  const router = useRouter();
  const [error, setError] = useState<string | null>(null);
  const form = useForm<z.infer<typeof schema>>({ resolver: zodResolver(schema) });
  const { errors, isSubmitting } = form.formState;

  const onSubmit = form.handleSubmit(async ({ displayName, email, password }) => {
    setError(null);
    try {
      tokens.save(
        must(
          await api.POST('/v1/auth/portal/register', { body: { displayName, email, password } }),
        ),
      );
      router.replace('/onboarding/');
    } catch (e) {
      setError(errorMessage(e));
    }
  });

  return (
    <AuthShell
      title="Become a partner"
      subtitle="List your dharamshala, cabs, restaurant or experiences."
    >
      <form onSubmit={onSubmit} className="space-y-4" noValidate>
        <Field label="Your name" error={errors.displayName?.message}>
          <Input autoComplete="name" {...form.register('displayName')} />
        </Field>
        <Field label="Email" error={errors.email?.message}>
          <Input type="email" autoComplete="email" {...form.register('email')} />
        </Field>
        <Field
          label="Password"
          error={errors.password?.message}
          hint="10+ characters with a letter and a number"
        >
          <Input type="password" autoComplete="new-password" {...form.register('password')} />
        </Field>
        <Field label="Confirm password" error={errors.confirm?.message}>
          <Input type="password" autoComplete="new-password" {...form.register('confirm')} />
        </Field>
        <ErrorBox message={error} />
        <Button type="submit" className="w-full" loading={isSubmitting}>
          Create account
        </Button>
      </form>
      <p className="mt-5 text-center text-sm text-muted">
        Already a partner?{' '}
        <Link href="/login/" className="font-semibold text-navy hover:underline">
          Sign in
        </Link>
      </p>
    </AuthShell>
  );
}
