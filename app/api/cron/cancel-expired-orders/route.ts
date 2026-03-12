// GET /api/cron/cancel-expired-orders
// Cancels ALL orders that have been in 'waiting' status for >30 minutes
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

    // Cancel ALL waiting orders older than 30 minutes (spend, sell, and buy)
    const expiredWaiting = await prisma.order.updateMany({
      where: {
        status: 'waiting',
        createdAt: { lte: thirtyMinutesAgo },
      },
      data: { status: 'cancelled' },
    });

    return NextResponse.json({
      success: true,
      cancelled: expiredWaiting.count,
      details: {
        waitingOrders: expiredWaiting.count,
      },
    });
  } catch (err) {
    console.error('CRON CANCEL EXPIRED ORDERS ERROR:', err);
    return NextResponse.json({ error: 'Failed to cancel expired orders' }, { status: 500 });
  }
}
