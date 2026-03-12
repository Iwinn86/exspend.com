// POST /api/orders/[id]/cancel — cancel an order that is still waiting or pending
import { NextRequest, NextResponse } from 'next/server';
import { getTokenFromRequest, verifyToken } from '@/app/api/lib/jwt';
import { prisma } from '@/app/api/lib/prisma';

function requireAuth(request: NextRequest) {
  const token = getTokenFromRequest(request);
  if (!token) return null;
  return verifyToken(token);
}

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const user = requireAuth(request);
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const { id } = await params;

  try {
    const order = await prisma.order.findFirst({
      where: { id, userId: user.userId },
    });

    if (!order) {
      return NextResponse.json({ error: 'Order not found' }, { status: 404 });
    }

    if (order.status !== 'waiting' && order.status !== 'pending') {
      return NextResponse.json(
        { error: 'Only waiting or pending orders can be cancelled' },
        { status: 400 }
      );
    }

    const updated = await prisma.order.update({
      where: { id },
      data: { status: 'cancelled' },
    });

    return NextResponse.json({ success: true, order: updated });
  } catch (err) {
    console.error('CANCEL ORDER ERROR:', err);
    return NextResponse.json({ error: 'Failed to cancel order' }, { status: 500 });
  }
}
