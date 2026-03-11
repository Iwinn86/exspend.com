// app/lib/orders.ts

export type OrderStatus = 'pending' | 'processing' | 'successful' | 'failed';

export type Order = {
  id: string;
  service: string;
  serviceType: 'bank' | 'momo' | 'airtime' | 'data';
  recipient: string;
  recipientName: string;
  amount: number;
  crypto: string;
  cryptoAmount: string;
  cryptoValue?: string;
  reference?: string;
  bundleLabel?: string;
  status: OrderStatus;
  createdAt: string;
};

const ORDERS_KEY = 'exspend_orders';

export function getOrders(): Order[] {
  if (typeof window === 'undefined') return [];
  try {
    const raw = localStorage.getItem(ORDERS_KEY);
    return raw ? JSON.parse(raw) : [];
  } catch {
    return [];
  }
}

export function saveOrder(order: Order): void {
  if (typeof window === 'undefined') return;
  const orders = getOrders();
  orders.unshift(order);
  localStorage.setItem(ORDERS_KEY, JSON.stringify(orders));
}

export function clearOrders(): void {
  if (typeof window === 'undefined') return;
  localStorage.removeItem(ORDERS_KEY);
}

export function updateOrderStatus(id: string, status: OrderStatus): void {
  if (typeof window === 'undefined') return;
  const orders = getOrders();
  const idx = orders.findIndex(o => o.id === id);
  if (idx !== -1) {
    orders[idx].status = status;
    localStorage.setItem(ORDERS_KEY, JSON.stringify(orders));
  }
}
