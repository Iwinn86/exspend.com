'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import { getToken } from '@/app/lib/auth';

type OrderType = 'spend' | 'buy' | 'sell';
type OrderStatus = 'waiting' | 'pending' | 'processing' | 'successful' | 'failed' | 'cancelled';

type Tab = 'all' | 'pending' | 'successful' | 'failed' | 'waiting';

type ApiOrder = {
  id: string;
  orderType: OrderType;
  service: string;
  amountGhs: number;
  cryptoAmount: number | null;
  cryptoAsset: string | null;
  status: OrderStatus;
  createdAt: string;
  recipient?: string | null;
  recipientName?: string | null;
};

const tabs: { id: Tab; label: string }[] = [
  { id: 'all', label: 'All' },
  { id: 'waiting', label: 'Waiting' },
  { id: 'pending', label: 'Pending' },
  { id: 'successful', label: 'Successful' },
  { id: 'failed', label: 'Failed / Cancelled' },
];

const ORDER_TYPE_ICON: Record<OrderType, string> = {
  spend: '💳',
  buy: '📈',
  sell: '📉',
};

const ORDER_TYPE_LABEL: Record<OrderType, string> = {
  spend: 'Spend',
  buy: 'Buy',
  sell: 'Sell',
};

const STATUS_BADGE: Record<OrderStatus, string> = {
  waiting: 'bg-orange-100 text-orange-800',
  pending: 'bg-yellow-100 text-yellow-800',
  processing: 'bg-blue-100 text-blue-800',
  successful: 'bg-green-100 text-green-800',
  failed: 'bg-red-100 text-red-800',
  cancelled: 'bg-gray-100 text-gray-600',
};

const BORDER_COLOR: Record<OrderStatus, string> = {
  waiting: 'border-orange-400',
  pending: 'border-yellow-400',
  processing: 'border-blue-400',
  successful: 'border-green-500',
  failed: 'border-red-400',
  cancelled: 'border-gray-300',
};

const ORDER_TYPE_BADGE: Record<OrderType, string> = {
  spend: 'bg-purple-100 text-purple-800',
  buy: 'bg-lime-100 text-lime-800',
  sell: 'bg-orange-100 text-orange-800',
};

function formatDate(iso: string) {
  return new Date(iso).toLocaleString('en-GB', {
    day: 'numeric',
    month: 'short',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  });
}

function isFailedOrCancelled(status: OrderStatus) {
  return status === 'failed' || status === 'cancelled';
}

const PAGE_SIZE = 10;

export default function OrdersPage() {
  const [activeTab, setActiveTab] = useState<Tab>('all');
  const [orders, setOrders] = useState<ApiOrder[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [token, setToken] = useState<string | null>(null);
  const [currentPage, setCurrentPage] = useState(1);

  useEffect(() => {
    const t = getToken();
    setToken(t);
    if (!t) {
      setLoading(false);
      return;
    }
    fetch('/api/orders', {
      headers: { Authorization: `Bearer ${t}` },
    })
      .then((res) => {
        if (!res.ok) throw new Error('Failed to fetch orders');
        return res.json();
      })
      .then((data) => setOrders(data.orders ?? []))
      .catch(() => setError('Failed to load orders. Please try again.'))
      .finally(() => setLoading(false));
  }, []);

  const filtered =
    activeTab === 'all'
      ? orders
      : activeTab === 'failed'
      ? orders.filter((o) => isFailedOrCancelled(o.status))
      : orders.filter((o) => o.status === activeTab);

  const totalPages = Math.max(1, Math.ceil(filtered.length / PAGE_SIZE));
  const paged = filtered.slice((currentPage - 1) * PAGE_SIZE, currentPage * PAGE_SIZE);

  if (!token && !loading) {
    return (
      <div className="bg-green-50 rounded-2xl p-10 shadow-sm text-center">
        <span className="text-4xl block mb-3">🔒</span>
        <p className="text-green-900 font-semibold text-lg mb-2">Please log in to view your orders</p>
        <Link href="/login" className="text-green-700 underline text-sm hover:text-green-900">
          Go to Login →
        </Link>
      </div>
    );
  }

  return (
    <div className="bg-green-50 rounded-2xl p-6 md:p-10 shadow-sm">
      <h1 className="text-green-900 text-2xl md:text-3xl font-bold mb-1">My Orders</h1>
      <p className="text-gray-500 mb-6 text-sm">Track all your Exspend transactions</p>

      {/* Tabs */}
      <div className="flex gap-1 mb-6 overflow-x-auto flex-wrap">
        {tabs.map(({ id, label }) => (
          <button
            key={id}
            onClick={() => { setActiveTab(id); setCurrentPage(1); }}
            className={`px-4 py-1 text-sm font-medium whitespace-nowrap transition-colors rounded-full ${
              activeTab === id
                ? 'bg-green-700 text-white'
                : 'text-green-800 hover:bg-green-100'
            }`}
          >
            {label}
            {id === 'all' && orders.length > 0 && (
              <span className="ml-1.5 bg-green-200 text-green-900 text-xs rounded-full px-1.5 py-0.5">
                {orders.length}
              </span>
            )}
          </button>
        ))}
      </div>

      {/* Content */}
      {loading ? (
        <div className="flex flex-col items-center justify-center py-16 text-gray-400">
          <span className="text-4xl mb-3 animate-spin">⏳</span>
          <p className="text-sm">Loading your orders…</p>
        </div>
      ) : error ? (
        <div className="bg-red-50 border border-red-200 rounded-xl px-5 py-4 text-red-600 text-sm text-center">
          {error}
        </div>
      ) : filtered.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-16 text-center text-gray-500">
          <span className="text-5xl mb-4">📭</span>
          <p className="text-lg font-medium text-green-800">No orders here yet</p>
          <p className="text-sm mt-1 text-gray-400">
            {activeTab === 'all' && 'Your transactions will appear here.'}
            {activeTab === 'waiting' && 'No orders waiting for crypto.'}
            {activeTab === 'pending' && 'No pending transactions.'}
            {activeTab === 'successful' && 'No successful transactions yet.'}
            {activeTab === 'failed' && 'No failed or cancelled transactions.'}
          </p>
        </div>
      ) : (
        <div className="flex flex-col gap-3">
          {paged.map((order) => (
            <div
              key={order.id}
              className={`bg-white rounded-xl shadow-sm p-4 border-l-4 ${BORDER_COLOR[order.status]}`}
            >
              <div className="flex items-start justify-between mb-2 gap-2">
                <div className="flex items-center gap-2 flex-wrap">
                  <span className="text-xl">{ORDER_TYPE_ICON[order.orderType]}</span>
                  <span className="font-semibold text-gray-800 text-sm">{order.service}</span>
                  <span
                    className={`text-xs font-semibold px-2 py-0.5 rounded-full uppercase ${ORDER_TYPE_BADGE[order.orderType]}`}
                  >
                    {ORDER_TYPE_LABEL[order.orderType]}
                  </span>
                </div>
                <span
                  className={`text-xs font-semibold px-2 py-0.5 rounded-full uppercase whitespace-nowrap ${STATUS_BADGE[order.status]}`}
                >
                  {order.status}
                </span>
              </div>

              <div className="text-sm text-gray-600 flex flex-col gap-0.5">
                <p>
                  <span className="font-medium">Amount:</span> GHS{' '}
                  {typeof order.amountGhs === 'number'
                    ? order.amountGhs.toFixed(2)
                    : order.amountGhs}
                </p>
                {order.cryptoAmount != null && order.cryptoAsset && (
                  <p>
                    <span className="font-medium">Crypto:</span> {order.cryptoAmount}{' '}
                    {order.cryptoAsset}
                  </p>
                )}
                {order.recipient && (
                  <p>
                    <span className="font-medium">Recipient:</span> {order.recipient}
                    {order.recipientName ? ` (${order.recipientName})` : ''}
                  </p>
                )}
                <p className="text-gray-400 text-xs mt-1">📅 {formatDate(order.createdAt)}</p>
              </div>

              <div className="mt-3 flex gap-2 flex-wrap">
                <Link
                  href={`/orders/${order.id}`}
                  className="inline-block text-xs font-semibold text-green-700 border border-green-400 hover:bg-green-50 px-3 py-1 rounded-lg transition-colors"
                >
                  View Details →
                </Link>
              </div>
            </div>
          ))}
        </div>
      )}

      {totalPages > 1 && (
        <div className="flex items-center justify-center gap-3 mt-6">
          <button
            onClick={() => setCurrentPage(p => Math.max(1, p - 1))}
            disabled={currentPage === 1}
            className="px-3 py-1.5 text-sm border border-gray-300 rounded-lg disabled:opacity-40 hover:bg-gray-50 transition-colors"
          >
            ← Prev
          </button>
          <span className="text-sm text-gray-600">Page {currentPage} of {totalPages}</span>
          <button
            onClick={() => setCurrentPage(p => Math.min(totalPages, p + 1))}
            disabled={currentPage === totalPages}
            className="px-3 py-1.5 text-sm border border-gray-300 rounded-lg disabled:opacity-40 hover:bg-gray-50 transition-colors"
          >
            Next →
          </button>
        </div>
      )}
    </div>
  );
}
