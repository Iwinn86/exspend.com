'use client';

import { useEffect, useState } from 'react';
import { useParams, useRouter } from 'next/navigation';
import Link from 'next/link';
import { getToken } from '@/app/lib/auth';

type OrderType = 'spend' | 'buy' | 'sell';
type OrderStatus = 'pending' | 'processing' | 'successful' | 'failed' | 'cancelled';

type ApiOrder = {
  id: string;
  orderType: OrderType;
  service: string;
  amountGhs: number;
  cryptoAmount: number | null;
  cryptoAsset: string | null;
  status: OrderStatus;
  createdAt: string;
  updatedAt?: string;
  recipient?: string | null;
  recipientName?: string | null;
};

const STATUS_BADGE: Record<OrderStatus, string> = {
  pending: 'bg-yellow-100 text-yellow-800',
  processing: 'bg-blue-100 text-blue-800',
  successful: 'bg-green-100 text-green-800',
  failed: 'bg-red-100 text-red-800',
  cancelled: 'bg-gray-100 text-gray-600',
};

const ORDER_TYPE_BADGE: Record<OrderType, string> = {
  spend: 'bg-purple-100 text-purple-800',
  buy: 'bg-lime-100 text-lime-800',
  sell: 'bg-orange-100 text-orange-800',
};

const ORDER_TYPE_ICON: Record<OrderType, string> = {
  spend: '💳',
  buy: '📈',
  sell: '📉',
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

function DetailRow({ label, value }: { label: string; value: React.ReactNode }) {
  return (
    <div className="flex justify-between items-start gap-2 py-2 border-b border-gray-100 last:border-0">
      <span className="text-sm font-medium text-gray-500 shrink-0">{label}</span>
      <span className="text-sm text-gray-800 text-right">{value}</span>
    </div>
  );
}

export default function OrderDetailPage() {
  const params = useParams();
  const router = useRouter();
  const orderId = params?.id as string;

  const [order, setOrder] = useState<ApiOrder | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [walletAddress, setWalletAddress] = useState('');
  const [copied, setCopied] = useState(false);
  const [sending, setSending] = useState(false);

  const token = getToken();

  useEffect(() => {
    if (!token) {
      setError('Please log in to view this order.');
      setLoading(false);
      return;
    }
    fetch(`/api/orders/${orderId}`, {
      headers: { Authorization: `Bearer ${token}` },
    })
      .then((res) => {
        if (!res.ok) throw new Error('Order not found');
        return res.json();
      })
      .then((data) => setOrder(data.order ?? data))
      .catch(() => setError('Order not found or could not be loaded.'))
      .finally(() => setLoading(false));
  }, [orderId, token]);

  useEffect(() => {
    if (!order || order.status !== 'pending') return;
    fetch('/api/settings')
      .then((res) => res.json())
      .then((data) => {
        const addresses: Record<string, string> = data?.settings?.walletAddresses ?? {};
        const asset = order.cryptoAsset ?? '';
        setWalletAddress(addresses[asset] ?? '');
      })
      .catch(() => {});
  }, [order]);

  function handleCopy() {
    if (!walletAddress) return;
    navigator.clipboard.writeText(walletAddress).then(() => {
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    });
  }

  async function handleSentPayment() {
    if (!order || !token) return;
    setSending(true);
    try {
      await fetch(`/api/orders/${order.id}`, {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({ status: 'processing' }),
      });
      router.push('/orders');
    } catch {
      setSending(false);
    }
  }

  if (loading) {
    return (
      <div className="min-h-screen bg-gradient-to-b from-green-400 to-white flex items-center justify-center">
        <p className="text-white font-medium">Loading order…</p>
      </div>
    );
  }

  if (error || !order) {
    return (
      <div className="min-h-screen bg-gradient-to-b from-green-400 to-white flex items-center justify-center px-4">
        <div className="bg-white rounded-2xl shadow-lg max-w-lg w-full p-6 text-center">
          <span className="text-4xl block mb-3">❌</span>
          <p className="text-gray-600 mb-4">{error || 'Order not found.'}</p>
          <Link href="/orders" className="text-green-700 font-medium hover:underline">
            ← View All Orders
          </Link>
        </div>
      </div>
    );
  }

  const receiptNumber = `EXP-${order.id.slice(0, 8).toUpperCase()}`;

  return (
    <div className="min-h-screen bg-gradient-to-b from-green-400 to-white py-8 px-4">
      <div className="bg-white rounded-2xl shadow-lg max-w-lg mx-auto p-6">

        {/* Header */}
        <div className="flex items-center gap-3 mb-5">
          <span className="text-4xl">{ORDER_TYPE_ICON[order.orderType]}</span>
          <div>
            <h1 className="text-xl font-bold text-gray-800">{order.service}</h1>
            <p className="text-xs text-gray-400 font-mono">#{order.id}</p>
          </div>
          <div className="ml-auto flex flex-col items-end gap-1">
            <span className={`text-xs font-semibold px-2 py-0.5 rounded-full uppercase ${ORDER_TYPE_BADGE[order.orderType]}`}>
              {order.orderType}
            </span>
            <span className={`text-xs font-semibold px-2 py-0.5 rounded-full uppercase ${STATUS_BADGE[order.status]}`}>
              {order.status}
            </span>
          </div>
        </div>

        {/* Core details */}
        <div className="bg-gray-50 rounded-xl p-4 mb-5">
          <DetailRow label="Amount (GHS)" value={`GHS ${typeof order.amountGhs === 'number' ? order.amountGhs.toFixed(2) : order.amountGhs}`} />
          {order.cryptoAsset && order.cryptoAmount != null && (
            <DetailRow label="Crypto" value={`${order.cryptoAmount} ${order.cryptoAsset}`} />
          )}
          {order.recipient && (
            <DetailRow label="Recipient" value={order.recipient} />
          )}
          {order.recipientName && (
            <DetailRow label="Name" value={order.recipientName} />
          )}
          <DetailRow label="Created" value={formatDate(order.createdAt)} />
        </div>

        {/* ── PENDING: SPEND ── show wallet + "I've sent" button */}
        {order.status === 'pending' && order.orderType === 'spend' && (
          <div className="mb-5">
            <div className="bg-green-50 border border-green-300 rounded-xl p-4 mb-3">
              <p className="text-sm font-semibold text-gray-700 mb-1">Send exactly:</p>
              <p className="text-2xl font-bold font-mono text-gray-900 mb-3">
                {order.cryptoAmount} {order.cryptoAsset}
              </p>
              {walletAddress ? (
                <>
                  <p className="text-xs text-gray-500 mb-1">To this wallet address:</p>
                  <p className="font-mono text-sm break-all text-gray-800 mb-2">{walletAddress}</p>
                  <button
                    onClick={handleCopy}
                    className="w-full bg-green-600 hover:bg-green-700 text-white text-sm font-semibold py-2 rounded-lg transition-colors"
                  >
                    {copied ? '✅ Copied!' : 'Copy Address'}
                  </button>
                </>
              ) : (
                <p className="text-xs text-gray-400">Wallet address loading…</p>
              )}
              <div className="bg-yellow-50 border border-yellow-300 rounded-lg px-3 py-2 mt-3 text-xs text-yellow-800">
                ⚠️ Send on the correct network. Wrong network = permanent loss of funds.
              </div>
            </div>
            <p className="text-xs text-gray-400 text-center mb-3">
              ⏱ Please complete payment within 30 minutes of order creation.
            </p>
            <button
              onClick={handleSentPayment}
              disabled={sending}
              className="w-full bg-green-700 hover:bg-green-800 disabled:bg-green-400 text-white font-semibold py-3 rounded-xl transition-colors text-sm"
            >
              {sending ? 'Processing…' : "I've Sent the Payment →"}
            </button>
          </div>
        )}

        {/* ── PENDING: SELL ── show wallet address for user to send to */}
        {order.status === 'pending' && order.orderType === 'sell' && (
          <div className="mb-5">
            <div className="bg-green-50 border border-green-300 rounded-xl p-4">
              <p className="text-sm font-semibold text-gray-700 mb-1">Send exactly:</p>
              <p className="text-2xl font-bold font-mono text-gray-900 mb-3">
                {order.cryptoAmount} {order.cryptoAsset}
              </p>
              {walletAddress ? (
                <>
                  <p className="text-xs text-gray-500 mb-1">To this wallet address:</p>
                  <p className="font-mono text-sm break-all text-gray-800 mb-2">{walletAddress}</p>
                  <button
                    onClick={handleCopy}
                    className="w-full bg-green-600 hover:bg-green-700 text-white text-sm font-semibold py-2 rounded-lg transition-colors"
                  >
                    {copied ? '✅ Copied!' : 'Copy Address'}
                  </button>
                </>
              ) : (
                <p className="text-xs text-gray-400">Wallet address loading…</p>
              )}
              <div className="bg-yellow-50 border border-yellow-300 rounded-lg px-3 py-2 mt-3 text-xs text-yellow-800">
                ⚠️ Send on the correct network. Wrong network = permanent loss of funds.
              </div>
            </div>
            <p className="text-xs text-gray-400 text-center mt-3">
              ⏱ Please complete payment within 30 minutes of order creation.
            </p>
          </div>
        )}

        {/* ── PENDING: BUY ── show payment instruction */}
        {order.status === 'pending' && order.orderType === 'buy' && (
          <div className="bg-blue-50 border border-blue-200 rounded-xl p-4 mb-5 text-center">
            <span className="text-3xl block mb-2">⏳</span>
            <p className="text-blue-800 font-semibold text-sm">
              Your order is pending. Pay GHS{' '}
              {typeof order.amountGhs === 'number' ? order.amountGhs.toFixed(2) : order.amountGhs}{' '}
              to complete this order.
            </p>
          </div>
        )}

        {/* ── SUCCESSFUL ── receipt */}
        {order.status === 'successful' && (
          <div className="mb-5">
            <div className="bg-green-50 border border-green-300 rounded-xl p-4 mb-4">
              <div className="flex items-center gap-2 mb-3">
                <span className="text-2xl">✅</span>
                <div>
                  <p className="font-bold text-green-800">Transaction Successful</p>
                  <p className="text-xs text-gray-500 font-mono">{receiptNumber}</p>
                </div>
              </div>
              <DetailRow label="Receipt #" value={<span className="font-mono">{receiptNumber}</span>} />
              <DetailRow label="Service" value={order.service} />
              <DetailRow
                label="Amount"
                value={`GHS ${typeof order.amountGhs === 'number' ? order.amountGhs.toFixed(2) : order.amountGhs}`}
              />
              {order.cryptoAsset && order.cryptoAmount != null && (
                <DetailRow label="Crypto paid" value={`${order.cryptoAmount} ${order.cryptoAsset}`} />
              )}
              {order.recipient && <DetailRow label="Recipient" value={order.recipient} />}
              {order.recipientName && <DetailRow label="Name" value={order.recipientName} />}
              {order.updatedAt && <DetailRow label="Completed" value={formatDate(order.updatedAt)} />}
            </div>
            <button
              onClick={() => window.print()}
              className="w-full border border-green-600 text-green-700 hover:bg-green-50 font-semibold py-2.5 rounded-xl transition-colors text-sm"
            >
              🖨 Download Receipt
            </button>
          </div>
        )}

        {/* ── FAILED / CANCELLED ── error state */}
        {(order.status === 'failed' || order.status === 'cancelled') && (
          <div className="bg-red-50 border border-red-200 rounded-xl p-4 mb-5 text-center">
            <span className="text-3xl block mb-2">❌</span>
            <p className="font-semibold text-red-800 text-sm mb-1">
              {order.status === 'cancelled' ? 'Order Cancelled' : 'Transaction Failed'}
            </p>
            <p className="text-xs text-gray-500">
              If you believe this is an error, please{' '}
              <Link href="/help" className="text-green-700 underline">
                contact support
              </Link>
              .
            </p>
          </div>
        )}

        {/* ── PROCESSING ── */}
        {order.status === 'processing' && (
          <div className="bg-blue-50 border border-blue-200 rounded-xl p-4 mb-5 text-center">
            <span className="text-3xl block mb-2">🔄</span>
            <p className="text-blue-800 font-semibold text-sm">
              Your payment is being processed. This usually takes up to 30 minutes.
            </p>
          </div>
        )}

        <Link
          href="/orders"
          className="block w-full text-center border border-green-600 text-green-700 hover:bg-green-50 font-semibold py-2.5 rounded-xl transition-colors text-sm"
        >
          ← View All Orders
        </Link>
      </div>
    </div>
  );
}
