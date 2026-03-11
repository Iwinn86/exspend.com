import { NextRequest, NextResponse } from 'next/server';
import { getTokenFromRequest, verifyToken } from '@/app/api/lib/jwt';
import { prisma } from '@/app/api/lib/prisma';
import { sendEmail } from '@/app/api/lib/email';
import { orderStatusUpdateEmail } from '@/app/api/lib/email-templates';

export async function GET(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const token = getTokenFromRequest(request);
  const user = token ? verifyToken(token) : null;
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const { id } = await params;

  try {
    const order = await prisma.order.findFirst({
      where: user.isAdmin ? { id } : { id, userId: user.userId },
      include: { receipt: true },
    });

    if (!order) return NextResponse.json({ error: 'Order not found' }, { status: 404 });

    return NextResponse.json({ order });
  } catch {
    return NextResponse.json({ error: 'Failed to fetch order' }, { status: 500 });
  }
}

export async function PATCH(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const token = getTokenFromRequest(request);
  const user = token ? verifyToken(token) : null;
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  try {
    const { status } = await request.json();

    if (!['pending', 'processing', 'successful', 'failed', 'cancelled'].includes(status)) {
      return NextResponse.json({ error: 'Invalid status' }, { status: 400 });
    }

    const { id } = await params;
    const existing = await prisma.order.findFirst({
      where: user.isAdmin ? { id } : { id, userId: user.userId },
    });

    if (!existing) return NextResponse.json({ error: 'Order not found' }, { status: 404 });

    const updated = await prisma.order.update({
      where: { id },
      data: {
        status,
        updatedAt: new Date(),
        ...(status === 'successful' ? { completedAt: new Date() } : {}),
      },
    });

    // Fire-and-forget status update email
    if (['processing', 'successful', 'failed'].includes(status)) {
      Promise.resolve().then(async () => {
        const orderUser = await prisma.user.findUnique({ where: { id: existing.userId } });
        if (!orderUser) return;
        await sendEmail({
          to: orderUser.email,
          subject: `Order ${status.charAt(0).toUpperCase() + status.slice(1)} — #${updated.id.slice(0, 8).toUpperCase()}`,
          html: orderStatusUpdateEmail({
            userName: orderUser.name,
            orderId: updated.id,
            service: updated.service,
            amount: updated.amountGhs,
            status: status as 'processing' | 'successful' | 'failed',
          }),
        });
      }).catch(console.error);
    }

    return NextResponse.json({ order: updated });
  } catch {
    return NextResponse.json({ error: 'Failed to update order' }, { status: 500 });
  }
}
