'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';

type OrderStatus = 'pending' | 'processing' | 'successful' | 'failed' | 'cancelled';
type FilterTab = 'all' | OrderStatus;

type Order = {
  id: string;
  service: string;
  serviceType: string;
  recipient?: string | null;
  recipientName?: string | null;
  bankName?: string | null;
  amountGhs: number;
  cryptoAsset: string;
  cryptoAmount: string;
  cryptoRateGhs: number;
  reference?: string | null;
  bundleLabel?: string | null;
  status: OrderStatus;
  adminNote?: string | null;
  createdAt: string;
  orderType: string;
  // Payment method fields (for buy orders)
  paymentMethod?: string | null;
  paymentBankName?: string | null;
  paymentBankAcct?: string | null;
  paymentAcctName?: string | null;
  paymentMomoProvider?: string | null;
  paymentMomoNumber?: string | null;
  user?: { name: string; email: string };
};

const STATUS_COLORS: Record<OrderStatus, string> = {
  pending: 'bg-yellow-100 text-yellow-800',
  processing: 'bg-blue-100 text-blue-800',
  successful: 'bg-green-100 text-green-800',
  failed: 'bg-red-100 text-red-800',
  cancelled: 'bg-gray-100 text-gray-600',
};

function getToken() {
  if (typeof window === 'undefined') return null;
  return localStorage.getItem('exspend_token');
}

function authHeaders() {
  const token = getToken();
  return {
    'Content-Type': 'application/json',
    Authorization: `Bearer ${token}`,
  };
}

export default function AdminOrdersPage() {
  const [orders, setOrders] = useState<Order[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [filter, setFilter] = useState<FilterTab>('all');
  const [sortField, setSortField] = useState<keyof Order>('createdAt');
  const [sortDir, setSortDir] = useState<'asc' | 'desc'>('desc');
  const [noteInputs, setNoteInputs] = useState<Record<string, string>>({});
  const [expandedNotes, setExpandedNotes] = useState<Record<string, boolean>>({});
  const [savingNote, setSavingNote] = useState<Record<string, boolean>>({});

  async function loadOrders() {
    setLoading(true);
    try {
      const res = await fetch('/api/admin/orders', { headers: authHeaders() });
      const data = await res.json();
      setOrders(data.orders ?? []);
    } catch {
      setOrders([]);
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => { loadOrders(); }, []);

  async function handleStatusChange(id: string, status: OrderStatus) {
    await fetch(`/api/admin/orders/${id}`, {
      method: 'PATCH',
      headers: authHeaders(),
      body: JSON.stringify({ status }),
    });
    loadOrders();
  }

  async function markAllPendingSuccessful() {
    const pending = orders.filter(o => o.status === 'pending');
    await Promise.all(
      pending.map(o =>
        fetch(`/api/admin/orders/${o.id}`, {
          method: 'PATCH',
          headers: authHeaders(),
          body: JSON.stringify({ status: 'successful' }),
        })
      )
    );
    loadOrders();
  }

  function toggleSort(field: keyof Order) {
    if (sortField === field) {
      setSortDir(d => (d === 'asc' ? 'desc' : 'asc'));
    } else {
      setSortField(field);
      setSortDir('asc');
    }
  }

  async function handleSaveNote(id: string) {
    const adminNote = noteInputs[id] ?? '';
    setSavingNote(prev => ({ ...prev, [id]: true }));
    try {
      const res = await fetch(`/api/admin/orders/${id}`, {
        method: 'PATCH',
        headers: authHeaders(),
        body: JSON.stringify({ adminNote }),
      });
      if (!res.ok) throw new Error('Failed to save note');
      setExpandedNotes(prev => ({ ...prev, [id]: false }));
      loadOrders();
    } catch {
      alert('Failed to save note. Please try again.');
    } finally {
      setSavingNote(prev => ({ ...prev, [id]: false }));
    }
  }

  const filtered = orders
    .filter(o => {
      if (filter !== 'all' && o.status !== filter) return false;
      if (search) {
        const q = search.toLowerCase();
        return (
          (o.recipient ?? '').toLowerCase().includes(q) ||
          o.service.toLowerCase().includes(q) ||
          (o.user?.name ?? '').toLowerCase().includes(q) ||
          (o.user?.email ?? '').toLowerCase().includes(q)
        );
      }
      return true;
    })
    .sort((a, b) => {
      const av = a[sortField] ?? '';
      const bv = b[sortField] ?? '';
      const cmp = String(av).localeCompare(String(bv));
      return sortDir === 'asc' ? cmp : -cmp;
    });

  const tabs: { label: string; value: FilterTab }[] = [
    { label: 'All', value: 'all' },
    { label: 'Pending', value: 'pending' },
    { label: 'Processing', value: 'processing' },
    { label: 'Successful', value: 'successful' },
    { label: 'Failed', value: 'failed' },
  ];

  function SortIcon({ field }: { field: keyof Order }) {
    if (sortField !== field) return <span className="ml-1 text-gray-300">↕</span>;
    return <span className="ml-1">{sortDir === 'asc' ? '↑' : '↓'}</span>;
  }

  return (
    <div className="p-6">
      <div className="flex items-center justify-between mb-6">
        <h1 className="text-2xl font-bold text-gray-800">Orders Management</h1>
        <div className="flex gap-2">
          <button
            onClick={loadOrders}
            className="px-4 py-2 bg-gray-100 text-gray-700 rounded-lg text-sm font-medium hover:bg-gray-200 transition-colors"
          >
            🔄 Refresh
          </button>
          <button
            onClick={markAllPendingSuccessful}
            className="px-4 py-2 bg-green-600 text-white rounded-lg text-sm font-medium hover:bg-green-700 transition-colors"
          >
            Mark all pending as successful
          </button>
        </div>
      </div>

      <input
        type="text"
        placeholder="Search by recipient, service, or user…"
        value={search}
        onChange={e => setSearch(e.target.value)}
        className="w-full mb-4 px-4 py-2 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-green-500"
      />

      <div className="flex gap-2 mb-4">
        {tabs.map(t => (
          <button
            key={t.value}
            onClick={() => setFilter(t.value)}
            className={`px-3 py-1.5 rounded-lg text-sm font-medium transition-colors ${
              filter === t.value
                ? 'bg-green-600 text-white'
                : 'bg-white border border-gray-200 text-gray-600 hover:bg-gray-50'
            }`}
          >
            {t.label}
          </button>
        ))}
      </div>

      <div className="bg-white rounded-xl shadow-sm border border-gray-100 overflow-hidden">
        <div className="overflow-x-auto">
          {loading ? (
            <div className="px-4 py-12 text-center text-gray-400">Loading orders…</div>
          ) : (
            <table className="w-full text-sm">
              <thead className="bg-gray-50 text-gray-500 uppercase text-xs">
                <tr>
                  {(
                    [
                      { label: 'Date/Time', field: 'createdAt' },
                      { label: 'Customer', field: 'user' },
                      { label: 'Service', field: 'service' },
                      { label: 'Recipient', field: 'recipient' },
                      { label: 'Amount (GHS)', field: 'amountGhs' },
                      { label: 'Crypto', field: 'cryptoAsset' },
                      { label: 'Crypto Amt', field: 'cryptoAmount' },
                      { label: 'Status', field: 'status' },
                      { label: 'Note', field: 'adminNote' },
                    ] as { label: string; field: keyof Order }[]
                  ).map(col => (
                    <th
                      key={col.field}
                      className="px-4 py-3 text-left cursor-pointer select-none hover:bg-gray-100"
                      onClick={() => toggleSort(col.field)}
                    >
                      {col.label}
                      <SortIcon field={col.field} />
                    </th>
                  ))}
                  <th className="px-4 py-3 text-left">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100">
                {filtered.length === 0 ? (
                  <tr>
                    <td colSpan={10} className="px-4 py-8 text-center text-gray-400">
                      No orders found
                    </td>
                  </tr>
                ) : (
                  filtered.map(order => (
                    <tr key={order.id} className="hover:bg-gray-50">
                      <td className="px-4 py-3 whitespace-nowrap text-gray-600">
                        {new Date(order.createdAt).toLocaleString()}
                      </td>
                      <td className="px-4 py-3">
                        <p className="font-medium text-gray-800">{order.user?.name ?? '—'}</p>
                        <p className="text-xs text-gray-400">{order.user?.email ?? ''}</p>
                      </td>
                      <td className="px-4 py-3 text-gray-800">{order.service}</td>
                      <td className="px-4 py-3">
                        {/* Recipient: account number + account holder name together */}
                        {order.serviceType === 'bank' ? (
                          <div className="space-y-0.5">
                            {order.bankName && (
                              <p className="text-xs font-semibold text-gray-600 uppercase tracking-wide">{order.bankName}</p>
                            )}
                            {order.recipient && (
                              <p className="font-mono text-sm text-gray-800">{order.recipient}</p>
                            )}
                            {order.recipientName && (
                              <p className="text-xs text-gray-500">({order.recipientName})</p>
                            )}
                            {!order.recipient && !order.recipientName && <span className="text-gray-400">—</span>}
                          </div>
                        ) : order.serviceType === 'momo' ? (
                          <div className="space-y-0.5">
                            {order.bankName && (
                              <span className="inline-block text-xs font-semibold bg-yellow-100 text-yellow-800 px-1.5 py-0.5 rounded">{order.bankName}</span>
                            )}
                            {order.recipient && (
                              <p className="font-mono text-sm text-gray-800">{order.recipient}</p>
                            )}
                            {order.recipientName && (
                              <p className="text-xs text-gray-500">({order.recipientName})</p>
                            )}
                            {!order.recipient && !order.recipientName && <span className="text-gray-400">—</span>}
                          </div>
                        ) : order.orderType === 'buy' && order.paymentMethod ? (
                          <div className="space-y-0.5">
                            <span className={`inline-block text-xs font-semibold px-1.5 py-0.5 rounded ${
                              order.paymentMethod === 'bank' ? 'bg-blue-100 text-blue-800' : 'bg-orange-100 text-orange-800'
                            }`}>
                              {order.paymentMethod === 'bank' ? '🏦 Bank' : '📱 MoMo'}
                            </span>
                            {order.paymentMethod === 'bank' ? (
                              <>
                                {order.paymentBankName && <p className="text-xs text-gray-600">{order.paymentBankName}</p>}
                                {order.paymentBankAcct && <p className="font-mono text-sm text-gray-800">{order.paymentBankAcct}</p>}
                                {order.paymentAcctName && <p className="text-xs text-gray-500">({order.paymentAcctName})</p>}
                              </>
                            ) : (
                              <>
                                {order.paymentMomoProvider && <p className="text-xs text-gray-600">{order.paymentMomoProvider}</p>}
                                {order.paymentMomoNumber && <p className="font-mono text-sm text-gray-800">{order.paymentMomoNumber}</p>}
                                {order.paymentAcctName && <p className="text-xs text-gray-500">({order.paymentAcctName})</p>}
                              </>
                            )}
                          </div>
                        ) : (
                          <span className="text-gray-800">
                            {order.recipient
                              ? order.recipientName
                                ? `${order.recipient} (${order.recipientName})`
                                : order.recipient
                              : '—'}
                          </span>
                        )}
                      </td>
                      <td className="px-4 py-3 text-gray-800">{order.amountGhs.toFixed(2)}</td>
                      <td className="px-4 py-3 text-gray-800">{order.cryptoAsset}</td>
                      <td className="px-4 py-3 text-gray-800">{order.cryptoAmount}</td>
                      <td className="px-4 py-3">
                        <span className={`px-2 py-1 rounded-full text-xs font-medium capitalize ${STATUS_COLORS[order.status]}`}>
                          {order.status}
                        </span>
                      </td>
                      <td className="px-4 py-3 max-w-[160px]">
                        {order.adminNote && !expandedNotes[order.id] && (
                          <p className="text-xs text-gray-500 truncate mb-1" title={order.adminNote}>
                            {order.adminNote}
                          </p>
                        )}
                        {expandedNotes[order.id] ? (
                          <div className="flex flex-col gap-1">
                            <textarea
                              value={noteInputs[order.id] ?? order.adminNote ?? ''}
                              onChange={e => setNoteInputs(prev => ({ ...prev, [order.id]: e.target.value }))}
                              rows={2}
                              className="text-xs border border-gray-200 rounded px-2 py-1 w-full focus:outline-none focus:ring-1 focus:ring-green-500"
                              placeholder="Add a note…"
                            />
                            <div className="flex gap-1">
                              <button
                                onClick={() => handleSaveNote(order.id)}
                                disabled={savingNote[order.id]}
                                className="text-xs px-2 py-1 bg-green-600 text-white rounded hover:bg-green-700 disabled:opacity-60"
                              >
                                {savingNote[order.id] ? 'Saving…' : 'Save'}
                              </button>
                              <button
                                onClick={() => setExpandedNotes(prev => ({ ...prev, [order.id]: false }))}
                                className="text-xs px-2 py-1 border border-gray-200 text-gray-600 rounded hover:bg-gray-50"
                              >
                                Cancel
                              </button>
                            </div>
                          </div>
                        ) : (
                          <button
                            onClick={() => {
                              setNoteInputs(prev => ({ ...prev, [order.id]: order.adminNote ?? '' }));
                              setExpandedNotes(prev => ({ ...prev, [order.id]: true }));
                            }}
                            className="text-xs text-green-700 hover:underline"
                          >
                            {order.adminNote ? 'Edit note' : 'Add note'}
                          </button>
                        )}
                      </td>
                      <td className="px-4 py-3">
                        <div className="flex flex-col gap-1">
                          <select
                            value={order.status}
                            onChange={e => handleStatusChange(order.id, e.target.value as OrderStatus)}
                            className="text-xs border border-gray-200 rounded px-2 py-1 bg-white focus:outline-none focus:ring-1 focus:ring-green-500"
                          >
                            <option value="pending">Pending</option>
                            <option value="processing">Processing</option>
                            <option value="successful">Successful</option>
                            <option value="failed">Failed</option>
                            <option value="cancelled">Cancelled</option>
                          </select>
                          <Link
                            href={`/admin/orders/${order.id}`}
                            className="text-xs text-green-700 hover:underline whitespace-nowrap"
                          >
                            💬 View &amp; Chat
                          </Link>
                        </div>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          )}
        </div>
      </div>
    </div>
  );
}