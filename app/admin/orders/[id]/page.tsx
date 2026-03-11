'use client';

import { useEffect, useState, useCallback } from 'react';
import { useParams } from 'next/navigation';
import Link from 'next/link';
import OrderChat from '@/app/components/OrderChat';

type OrderStatus = 'pending' | 'processing' | 'successful' | 'failed' | 'cancelled';

type Order = {
  id: string;
  orderType: string;
  service: string;
  serviceType: string;
  status: OrderStatus;
  amountGhs: number;
  cryptoAsset: string;
  cryptoAmount: string;
  cryptoRateGhs: number;
  recipient?: string | null;
  recipientName?: string | null;
  bankName?: string | null;
  reference?: string | null;
  bundleLabel?: string | null;
  adminNote?: string | null;
  userWalletAddress?: string | null;
  paymentMethod?: string | null;
  paymentBankName?: string | null;
  paymentBankAcct?: string | null;
  paymentAcctName?: string | null;
  paymentMomoProvider?: string | null;
  paymentMomoNumber?: string | null;
  createdAt: string;
  updatedAt: string;
  user: { name: string; email: string; phone: string };
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
  return { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` };
}

function DetailRow({ label, value }: { label: string; value: React.ReactNode }) {
  return (
    <div className="flex justify-between items-start gap-2 py-2 border-b border-gray-100 last:border-0">
      <span className="text-sm font-medium text-gray-500 shrink-0">{label}</span>
      <span className="text-sm text-gray-800 text-right">{value}</span>
    </div>
  );
}

export default function AdminOrderDetailPage() {
  const params = useParams();
  const orderId = params?.id as string;

  const [order, setOrder] = useState<Order | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [updatingStatus, setUpdatingStatus] = useState(false);
  const [noteValue, setNoteValue] = useState('');
  const [savingNote, setSavingNote] = useState(false);

  const loadOrder = useCallback(async () => {
    try {
      const res = await fetch(`/api/admin/orders/${orderId}`, { headers: authHeaders() });
      if (!res.ok) throw new Error('Not found');
      const data = await res.json();
      const o = data.order ?? data;
      setOrder(o);
      setNoteValue(o.adminNote ?? '');
    } catch {
      setError('Order not found or access denied.');
    } finally {
      setLoading(false);
    }
  }, [orderId]);

  useEffect(() => { loadOrder(); }, [loadOrder]);

  async function handleStatusChange(status: OrderStatus) {
    if (!order) return;
    setUpdatingStatus(true);
    try {
      await fetch(`/api/admin/orders/${order.id}`, {
        method: 'PATCH',
        headers: authHeaders(),
        body: JSON.stringify({ status }),
      });
      await loadOrder();
    } finally {
      setUpdatingStatus(false);
    }
  }

  async function handleSaveNote() {
    if (!order) return;
    setSavingNote(true);
    try {
      await fetch(`/api/admin/orders/${order.id}`, {
        method: 'PATCH',
        headers: authHeaders(),
        body: JSON.stringify({ status: order.status, adminNote: noteValue }),
      });
      await loadOrder();
    } finally {
      setSavingNote(false);
    }
  }

  if (loading) return <div className="p-6 text-gray-400">Loading order…</div>;
  if (error || !order) return (
    <div className="p-6">
      <p className="text-red-600 mb-3">{error}</p>
      <Link href="/admin/orders" className="text-green-700 hover:underline text-sm">← Back to Orders</Link>
    </div>
  );

  return (
    <div className="p-6 max-w-4xl">
      <div className="flex items-center gap-3 mb-6">
        <Link href="/admin/orders" className="text-green-700 hover:underline text-sm">← Orders</Link>
        <span className="text-gray-300">/</span>
        <span className="font-mono text-sm text-gray-600">#{order.id.slice(0, 8).toUpperCase()}</span>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {/* Order Details */}
        <div className="bg-white rounded-xl border border-gray-200 p-5">
          <h2 className="font-semibold text-gray-800 mb-4">Order Details</h2>
          <DetailRow label="Order ID" value={<span className="font-mono text-xs">{order.id}</span>} />
          <DetailRow label="Service" value={order.service} />
          <DetailRow label="Type" value={order.orderType} />
          <DetailRow label="Amount (GHS)" value={`GHS ${order.amountGhs.toFixed(2)}`} />
          <DetailRow label="Crypto" value={`${order.cryptoAmount} ${order.cryptoAsset}`} />
          <DetailRow label="Rate" value={`1 USD = ${order.cryptoRateGhs} GHS`} />
          {order.recipient && (
            <DetailRow
              label="Recipient"
              value={
                <span>
                  <span className="font-mono">{order.recipient}</span>
                  {order.recipientName && <span className="text-gray-500 ml-1">({order.recipientName})</span>}
                </span>
              }
            />
          )}
          {order.bankName && <DetailRow label="Bank" value={order.bankName} />}
          {order.userWalletAddress && (
            <DetailRow label="Wallet Address" value={<span className="font-mono text-xs break-all">{order.userWalletAddress}</span>} />
          )}
          {order.paymentMethod && (
            <DetailRow label="Payment Method" value={order.paymentMethod === 'bank' ? '🏦 Bank Transfer' : '📱 Mobile Money'} />
          )}
          {order.paymentMethod === 'bank' && order.paymentBankAcct && (
            <DetailRow
              label="Payment To"
              value={
                <span>
                  <span className="text-gray-600">{order.paymentBankName} — </span>
                  <span className="font-mono">{order.paymentBankAcct}</span>
                  {order.paymentAcctName && <span className="text-gray-500 ml-1">({order.paymentAcctName})</span>}
                </span>
              }
            />
          )}
          {order.paymentMethod === 'momo' && order.paymentMomoNumber && (
            <DetailRow
              label="Payment To"
              value={
                <span>
                  <span className="text-gray-600">{order.paymentMomoProvider} — </span>
                  <span className="font-mono">{order.paymentMomoNumber}</span>
                  {order.paymentAcctName && <span className="text-gray-500 ml-1">({order.paymentAcctName})</span>}
                </span>
              }
            />
          )}
          <DetailRow label="Created" value={new Date(order.createdAt).toLocaleString()} />
        </div>

        {/* Customer & Status */}
        <div className="space-y-4">
          <div className="bg-white rounded-xl border border-gray-200 p-5">
            <h2 className="font-semibold text-gray-800 mb-4">Customer</h2>
            <DetailRow label="Name" value={order.user.name} />
            <DetailRow label="Email" value={order.user.email} />
            <DetailRow label="Phone" value={order.user.phone} />
          </div>

          <div className="bg-white rounded-xl border border-gray-200 p-5">
            <h2 className="font-semibold text-gray-800 mb-3">Status</h2>
            <div className="flex items-center gap-3 mb-3">
              <span className={`px-3 py-1 rounded-full text-sm font-medium capitalize ${STATUS_COLORS[order.status]}`}>
                {order.status}
              </span>
            </div>
            <label className="block text-sm text-gray-600 mb-1">Change status:</label>
            <select
              value={order.status}
              onChange={(e) => handleStatusChange(e.target.value as OrderStatus)}
              disabled={updatingStatus}
              className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm bg-white focus:outline-none focus:ring-2 focus:ring-green-500 disabled:opacity-60"
            >
              <option value="pending">Pending</option>
              <option value="processing">Processing</option>
              <option value="successful">Successful</option>
              <option value="failed">Failed</option>
              <option value="cancelled">Cancelled</option>
            </select>
            {updatingStatus && <p className="text-xs text-gray-400 mt-1">Updating…</p>}
          </div>

          <div className="bg-white rounded-xl border border-gray-200 p-5">
            <h2 className="font-semibold text-gray-800 mb-3">Admin Note</h2>
            <textarea
              value={noteValue}
              onChange={(e) => setNoteValue(e.target.value)}
              rows={3}
              placeholder="Add a note visible to admin…"
              className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-green-500 mb-2"
            />
            <button
              onClick={handleSaveNote}
              disabled={savingNote}
              className="bg-green-600 hover:bg-green-700 disabled:bg-green-300 text-white text-sm font-semibold px-4 py-2 rounded-lg transition-colors"
            >
              {savingNote ? 'Saving…' : 'Save Note'}
            </button>
          </div>
        </div>
      </div>

      {/* Order Chat */}
      <div className="mt-6">
        <OrderChat orderId={order.id} orderStatus={order.status} isAdmin={true} />
      </div>
    </div>
  );
}
