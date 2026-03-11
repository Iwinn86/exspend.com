import { NextRequest, NextResponse } from 'next/server';
import { getTokenFromRequest, verifyToken } from '@/app/api/lib/jwt';
import { prisma } from '@/app/api/lib/prisma';

function requireAuth(request: NextRequest) {
  const token = getTokenFromRequest(request);
  if (!token) return null;
  return verifyToken(token);
}

// GET /api/user/daily-quota — get the user's current daily spending and quota remaining
export async function GET(request: NextRequest) {
  const user = requireAuth(request);
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  try {
    const DAILY_LIMIT = 30000;
    const today = new Date();
    today.setHours(0, 0, 0, 0);

    // Calculate total spent today from spend orders (not cancelled)
    const result = await prisma.order.aggregate({
      where: {
        userId: user.userId,
        orderType: 'spend',
        status: { notIn: ['cancelled', 'failed'] },
        createdAt: { gte: today },
      },
      _sum: { amountGhs: true },
    });

    const totalSpent = result._sum.amountGhs ?? 0;
    const remaining = Math.max(0, DAILY_LIMIT - totalSpent);

    return NextResponse.json({
      totalSpent,
      dailyLimit: DAILY_LIMIT,
      remaining,
      date: today.toISOString().split('T')[0],
    });
  } catch (err) {
    console.error('DAILY QUOTA ERROR:', err);
    return NextResponse.json({ error: 'Failed to fetch daily quota' }, { status: 500 });
  }
}
