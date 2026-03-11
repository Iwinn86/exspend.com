import { NextRequest, NextResponse } from 'next/server';
import { getTokenFromRequest, verifyToken } from '@/app/api/lib/jwt';
import { prisma } from '@/app/api/lib/prisma';
import { sendEmail } from '@/app/api/lib/email';
import { orderConfirmationEmail, adminNewOrderEmail } from '@/app/api/lib/email-templates';
import { DEFAULT_WALLET_ADDRESSES } from '@/app/lib/crypto';
import { OrderType, ServiceType } from '@prisma/client';

function requireAuth(request: NextRequest) {
  const token = getTokenFromRequest(request);
  if (!token) return null;
  return verifyToken(token);
}

// GET /api/orders — get all orders for authenticated user
export async function GET(request: NextRequest) {
  const user = requireAuth(request);
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  try {
    const orders = await prisma.order.findMany({
      where: { userId: user.userId },
      orderBy: { createdAt: 'desc' },
      include: { receipt: true },
    });
    return NextResponse.json({ orders });
  } catch {
    return NextResponse.json({ error: 'Failed to fetch orders' }, { status: 500 });
  }
}

// POST /api/orders — create a new order
// POST /api/orders — create a new order
export async function POST(request: NextRequest) {
  const user = requireAuth(request);
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  try {
    const body = await request.json();

    const service = body.service;
    const serviceType = body.serviceType;
    const recipient = body.recipient ?? null;
    const recipientName = body.recipientName ?? null;
    const bankName = body.bankName ?? null;
    const amountGhs = body.amountGhs ?? body.amount ?? 0;
    const cryptoAsset = body.cryptoAsset ?? body.crypto ?? '';
    const cryptoAmount = body.cryptoAmount;
    const cryptoRateGhs = body.cryptoRateGhs ?? 15.5;
    const cryptoRateUsd = body.cryptoRateUsd ?? null;
    const reference = body.reference ?? null;
    const bundleLabel = body.bundleLabel ?? null;
    const orderType = body.orderType ?? 'spend';
    const userWalletAddress = body.userWalletAddress ?? null;
    const sellPayoutPhone = body.sellPayoutPhone ?? null;
    const sellPayoutBank = body.sellPayoutBank ?? null;

    if (!service || !serviceType || !cryptoAsset || !cryptoAmount) {
      return NextResponse.json({ error: 'Missing required fields' }, { status: 400 });
    }

    const newOrder = await prisma.order.create({
      data: {
        userId: user.userId,
        orderType: orderType as OrderType,
        serviceType: serviceType as ServiceType,
        service,
        recipient,
        recipientName,
        bankName,
        reference,
        bundleLabel,
        amountGhs: Number(amountGhs),
        cryptoAsset,
        cryptoAmount,
        cryptoRateGhs: Number(cryptoRateGhs),
        cryptoRateUsd: cryptoRateUsd ? Number(cryptoRateUsd) : null,
        userWalletAddress,
        sellPayoutPhone,
        sellPayoutBank,
      },
    });

    // Fire-and-forget emails
    Promise.resolve().then(async () => {
      const orderUser = await prisma.user.findUnique({ where: { id: user.userId } });
      if (!orderUser) return;

      const settings = await prisma.walletSettings.findUnique({ where: { id: 'singleton' } });
      const walletAddress = settings
        ? (settings as Record<string, unknown>)[cryptoAsset] as string || ''
        : DEFAULT_WALLET_ADDRESSES[cryptoAsset] || '';

      await sendEmail({
        to: orderUser.email,
        subject: `Order Confirmed — #${newOrder.id.slice(0, 8).toUpperCase()}`,
        html: orderConfirmationEmail({
          userName: orderUser.name,
          orderId: newOrder.id,
          service: newOrder.service,
          amount: newOrder.amountGhs,
          cryptoAmount: newOrder.cryptoAmount,
          crypto: newOrder.cryptoAsset,
          walletAddress,
          recipient: newOrder.recipient ?? '',
          recipientName: newOrder.recipientName ?? '',
          reference: newOrder.reference ?? undefined,
        }),
      });

      await sendEmail({
        to: 'admin@exspend.com',
        subject: `New Order — #${newOrder.id.slice(0, 8).toUpperCase()}`,
        html: adminNewOrderEmail({
          orderId: newOrder.id,
          service: newOrder.service,
          amount: newOrder.amountGhs,
          cryptoAmount: newOrder.cryptoAmount,
          crypto: newOrder.cryptoAsset,
          recipient: newOrder.recipient ?? '',
          recipientName: newOrder.recipientName ?? '',
          userName: orderUser.name,
          userEmail: orderUser.email,
        }),
      });
    }).catch(console.error);

    // In-app notification for order creation
    Promise.resolve().then(async () => {
      await prisma.notification.create({
        data: {
          userId: newOrder.userId,
          title: '📋 Order Placed',
          message: `Your order #${newOrder.id.slice(0, 8).toUpperCase()} for ${newOrder.service} (GHS ${newOrder.amountGhs.toFixed(2)}) has been received. Please send the crypto payment.`,
          link: `/orders/${newOrder.id}`,
        },
      });
    }).catch(console.error);

    return NextResponse.json({ order: newOrder }, { status: 201 });
  } catch (err) {
    console.error('ORDER CREATE ERROR:', err);
    return NextResponse.json({ error: 'Failed to create order' }, { status: 500 });
  }
}
