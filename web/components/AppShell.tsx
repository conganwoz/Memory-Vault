'use client';

import { useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/lib/auth-context';
import SplashScreen from './SplashScreen';

/**
 * Auth gate for authenticated pages: shows the splash while the stored JWT is
 * being validated, then redirects to /login if there is no session.
 */
export default function AppShell({ children }: { children: React.ReactNode }) {
  const { user, loading } = useAuth();
  const router = useRouter();

  useEffect(() => {
    if (!loading && !user) {
      router.replace('/login');
    }
  }, [loading, user, router]);

  if (loading) return <SplashScreen />;
  if (!user) return <SplashScreen />;

  return <>{children}</>;
}
