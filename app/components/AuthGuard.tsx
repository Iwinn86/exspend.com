'use client';
import { useEffect, useState, useMemo } from 'react';
import { useRouter, usePathname } from 'next/navigation';
import { getCurrentUser } from '@/app/lib/auth';

const PUBLIC_PATHS = ['/login', '/signup', '/forgot-password', '/reset-password', '/policies'];

export default function AuthGuard({ children }: { children: React.ReactNode }) {
  const router = useRouter();
  const pathname = usePathname();
  const [mounted, setMounted] = useState(false);
  const [user, setUser] = useState<ReturnType<typeof getCurrentUser>>(null);

  useEffect(() => {
    setUser(getCurrentUser());
    setMounted(true);
  }, [pathname]);

  const isPublic = useMemo(
    () => PUBLIC_PATHS.some((p) => pathname === p || pathname.startsWith(p + '/')),
    [pathname],
  );

  useEffect(() => {
    if (mounted && !user && !isPublic) {
      router.replace('/login');
    }
  }, [mounted, user, isPublic, router]);

  if (!mounted) {
    return null;
  }

  if (!user && !isPublic) {
    return null;
  }

  return <>{children}</>;
}
