'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';

function getAdminToken(): string | null {
  if (typeof window === 'undefined') return null;
  return localStorage.getItem('exspend_token'); // ✅ fixed key
}

function getIsAdmin(): boolean {
  if (typeof window === 'undefined') return false;
  const token = localStorage.getItem('exspend_token'); // ✅ fixed key
  if (!token) return false;
  try {
    const payload = JSON.parse(atob(token.split('.')[1]));
    return payload.isAdmin === true;
  } catch { return false; }
}

interface RateRecord {
  id: string;
  ghsPerUsd: number;
  setByAdmin: string;
  note: string | null;
  createdAt: string;
}

interface OrderStats {
  total: number;
  pending: number;
  volumeGhs: number;
}

const NAV_CARDS = [
  { href: '/admin/orders', emoji: '📋', label: 'Orders', desc: 'View and manage all customer orders' },
  { href: '/admin/users', emoji: '👥', label: 'Users', desc: 'Manage user accounts and KYC' },
  { href: '/admin/kyc', emoji: '🛡️', label: 'KYC', desc: 'Review identity verification requests' },
  { href: '/admin/rates', emoji: '💱', label: 'Exchange Rates', desc: 'Set GHS/USD rate and manage bundles' },
  { href: '/admin/help', emoji: '🎧', label: 'Help Tickets', desc: 'Respond to customer support tickets' },
];

export default function AdminDashboardPage() {
  const router = useRouter();
  const [userCount, setUserCount] = useState<number | null>(null);
  const [latestRate, setLatestRate] = useState<RateRecord | null>(null);
  const [orderStats, setOrderStats] = useState<OrderStats | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!getIsAdmin()) {
      router.replace('/spend');
      return;
    }
    const token = getAdminToken();
    const headers = { Authorization: `Bearer ${token}` };

    Promise.all([
      fetch('/api/admin/users', { headers }).then(r => r.json()).catch(() => null),
      fetch('/api/rates').then(r => r.json()).catch(() => null),
      fetch('/api/admin/orders', { headers }).then(r => r.json()).catch(() => null),
    ]).then(([usersData, ratesData, ordersData]) => {
      if (usersData?.users) setUserCount(usersData.users.length);
      if (ratesData?.rates?.[0]) setLatestRate(ratesData.rates[0]);
      if (ordersData?.orders) {
        const orders: { status: string; amountGhs: number }[] = ordersData.orders;
        setOrderStats({
          total: orders.length,
          pending: orders.filter(o => o.status === 'pending').length,
          volumeGhs: orders
            .filter(o => o.status === 'successful')
            .reduce((sum, o) => sum + (o.amountGhs ?? 0), 0),
        });
      }
      setLoading(false);
    });
  }, [router]);

  return (
    <div className="p-6">
      <h1 className="text-2xl font-bold text-gray-800 mb-1">Dashboard Overview</h1>
      <p className="text-sm text-gray-500 mb-6">Welcome back, Admin ⚡</p>

      <div className="grid grid-cols-2 lg:grid-cols-3 gap-4 mb-8">
        <div className="bg-white rounded-xl shadow-sm p-5 border border-gray-100">
          <p className="text-sm text-gray-500 mb-1">Total Users</p>
          <p className="text-3xl font-bold text-gray-800">
            {loading ? '…' : userCount ?? '—'}
          </p>
        </div>
        <div className="bg-white rounded-xl shadow-sm p-5 border border-gray-100">
          <p className="text-sm text-gray-500 mb-1">Current GHS/USD Rate</p>
          <p className="text-3xl font-bold text-green-700">
            {loading ? '…' : latestRate ? `GHS ${latestRate.ghsPerUsd.toFixed(2)}` : '—'}
          </p>
        </div>
        <div className="bg-white rounded-xl shadow-sm p-5 border border-gray-100">
          <p className="text-sm text-gray-500 mb-1">Rate Last Set By</p>
          <p className="text-sm font-semibold text-gray-800 mt-2 truncate">
            {loading ? '…' : latestRate ? latestRate.setByAdmin : '—'}
          </p>
          {latestRate && (
            <p className="text-xs text-gray-400 mt-1">
              {new Date(latestRate.createdAt).toLocaleString()}
            </p>
          )}
        </div>
        <div className="bg-white rounded-xl shadow-sm p-5 border border-gray-100">
          <p className="text-sm text-gray-500 mb-1">Total Orders</p>
          <p className="text-3xl font-bold text-gray-800">
            {loading ? '…' : orderStats?.total ?? '—'}
          </p>
        </div>
        <div className="bg-yellow-50 rounded-xl shadow-sm p-5 border border-yellow-100">
          <p className="text-sm text-yellow-700 mb-1">Pending Orders</p>
          <p className="text-3xl font-bold text-yellow-600">
            {loading ? '…' : orderStats?.pending ?? '—'}
          </p>
        </div>
        <div className="bg-white rounded-xl shadow-sm p-5 border border-gray-100">
          <p className="text-sm text-gray-500 mb-1">Total GHS Volume</p>
          <p className="text-3xl font-bold text-green-700">
            {loading ? '…' : orderStats ? `GHS ${orderStats.volumeGhs.toFixed(0)}` : '—'}
          </p>
        </div>
      </div>

      <h2 className="text-lg font-semibold text-gray-700 mb-4">Admin Sections</h2>
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
        {NAV_CARDS.map(({ href, emoji, label, desc }) => (
          <Link
            key={href}
            href={href}
            className="bg-white rounded-xl shadow-sm border border-gray-100 p-5 flex items-start gap-4 hover:border-green-300 hover:shadow-md transition-all group"
          >
            <span className="text-3xl">{emoji}</span>
            <div>
              <p className="font-semibold text-gray-800 group-hover:text-green-700 transition-colors">{label}</p>
              <p className="text-sm text-gray-500 mt-0.5">{desc}</p>
            </div>
          </Link>
        ))}
      </div>
    </div>
  );
}