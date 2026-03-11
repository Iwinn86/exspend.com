// GET /api/cron/cancel-expired-orders
// Cancels orders that have been in 'waiting' (spend/sell) or 'pending' (buy) status for >30 minutes
// This should be called by a cron job or scheduler
import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/app/api/lib/prisma';

export async function GET(request: NextRequest) {
  // Simple protection: check for a secret header or allow internal calls
  const cronSecret = request.headers.get('x-cron-secret');
  const configuredSecret = process.env.CRON_SECRET;
  if (configuredSecret && cronSecret !== configuredSecret) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  try {
    const thirtyMinutesAgo = new Date(Date.now() - 30 * 60 * 1000);

    // Cancel waiting spend/sell orders older than 30 minutes
    const expiredWaiting = await prisma.order.updateMany({
      where: {
        status: 'waiting',
        orderType: { in: ['spend', 'sell'] },
        createdAt: { lte: thirtyMinutesAgo },
      },
      data: { status: 'cancelled' },
    });

    // Cancel pending buy orders older than 30 minutes
    const expiredPendingBuy = await prisma.order.updateMany({
      where: {
        status: 'pending',
        orderType: 'buy',
        createdAt: { lte: thirtyMinutesAgo },
      },
      data: { status: 'cancelled' },
    });

    const totalCancelled = expiredWaiting.count + expiredPendingBuy.count;

    return NextResponse.json({
      success: true,
      cancelled: totalCancelled,
      details: {
        waitingOrders: expiredWaiting.count,
        pendingBuyOrders: expiredPendingBuy.count,
      },
    });
  } catch (err) {
    console.error('CRON CANCEL EXPIRED ORDERS ERROR:', err);
    return NextResponse.json({ error: 'Failed to cancel expired orders' }, { status: 500 });
  }
}
