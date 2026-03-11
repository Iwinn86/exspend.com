'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { LayoutDashboard, ClipboardList, Users, RefreshCw, ArrowLeft, ShieldCheck, Wallet, CreditCard, Gift } from 'lucide-react';
import AdminNotificationBell from '@/app/components/AdminNotificationBell';

const navItems = [
  { icon: LayoutDashboard, label: 'Dashboard', href: '/admin' },
  { icon: ClipboardList, label: 'Orders', href: '/admin/orders' },
  { icon: Users, label: 'Users', href: '/admin/users' },
  { icon: ShieldCheck, label: 'KYC', href: '/admin/kyc' },
  { icon: Gift, label: 'Referrals', href: '/admin/referrals' },
  { icon: RefreshCw, label: 'Exchange Rates', href: '/admin/rates' },
  { icon: Wallet, label: 'Wallets', href: '/admin/wallets' },
  { icon: CreditCard, label: 'Payment Methods', href: '/admin/settings/payment' },
];

export default function AdminSidebar() {
  const pathname = usePathname();

  return (
    <>
      {/* Desktop sidebar */}
      <aside className="hidden md:flex flex-col w-56 bg-green-900 text-white min-h-screen flex-shrink-0">
        <div className="px-5 py-6 border-b border-green-800">
          <span className="text-xl font-bold">⚡ Exspend Admin</span>
        </div>
        <nav className="flex flex-col gap-1 px-3 py-4 flex-1">
          {navItems.map(({ icon: Icon, label, href }) => {
            const active = pathname === href;
            return (
              <Link
                key={href}
                href={href}
                className={`flex items-center gap-3 px-3 py-2 rounded-lg text-sm font-medium transition-colors ${
                  active
                    ? 'bg-green-700 text-lime-400'
                    : 'text-white hover:bg-green-800 hover:text-lime-400'
                }`}
              >
                <Icon size={18} />
                {label}
              </Link>
            );
          })}
        </nav>
        <div className="px-3 py-4 border-t border-green-800">
          <AdminNotificationBell />
          <Link
            href="/spend"
            className="flex items-center gap-3 px-3 py-2 rounded-lg text-sm font-medium text-white hover:bg-green-800 hover:text-lime-400 transition-colors"
          >
            <ArrowLeft size={18} />
            Back to App
          </Link>
        </div>
      </aside>

      {/* Mobile top tab nav */}
      <div className="md:hidden bg-green-900 text-white">
        <div className="flex items-center justify-between px-4 py-3 border-b border-green-800">
          <span className="text-lg font-bold">⚡ Exspend Admin</span>
          <div className="flex items-center gap-2">
            <AdminNotificationBell />
            <Link href="/spend" className="flex items-center gap-1 text-xs text-lime-400 hover:text-lime-300">
              <ArrowLeft size={14} />
              Back
            </Link>
          </div>
        </div>
        <div className="flex overflow-x-auto gap-1 px-3 py-2">
          {navItems.map(({ icon: Icon, label, href }) => {
            const active = pathname === href;
            return (
              <Link
                key={href}
                href={href}
                className={`flex items-center gap-1 px-3 py-1.5 rounded-lg text-xs font-medium whitespace-nowrap transition-colors ${
                  active
                    ? 'bg-green-700 text-lime-400'
                    : 'text-white hover:bg-green-800'
                }`}
              >
                <Icon size={14} />
                {label}
              </Link>
            );
          })}
        </div>
      </div>
    </>
  );
}
