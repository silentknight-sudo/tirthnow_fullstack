'use client';

import { useRouter } from 'next/navigation';
import { useEffect } from 'react';
import { Spinner } from '../components/ui';
import { tokens } from '../lib/api';

export default function Index() {
  const router = useRouter();
  useEffect(() => {
    router.replace(tokens.user() ? '/dashboard/' : '/login/');
  }, [router]);
  return <Spinner />;
}
