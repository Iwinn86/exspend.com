// POST /api/orders/[id]/confirm-sent — user confirms they have sent crypto
// Changes order status from 'waiting' to 'pending'
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
    const order = await prisma.order.findUnique({ where: { id } });
    if (!order) return NextResponse.json({ error: 'Order not found' }, { status: 404 });
    if (order.userId !== user.userId) return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    if (order.status !== 'waiting') {
      return NextResponse.json({ error: 'Order is not in waiting state' }, { status: 400 });
    }

    const updated = await prisma.order.update({
      where: { id },
      data: { status: 'pending' },
    });

    // Notify admins
    Promise.resolve().then(async () => {
      const admins = await prisma.user.findMany({ where: { isAdmin: true }, select: { id: true } });
      const orderUser = await prisma.user.findUnique({ where: { id: user.userId }, select: { name: true } });
      if (admins.length > 0 && orderUser) {
        await prisma.notification.createMany({
          data: admins.map(admin => ({
            userId: admin.id,
            recipientType: 'admin',
            title: '💸 Crypto Sent Confirmed',
            message: `${orderUser.name} confirmed sending crypto for order #${id.slice(0, 8).toUpperCase()}`,
            link: `/admin/orders/${id}`,
            relatedOrderId: id,
          })),
        });
      }
    }).catch(console.error);

    return NextResponse.json({ order: updated });
  } catch (err) {
    console.error('CONFIRM SENT ERROR:', err);
    return NextResponse.json({ error: 'Failed to confirm' }, { status: 500 });
  }
}
