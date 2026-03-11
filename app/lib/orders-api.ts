// app/lib/orders-api.ts
import { getToken } from './auth';

export type ApiOrder = {
  id: string;
  userId: string;
  orderType: 'spend' | 'buy' | 'sell';
  service: string;
  serviceType: 'bank' | 'momo' | 'airtime' | 'data' | 'buy_crypto' | 'sell_crypto';
  recipient?: string | null;
  recipientName?: string | null;
  bankName?: string | null;
  reference?: string | null;
  bundleLabel?: string | null;
  amountGhs: number;
  cryptoAsset: string;
  cryptoAmount: string;
  cryptoRateGhs: number;
  cryptoRateUsd?: number | null;
  userWalletAddress?: string | null;
  sellPayoutPhone?: string | null;
  sellPayoutBank?: string | null;
  status: 'pending' | 'processing' | 'successful' | 'failed' | 'cancelled';
  adminNote?: string | null;
  createdAt: string;
  updatedAt: string;
  completedAt?: string | null;
  // legacy aliases kept for backwards compat
  amount?: number;
  crypto?: string;
};

export type CreateOrderInput = {
  orderType?: 'spend' | 'buy' | 'sell';
  serviceType: 'bank' | 'momo' | 'airtime' | 'data' | 'buy_crypto' | 'sell_crypto';
  service: string;
  recipient?: string;
  recipientName?: string;
  bankName?: string;
  reference?: string;
  bundleLabel?: string;
  amountGhs?: number;
  /** @deprecated use amountGhs */
  amount?: number;
  cryptoAsset?: string;
  /** @deprecated use cryptoAsset */
  crypto?: string;
  cryptoAmount: string;
  cryptoRateGhs?: number;
  cryptoRateUsd?: number;
  userWalletAddress?: string;
  sellPayoutPhone?: string;
  sellPayoutBank?: string;
};

export async function fetchOrders(): Promise<ApiOrder[] | null> {
  const token = getToken();
  if (!token) return null;

  try {
    const res = await fetch('/api/orders', {
      headers: { Authorization: `Bearer ${token}` },
    });
    if (!res.ok) return null;
    const data = await res.json();
    return data.orders || [];
  } catch {
    return null;
  }
}

export async function createOrder(orderData: CreateOrderInput): Promise<ApiOrder | null> {
  const token = getToken();
  if (!token) return null;

  // Normalise legacy fields
  const body = {
    ...orderData,
    amountGhs: orderData.amountGhs ?? orderData.amount ?? 0,
    cryptoAsset: orderData.cryptoAsset ?? orderData.crypto ?? '',
    orderType: orderData.orderType ?? 'spend',
  };

  try {
    const res = await fetch('/api/orders', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${token}`,
      },
      body: JSON.stringify(body),
    });
    if (!res.ok) return null;
    const data = await res.json();
    return data.order || null;
  } catch {
    return null;
  }
}
