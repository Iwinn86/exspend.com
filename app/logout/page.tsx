'use client';
import { useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { logout } from '@/app/lib/auth';

export default function LogoutPage() {
  const router = useRouter();

  useEffect(() => {
    logout();
    router.replace('/login');
  }, [router]);

  return (
    <div className="flex items-center justify-center min-h-[60vh]">
      <p className="text-green-800 text-lg">Logging you out...</p>
    </div>
  );
}