'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { getCurrentUser, ADMIN_EMAIL } from '@/app/lib/auth';
import AdminSidebar from './components/AdminSidebar';

export default function AdminLayout({ children }: { children: React.ReactNode }) {
  const router = useRouter();
  const [checked, setChecked] = useState(false);
  const [isAdmin, setIsAdmin] = useState(false);

  useEffect(() => {
    const user = getCurrentUser();

    if (!user) {
      router.replace('/login');
      return;
    }
    if (user.email !== ADMIN_EMAIL) {
      router.replace('/spend');
      return;
    }
    setIsAdmin(true);
    setChecked(true);
  }, [router]);

  if (!checked || !isAdmin) {
    return (
      <div className="flex min-h-screen items-center justify-center">
        <p className="text-gray-400 text-sm">Checking access...</p>
      </div>
    );
  }

  return (
    <div className="flex min-h-screen bg-gray-50">
      <AdminSidebar />
      <main className="flex-1 overflow-auto">{children}</main>
    </div>
  );
}