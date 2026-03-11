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
    // Payment method fields (for buy orders)
    const paymentMethod = body.paymentMethod ?? null;
    const paymentBankName = body.paymentBankName ?? null;
    const paymentBankAcct = body.paymentBankAcct ?? null;
    const paymentAcctName = body.paymentAcctName ?? null;
    const paymentMomoProvider = body.paymentMomoProvider ?? null;
    const paymentMomoNumber = body.paymentMomoNumber ?? null;

    if (!service || !serviceType || !cryptoAsset || !cryptoAmount) {
      return NextResponse.json({ error: 'Missing required fields' }, { status: 400 });
    }

    // Check daily quota for spend orders
    const ghsAmount = Number(amountGhs);
    if (orderType === 'spend') {
      const DAILY_LIMIT = 30000;
      const today = new Date();
      today.setHours(0, 0, 0, 0);
      const quotaResult = await prisma.order.aggregate({
        where: {
          userId: user.userId,
          orderType: 'spend',
          status: { notIn: ['cancelled', 'failed'] },
          createdAt: { gte: today },
        },
        _sum: { amountGhs: true },
      });
      const totalSpentToday = quotaResult._sum.amountGhs ?? 0;
      if (totalSpentToday + ghsAmount > DAILY_LIMIT) {
        const remaining = Math.max(0, DAILY_LIMIT - totalSpentToday);
        return NextResponse.json({
          error: `Daily spending limit reached. You have GHS ${remaining.toFixed(2)} remaining today.`,
        }, { status: 400 });
      }
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
        amountGhs: ghsAmount,
        cryptoAsset,
        cryptoAmount,
        cryptoRateGhs: Number(cryptoRateGhs),
        cryptoRateUsd: cryptoRateUsd ? Number(cryptoRateUsd) : null,
        userWalletAddress,
        sellPayoutPhone,
        sellPayoutBank,
        paymentMethod,
        paymentBankName,
        paymentBankAcct,
        paymentAcctName,
        paymentMomoProvider,
        paymentMomoNumber,
        quotaUsed: orderType === 'spend' ? ghsAmount : null,
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

    // In-app notification for order creation (user)
    Promise.resolve().then(async () => {
      await prisma.notification.create({
        data: {
          userId: newOrder.userId,
          recipientType: 'user',
          title: '📋 Order Placed',
          message: `Your order #${newOrder.id.slice(0, 8).toUpperCase()} for ${newOrder.service} (GHS ${newOrder.amountGhs.toFixed(2)}) has been received. Please send the crypto payment.`,
          link: `/orders/${newOrder.id}`,
          relatedOrderId: newOrder.id,
        },
      });

      // Notify all admins about the new order
      const admins = await prisma.user.findMany({
        where: { isAdmin: true },
        select: { id: true },
      });
      const orderUser = await prisma.user.findUnique({
        where: { id: user.userId },
        select: { name: true, email: true },
      });
      if (admins.length > 0 && orderUser) {
        await prisma.notification.createMany({
          data: admins.map(admin => ({
            userId: admin.id,
            recipientType: 'admin',
            title: '🆕 New Order',
            message: `${orderUser.name} placed order #${newOrder.id.slice(0, 8).toUpperCase()} for ${newOrder.service} — GHS ${newOrder.amountGhs.toFixed(2)}`,
            link: `/admin/orders/${newOrder.id}`,
            relatedOrderId: newOrder.id,
          })),
        });
      }
    }).catch(console.error);

    return NextResponse.json({ order: newOrder }, { status: 201 });
  } catch (err) {
    console.error('ORDER CREATE ERROR:', err);
    return NextResponse.json({ error: 'Failed to create order' }, { status: 500 });
  }
}
